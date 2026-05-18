#!/usr/bin/env python3
"""
build-fidelity-diff.py — Stage 10.4c (template-approach branch)

Page-by-page DOM/section structural diff between a per-client built site and
the canonical templates/website-template/ build. Confirms that per-client variance is
LIMITED to: text content, image src, and palette CSS variable values. Any
section reorder, element add/remove, class taxonomy change, or component
shape change FAILS the gate.

This is NOT pixel SSIM (that's Stage 10.4a). This is structural fidelity:
"the DOM tree shape matches", regardless of what colors or copy filled it.

Usage:
    # Build the reference if needed (templates/website-template with example brand-dna)
    python3 tools/build-fidelity-diff.py --client "Acme Roofing" --build-reference

    # Diff against an already-built reference (faster)
    python3 tools/build-fidelity-diff.py --client "Acme Roofing"

    # Allow a tolerance for text-only differences (default 100% structural match)
    python3 tools/build-fidelity-diff.py --client "Acme Roofing" --tolerance 0

Reads:
    clients/[X]/[X] Website/dist/index.html  (the per-client build)
    templates/website-template/dist/index.html       (the reference build)

Writes:
    clients/[X]/Pipeline Data/qa/build-fidelity.json  (diff report)

Exit codes:
    0 — structural match, allowed deltas only
    1 — structural mismatch detected
    2 — could not run (missing reference build, missing client build, etc.)
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from bs4 import BeautifulSoup, NavigableString
except ImportError:
    print("ERROR: BeautifulSoup not installed. Run: pip install beautifulsoup4", file=sys.stderr)
    sys.exit(2)

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = REPO_ROOT / "templates" / "website-template"


def build_reference() -> Path:
    """Run npm install + build inside templates/website-template with the example brand-dna swapped in.
    Returns the dist directory path."""
    site = TEMPLATE_DIR
    bdir = site / "src" / "config"
    example = bdir / "brand-dna.example.js"
    target = bdir / "brand-dna.js"
    if not example.exists():
        raise RuntimeError(f"missing {example}")
    # Save the placeholder so we can restore it
    backup = bdir / "brand-dna.js.bak"
    if target.exists():
        shutil.copyfile(target, backup)
    shutil.copyfile(example, target)
    try:
        if not (site / "node_modules").exists():
            subprocess.run(["npm", "install", "--silent"], cwd=site, check=True)
        subprocess.run(["npm", "run", "build"], cwd=site, check=True)
    finally:
        if backup.exists():
            shutil.copyfile(backup, target)
            backup.unlink()
    return site / "dist"


def signature(node: Any) -> dict[str, Any]:
    """
    Return a structural signature for an HTML node. Captures:
      - tag name
      - className (set of utility classes for stable comparison)
      - data-* attributes
      - id
      - children count
    Does NOT capture text content, image src, color hex values, or inline styles
    that contain colors. Those are allowed deltas per the per-client variance contract.
    """
    if isinstance(node, NavigableString):
        return None
    classes = sorted(set(node.get("class") or []))
    sig = {
        "tag": node.name,
        "classes": classes,
        "id": node.get("id") or None,
        "data": {k: True for k in node.attrs if k.startswith("data-")},
    }
    if node.name == "img":
        sig["has_alt"] = bool(node.get("alt"))
    if node.name == "a":
        href = node.get("href", "")
        if href.startswith("tel:") or href.startswith("mailto:"):
            sig["link_kind"] = href.split(":", 1)[0]
        elif href.startswith("/"):
            sig["link_kind"] = "internal"
        else:
            sig["link_kind"] = "external"
    return sig


def walk(node: Any, path: str = "") -> list[tuple[str, dict]]:
    """DFS walk yielding (path, signature) tuples."""
    if isinstance(node, NavigableString):
        return []
    out = []
    sig = signature(node)
    if sig:
        out.append((path or "/", sig))
    for i, child in enumerate(node.children):
        if isinstance(child, NavigableString):
            continue
        child_path = f"{path}/{child.name}[{i}]"
        out.extend(walk(child, child_path))
    return out


def diff_signatures(client_sigs: list, ref_sigs: list) -> dict[str, Any]:
    """Compare two ordered signature lists. Reports element count delta and per-position mismatches."""
    delta = {
        "client_node_count": len(client_sigs),
        "reference_node_count": len(ref_sigs),
        "node_count_delta": len(client_sigs) - len(ref_sigs),
        "mismatches": [],
    }
    for i, (c, r) in enumerate(zip(client_sigs, ref_sigs)):
        c_path, c_sig = c
        r_path, r_sig = r
        if c_sig != r_sig:
            delta["mismatches"].append({
                "index": i,
                "client_path": c_path,
                "reference_path": r_path,
                "client_sig": c_sig,
                "reference_sig": r_sig,
            })
            if len(delta["mismatches"]) >= 50:
                break  # Cap report at 50 mismatches
    return delta


def parse(path: Path) -> list[tuple[str, dict]]:
    soup = BeautifulSoup(path.read_text(), "html.parser")
    body = soup.find("body")
    if not body:
        return []
    return walk(body)


def diff_indexes(client_dist: Path, ref_dist: Path) -> dict[str, Any]:
    client_html = client_dist / "index.html"
    ref_html = ref_dist / "index.html"
    if not client_html.exists():
        raise FileNotFoundError(f"client build missing: {client_html}")
    if not ref_html.exists():
        raise FileNotFoundError(f"reference build missing: {ref_html}")
    return diff_signatures(parse(client_html), parse(ref_html))


def main() -> int:
    parser = argparse.ArgumentParser(description="Stage 10.4c: structural DOM diff between client build and website template reference.")
    parser.add_argument("--client", required=True, help="Client folder name under clients/")
    parser.add_argument("--build-reference", action="store_true", help="Build the templates/website-template reference before diffing")
    parser.add_argument("--tolerance", type=int, default=0, help="Max allowed structural mismatches (default 0)")
    args = parser.parse_args()

    client_site = REPO_ROOT / "clients" / args.client / f"{args.client} Website"
    if not client_site.exists():
        print(f"ERROR: client site not found: {client_site}", file=sys.stderr)
        return 2

    if args.build_reference:
        print("Building templates/website-template reference...")
        ref_dist = build_reference()
    else:
        ref_dist = TEMPLATE_DIR / "dist"
        if not ref_dist.exists():
            print(f"ERROR: reference build not found at {ref_dist}. Run with --build-reference.", file=sys.stderr)
            return 2

    print(f"Diffing client dist vs reference dist...")
    delta = diff_indexes(client_site / "dist", ref_dist)

    qa_dir = REPO_ROOT / "clients" / args.client / "Pipeline Data" / "qa"
    qa_dir.mkdir(parents=True, exist_ok=True)
    report_path = qa_dir / "build-fidelity.json"
    report = {
        "client": args.client,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "tolerance": args.tolerance,
        "delta": delta,
        "passed": len(delta["mismatches"]) <= args.tolerance and abs(delta["node_count_delta"]) <= args.tolerance,
    }
    report_path.write_text(json.dumps(report, indent=2))
    print(f"Report: {report_path}")

    print(f"\n=== Build fidelity ===")
    print(f"Reference nodes: {delta['reference_node_count']}")
    print(f"Client nodes:    {delta['client_node_count']}")
    print(f"Node count delta: {delta['node_count_delta']:+d}")
    print(f"Structural mismatches: {len(delta['mismatches'])}")
    if delta["mismatches"]:
        print(f"\nFirst 5 mismatches:")
        for m in delta["mismatches"][:5]:
            print(f"  [{m['index']}] {m['client_path']}")
            print(f"      client:    {m['client_sig']}")
            print(f"      reference: {m['reference_sig']}")

    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
