#!/usr/bin/env python3
"""
render-template-reference.py — Stage 10.4a helper

Builds `templates/website-template/` to a temporary directory with a given client's
brand-dna applied, then headlessly renders desktop + mobile screenshots of
the home page. The screenshots become the "expected visual" reference that
Stage 10.4a SSIM-diffs the per-client production build against.

Why a temp build instead of just diffing against the live the website template?
The per-client build has its OWN palette, copy, photos. Diffing against
the live the website template fails immediately on color and content. Diffing against
"templates/website-template with this client's brand-dna applied" cancels out the
expected per-client variance and only flags STRUCTURAL/visual deltas
(spacing, alignment, component shape).

Usage:
    python3 tools/render-template-reference.py --client "Acme Roofing"
    python3 tools/render-template-reference.py --client "Acme Roofing" --out /tmp/refs

Reads:
    clients/[X]/[X] Website/src/config/brand-dna.js  (already composed by Stage 10.1)
    templates/website-template/                              (the canonical source)

Writes:
    clients/[X]/Pipeline Data/qa-screenshots/reference-desktop.png
    clients/[X]/Pipeline Data/qa-screenshots/reference-mobile.png
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = REPO_ROOT / "templates" / "website-template"


def main() -> int:
    parser = argparse.ArgumentParser(description="Stage 10.4a helper: render templates/website-template with this client's brand-dna applied for SSIM reference.")
    parser.add_argument("--client", required=True)
    parser.add_argument("--out", type=Path, default=None, help="Reference dir (default clients/[X]/Pipeline Data/qa-screenshots/)")
    parser.add_argument("--port", type=int, default=4174, help="Preview server port (default 4174)")
    args = parser.parse_args()

    client_site = REPO_ROOT / "clients" / args.client / f"{args.client} Website"
    client_brand_dna = client_site / "src" / "config" / "brand-dna.js"
    if not client_brand_dna.exists():
        print(f"ERROR: client brand-dna.js missing: {client_brand_dna}", file=sys.stderr)
        print("Run Stage 10.1 first.", file=sys.stderr)
        return 1

    out_dir = args.out or (REPO_ROOT / "clients" / args.client / "Pipeline Data" / "qa-screenshots")
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("ERROR: playwright not installed. Run: pip install playwright && playwright install chromium", file=sys.stderr)
        return 1

    with tempfile.TemporaryDirectory(prefix="agency-ref-") as tmp:
        tmp_path = Path(tmp)
        ref_site = tmp_path / "ref"

        print(f"[1/4] copying templates/website-template -> {ref_site}")

        def ignore(_dir: str, names: list[str]) -> list[str]:
            return [n for n in names if n in {"node_modules", "dist", ".git"}]

        shutil.copytree(TEMPLATE_DIR, ref_site, ignore=ignore)

        # Overlay this client's brand-dna.js (and copy the per-client public/ assets so the
        # reference build looks like the production build minus structural differences)
        shutil.copyfile(client_brand_dna, ref_site / "src" / "config" / "brand-dna.js")
        if (client_site / "public").exists():
            for item in (client_site / "public").iterdir():
                target = ref_site / "public" / item.name
                if target.exists() and target.is_dir():
                    shutil.rmtree(target)
                elif target.exists():
                    target.unlink()
                if item.is_dir():
                    shutil.copytree(item, target)
                else:
                    shutil.copyfile(item, target)

        print(f"[2/4] npm install + npm run build")
        subprocess.run(["npm", "install", "--silent"], cwd=ref_site, check=True)
        subprocess.run(["npm", "run", "build"], cwd=ref_site, check=True)

        print(f"[3/4] starting preview server on port {args.port}")
        preview = subprocess.Popen(
            ["npm", "run", "preview", "--", "--port", str(args.port)],
            cwd=ref_site,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        # Wait briefly for the server to bind
        time.sleep(3)

        try:
            print(f"[4/4] screenshotting desktop + mobile")
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                ctx_d = browser.new_context(viewport={"width": 1440, "height": 900})
                page_d = ctx_d.new_page()
                page_d.goto(f"http://localhost:{args.port}/", timeout=15000, wait_until="networkidle")
                page_d.screenshot(path=str(out_dir / "reference-desktop.png"), full_page=True)
                ctx_d.close()

                ctx_m = browser.new_context(viewport={"width": 375, "height": 812})
                page_m = ctx_m.new_page()
                page_m.goto(f"http://localhost:{args.port}/", timeout=15000, wait_until="networkidle")
                page_m.screenshot(path=str(out_dir / "reference-mobile.png"), full_page=True)
                ctx_m.close()
                browser.close()
        finally:
            preview.terminate()
            try:
                preview.wait(timeout=5)
            except subprocess.TimeoutExpired:
                preview.kill()

    print(f"\nWrote reference-desktop.png and reference-mobile.png to {out_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
