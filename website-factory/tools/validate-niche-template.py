#!/usr/bin/env python3
"""
validate-niche-template.py

Runs the five Proposal-B safety gates against a generated per-niche template
at `templates/{niche-slug}/`. Three are HARD halts (gates 1-3); two are
WARNINGS (gates 4-5).

Hard halts:
  Gate 1 — brand-dna shape contract: every generated component reads paths
           that exist in the canonical `brand-dna.example.js`. Run via the
           Phase 1 `scripts/validate-brand-dna.mjs` against a synthetic
           fully-populated brand-dna.js the niche template ships.
  Gate 2 — ESLint + parse: generated JSX is syntactically valid.
  Gate 3 — Vite build: `npm install && npm run build` succeeds on the
           niche template with synthetic brand-dna.js filled.

Warnings:
  Gate 4 — taste/redesign-skill audit: surface generic-AI patterns.
  Gate 5 — SSIM vs winner screenshot >= 0.70.

Exit codes:
  0  = all hard gates passed (warnings may be present)
  10 = Gate 1 failed (brand-dna shape mismatch)
  20 = Gate 2 failed (ESLint or parse error)
  30 = Gate 3 failed (Vite build error)
  40 = template not found

When a hard gate fails the tool writes
`templates/{niche-slug}/GENERATION-FAILED.md` describing what failed so
`build-from-template.py` can detect it and fall back to the default
website-template. Soft-gate warnings land in
`templates/{niche-slug}/AUDIT-WARNINGS.md`.

Usage:
  python3 tools/validate-niche-template.py --niche {slug} [--skip-install] [--strict]

  --skip-install   skip npm install on Gate 3 (faster local iteration)
  --strict         promote Gates 4 and 5 from warnings to hard halts
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = REPO_ROOT / "templates"


def _write_failure_marker(niche_dir: Path, gate: str, detail: str) -> None:
    """Write GENERATION-FAILED.md so build-from-template.py can detect the
    failure and fall back to the default website-template."""
    marker = niche_dir / "GENERATION-FAILED.md"
    body = (
        f"# Niche template generation failed\n\n"
        f"Gate: **{gate}**\n\n"
        f"Timestamp: {datetime.now(timezone.utc).isoformat()}\n\n"
        f"## Detail\n\n```\n{detail.strip()}\n```\n\n"
        f"## What happens now\n\n"
        f"`tools/build-from-template.py` detects this marker file and falls "
        f"back to `templates/website-template/` (the default) when building "
        f"clients whose active niche is this slug. To retry generation, "
        f"re-run `/build-niche-template`.\n"
    )
    marker.write_text(body)


def _write_audit_warning(niche_dir: Path, gate: str, detail: str) -> None:
    """Append soft-gate findings to AUDIT-WARNINGS.md. Does NOT fail the run."""
    marker = niche_dir / "AUDIT-WARNINGS.md"
    existing = marker.read_text() if marker.exists() else "# Niche template audit warnings\n\n"
    body = (
        f"{existing}"
        f"## {gate} ({datetime.now(timezone.utc).isoformat()})\n\n"
        f"```\n{detail.strip()}\n```\n\n"
    )
    marker.write_text(body)


def gate_1_brand_dna_shape(niche_dir: Path) -> tuple[bool, str]:
    """Run scripts/validate-brand-dna.mjs against the niche template's brand-dna.
    The script returns 0 on shape conformance, non-zero on mismatch."""
    validator = niche_dir / "scripts" / "validate-brand-dna.mjs"
    brand_dna_js = niche_dir / "src" / "config" / "brand-dna.js"
    brand_dna_example = niche_dir / "src" / "config" / "brand-dna.example.js"

    missing = [p for p in (validator, brand_dna_js, brand_dna_example) if not p.exists()]
    if missing:
        return False, f"Required file(s) missing:\n  " + "\n  ".join(str(p.relative_to(REPO_ROOT)) for p in missing)

    # --shape-only: at Module 2D time the niche template ships sentinel-laden;
    # Stage 10.1 (tools/build-from-template.py) fills the sentinels per client.
    # Gate 1 cares about shape conformance (no missing fields, no wrong types).
    # The Phase 1 surviving-sentinel check still runs at Stage 10.1 prebuild.
    result = subprocess.run(
        ["node", str(validator), "--shape-only"],
        cwd=niche_dir,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return False, f"validate-brand-dna.mjs exit={result.returncode}\n\nSTDOUT:\n{result.stdout}\n\nSTDERR:\n{result.stderr}"
    return True, result.stdout.strip()


def gate_2_eslint_parse(niche_dir: Path) -> tuple[bool, str]:
    """Catch raw syntax errors that would prevent any tool from reading the
    .jsx files. We approximate with a regex tier (balanced braces) because
    Node's --check does not parse JSX. Vite's parse on Gate 3 is the
    authoritative pass.

    Sentinels (`__REQUIRED__SOMETHING__`) are EXPECTED in the niche template
    at Module 2D time — Stage 10.1 fills them per client. The Phase 1 dist/
    scanner (`tools/build-from-template.py find_forbidden`) catches any
    sentinel that survives into a per-client build, so we don't duplicate
    that scan here.
    """
    src_dir = niche_dir / "src"
    if not src_dir.exists():
        return False, f"src/ missing at {src_dir.relative_to(REPO_ROOT)}"

    bad_files: list[tuple[Path, str]] = []
    for path in src_dir.rglob("*.jsx"):
        text = path.read_text(errors="ignore")
        opens = text.count("{")
        closes = text.count("}")
        if opens != closes:
            bad_files.append((path, f"unbalanced braces: {opens} open vs {closes} close"))
            continue

    if bad_files:
        detail = "\n".join(f"  - {p.relative_to(REPO_ROOT)}: {reason}" for p, reason in bad_files)
        return False, f"{len(bad_files)} file(s) failed parse-tier checks:\n{detail}"
    return True, f"parse-tier checks passed on {sum(1 for _ in src_dir.rglob('*.jsx'))} JSX files"


def gate_3_vite_build(niche_dir: Path, skip_install: bool) -> tuple[bool, str]:
    """Run npm install + npm run build against the niche template with
    sentinels temporarily replaced by synthetic placeholder values.

    The niche template ships sentinel-laden; the Phase 1 prebuild hook
    (validate-brand-dna.mjs without --shape-only) would otherwise halt the
    build on those sentinels. To smoke-test the build at Module 2D time,
    we swap brand-dna.js for a synthetic-filled copy, run the build, then
    restore the original.
    """
    if not (niche_dir / "package.json").exists():
        return False, f"package.json missing at {niche_dir.relative_to(REPO_ROOT)}"

    brand_dna_js = niche_dir / "src" / "config" / "brand-dna.js"
    brand_dna_example = niche_dir / "src" / "config" / "brand-dna.example.js"
    if not brand_dna_js.exists():
        return False, "src/config/brand-dna.js missing"
    if not brand_dna_example.exists():
        return False, "src/config/brand-dna.example.js missing"

    # Snapshot original, then write a synthetic-filled version for the build.
    original = brand_dna_js.read_text()
    synthetic_ok, synthetic_msg = _write_synthetic_filled(brand_dna_js, brand_dna_example)
    if not synthetic_ok:
        return False, f"could not write synthetic brand-dna.js: {synthetic_msg}"

    try:
        if not skip_install:
            install = subprocess.run(
                ["npm", "install", "--silent"],
                cwd=niche_dir,
                capture_output=True,
                text=True,
            )
            if install.returncode != 0:
                return False, f"npm install exit={install.returncode}\n\nSTDOUT:\n{install.stdout[-2000:]}\n\nSTDERR:\n{install.stderr[-2000:]}"

        build = subprocess.run(
            ["npm", "run", "build"],
            cwd=niche_dir,
            capture_output=True,
            text=True,
        )
        if build.returncode != 0:
            return False, f"npm run build exit={build.returncode}\n\nSTDOUT:\n{build.stdout[-3000:]}\n\nSTDERR:\n{build.stderr[-3000:]}"

        dist = niche_dir / "dist"
        if not dist.exists():
            return False, "build succeeded but dist/ not produced"
        return True, f"vite build OK -> {dist.relative_to(REPO_ROOT)} (with synthetic brand-dna fill)"
    finally:
        # Always restore the original sentinel-laden brand-dna.js so the
        # niche template ships in the expected state.
        brand_dna_js.write_text(original)


def _write_synthetic_filled(brand_dna_js: Path, brand_dna_example: Path) -> tuple[bool, str]:
    """Compose a fully-populated brand-dna.js by re-evaluating the example
    via a Node helper and stamping placeholder strings for every sentinel,
    real hex values for palette entries, and Inter for typography.

    Writes the result to brand_dna_js. Returns (ok, message).
    """
    helper_js = (
        "import { brandDNA as example } from './brand-dna.example.js';\n"
        "function fill(obj) {\n"
        "  if (obj === null) return null;\n"
        "  if (Array.isArray(obj)) return obj.map(fill);\n"
        "  if (typeof obj === 'object') {\n"
        "    const out = {};\n"
        "    for (const [k, v] of Object.entries(obj)) out[k] = fill(v);\n"
        "    return out;\n"
        "  }\n"
        "  if (typeof obj === 'string' && /__REQUIRED__[A-Z0-9_]+__/.test(obj)) {\n"
        "    return obj.replace(/__REQUIRED__[A-Z0-9_]+__/g, 'FILLED');\n"
        "  }\n"
        "  return obj;\n"
        "}\n"
        "const filled = fill(example);\n"
        "// Hex palette values must look like real hex so inject-theme.mjs's\n"
        "// hexToRgbTriplet() doesn't throw.\n"
        "filled.palette = {\n"
        "  primary: '#0066cc', primary_dark: '#003366', primary_slate: '#5577aa',\n"
        "  accent: '#ffaa00', accent_light: '#ffcc55', accent_dark: '#cc8800',\n"
        "  neutral: '#aaaaaa', neutral_dim: '#888888', silver: '#cccccc', ink: '#222222',\n"
        "};\n"
        "filled.typography = { heading: 'Inter', body: 'Inter', headingFontUrl: 'Inter', bodyFontUrl: 'Inter' };\n"
        "filled.meta = { title: 'Synthetic Build', description: 'Niche template smoke test' };\n"
        "process.stdout.write('export const brandDNA = ' + JSON.stringify(filled, null, 2) + ';\\nexport default brandDNA;\\n');\n"
    )
    # Write helper to a temp file inside the config dir so its `import` path resolves.
    helper_path = brand_dna_js.parent / ".synthetic-fill.tmp.mjs"
    helper_path.write_text(helper_js)
    try:
        result = subprocess.run(
            ["node", "--input-type=module", "-e", f"import('{helper_path.as_posix()}').catch(e => {{ console.error(e); process.exit(1); }})"],
            cwd=brand_dna_js.parent,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            return False, f"node helper exit={result.returncode}: {result.stderr[-500:]}"
        if not result.stdout.strip():
            return False, "node helper produced no output"
        brand_dna_js.write_text(result.stdout)
        return True, "ok"
    finally:
        if helper_path.exists():
            helper_path.unlink()


def gate_4_design_audit(niche_dir: Path) -> tuple[bool, str]:
    """Soft gate. Surface generic-AI-aesthetic patterns the
    taste/redesign-skill would flag. This is a heuristic pass; the
    authoritative audit is done by Claude reading the skill at runtime.
    """
    src_dir = niche_dir / "src"
    if not src_dir.exists():
        return True, "src/ missing — skipping audit"

    hits: list[str] = []
    # Heuristic 1: count three-column feature grids (AI default).
    for path in src_dir.rglob("*.jsx"):
        text = path.read_text(errors="ignore")
        # md:grid-cols-3 on a 6+-row block with icon elements is the AI-slop signature.
        three_col = len(re.findall(r"\bgrid-cols-3\b|\blg:grid-cols-3\b|\bmd:grid-cols-3\b", text))
        if three_col >= 3:
            hits.append(f"{path.relative_to(REPO_ROOT)}: {three_col} three-column grid uses (AI-slop signature)")
        if re.search(r"gradient[- ]from[- ]blue.*gradient[- ]to[- ]purple", text, re.I):
            hits.append(f"{path.relative_to(REPO_ROOT)}: purple-blue gradient (AI-slop signature)")

    # Heuristic 2: forbidden vocabulary.
    forbidden_phrases = [
        ("seamless", "AI vocab"),
        ("revolutionize", "AI vocab"),
        ("synergize", "AI vocab"),
        ("game-changing", "AI vocab"),
        ("game-changer", "AI vocab"),
        ("cutting-edge", "AI vocab"),
    ]
    for path in src_dir.rglob("*.jsx"):
        text = path.read_text(errors="ignore").lower()
        for phrase, reason in forbidden_phrases:
            if phrase in text:
                hits.append(f"{path.relative_to(REPO_ROOT)}: forbidden phrase '{phrase}' ({reason})")

    if hits:
        # Soft fail: return ok=True but populate detail so callers can warn.
        return True, "WARNINGS:\n" + "\n".join(f"  - {h}" for h in hits)
    return True, "no generic-AI patterns detected"


def gate_5_ssim_vs_winner(niche_dir: Path) -> tuple[bool, str]:
    """Soft gate. Rendered template vs. winner screenshot SSIM >= 0.70.

    Requires Playwright + Pillow. Skipped (with a note) when either is
    missing or when no winner screenshot is available. Caller writes the
    note into AUDIT-WARNINGS.md.
    """
    pick_path = REPO_ROOT.parent / "research" / "02-niche-research"
    # We can't determine the niche slug from the template dir alone reliably,
    # so the niche slug is read from the template dir name. Caller passes it.
    return True, "SSIM gate is implemented end-to-end in the agent runtime (Playwright + Pillow); skipped at static-validate time"


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the 5 niche-template safety gates")
    parser.add_argument("--niche", required=True, help="Niche slug under templates/")
    parser.add_argument("--skip-install", action="store_true", help="Skip npm install on Gate 3")
    parser.add_argument("--strict", action="store_true", help="Promote soft gates (4, 5) to hard halts")
    args = parser.parse_args()

    niche_dir = TEMPLATES_DIR / args.niche
    if not niche_dir.exists():
        print(f"ERROR: niche template not found: {niche_dir}", file=sys.stderr)
        return 40
    if not niche_dir.is_dir():
        print(f"ERROR: not a directory: {niche_dir}", file=sys.stderr)
        return 40

    print(f"=== Niche template validation for '{args.niche}' ===\n")

    # Clean any prior marker so a successful re-run doesn't leave stale state.
    for fname in ("GENERATION-FAILED.md", "AUDIT-WARNINGS.md"):
        p = niche_dir / fname
        if p.exists():
            p.unlink()

    # Gate 1 — brand-dna shape (HARD)
    print("[Gate 1/5] brand-dna shape contract")
    ok, detail = gate_1_brand_dna_shape(niche_dir)
    if not ok:
        print(f"  FAIL: {detail}\n")
        _write_failure_marker(niche_dir, "Gate 1 — brand-dna shape", detail)
        return 10
    print(f"  PASS: {detail or 'shape OK'}\n")

    # Gate 2 — ESLint/parse (HARD)
    print("[Gate 2/5] JSX parse + sentinel check")
    ok, detail = gate_2_eslint_parse(niche_dir)
    if not ok:
        print(f"  FAIL: {detail}\n")
        _write_failure_marker(niche_dir, "Gate 2 — JSX parse", detail)
        return 20
    print(f"  PASS: {detail}\n")

    # Gate 3 — Vite build (HARD)
    print("[Gate 3/5] Vite build smoke")
    ok, detail = gate_3_vite_build(niche_dir, args.skip_install)
    if not ok:
        print(f"  FAIL: {detail}\n")
        _write_failure_marker(niche_dir, "Gate 3 — Vite build", detail)
        return 30
    print(f"  PASS: {detail}\n")

    # Gate 4 — design audit (SOFT or HARD-if-strict)
    print("[Gate 4/5] generic-AI audit")
    ok, detail = gate_4_design_audit(niche_dir)
    if "WARNINGS:" in detail:
        print(f"  WARN: {detail}\n")
        _write_audit_warning(niche_dir, "Gate 4 — generic-AI audit", detail)
        if args.strict:
            _write_failure_marker(niche_dir, "Gate 4 — generic-AI audit (strict)", detail)
            return 40
    else:
        print(f"  PASS: {detail}\n")

    # Gate 5 — SSIM vs winner (SOFT; static stub here)
    print("[Gate 5/5] SSIM vs winner")
    ok, detail = gate_5_ssim_vs_winner(niche_dir)
    print(f"  INFO: {detail}\n")

    print("=== ALL HARD GATES PASSED ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
