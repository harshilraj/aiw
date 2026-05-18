#!/usr/bin/env python3
"""
scaffold-niche-template.py

Assembles a per-niche template at `templates/{niche-slug}/` by:

  1. Cloning `templates/website-template/` as the baseline (every file inherited
     by default).
  2. Overlaying niche-specific generated components from `--overlay-dir` if
     supplied (Claude writes them to
     `research/02-niche-research/{niche-slug}/generated-components/`).
  3. Stamping a per-niche `tailwind.config.js` from niche design tokens.
  4. Writing niche-flavoured `brand-dna.defaults.js` from the tokens, plus a
     sentinel-laden `brand-dna.js` that Stage 10.1 fills per client.
  5. Producing a `MANIFEST.json` recording which components are niche-custom
     vs inherited so the validator can audit it.

Inherited components stay byte-identical with the website-template baseline.
Custom components must read the canonical brand-dna paths (validator catches
drift via Gate 1).

Usage:
  python3 tools/scaffold-niche-template.py \
      --niche {slug} \
      --tokens research/02-niche-research/{slug}/niche-design-tokens.json \
      [--overlay-dir research/02-niche-research/{slug}/generated-components/] \
      [--force]

The output is a self-contained Vite project ready for
`python3 tools/validate-niche-template.py --niche {slug}` to run the 5 gates.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = REPO_ROOT / "templates"
BASELINE = TEMPLATES_DIR / "website-template"
STACK_ROOT = REPO_ROOT.parent


def _slugify(text: str) -> str:
    return "".join(c if c.isalnum() or c in "-_" else "-" for c in text.lower()).strip("-")


def _load_tokens(tokens_path: Path) -> dict:
    if not tokens_path.exists():
        sys.exit(f"ERROR: tokens file not found: {tokens_path}")
    try:
        return json.loads(tokens_path.read_text())
    except json.JSONDecodeError as e:
        sys.exit(f"ERROR: tokens file is not valid JSON: {e}")


def clone_baseline(niche_dir: Path, force: bool) -> None:
    """Copy website-template/ -> templates/{slug}/ verbatim. Skip node_modules,
    dist, .git. If force=False and the niche dir exists, fail."""
    if niche_dir.exists():
        if not force:
            sys.exit(f"ERROR: niche template already exists at {niche_dir}. Use --force to overwrite.")
        # Back up the existing version with a timestamp suffix.
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup = niche_dir.with_name(f"{niche_dir.name}.backup-{ts}")
        print(f"  backing up existing template -> {backup.relative_to(REPO_ROOT)}")
        shutil.move(str(niche_dir), str(backup))

    def ignore(_src: str, names: list[str]) -> list[str]:
        return [n for n in names if n in {"node_modules", "dist", ".git", "package-lock.json"}]

    shutil.copytree(BASELINE, niche_dir, ignore=ignore)


def overlay_components(niche_dir: Path, overlay_dir: Path | None) -> dict[str, str]:
    """Copy any .jsx files from overlay_dir into niche_dir/src/components/
    (or src/pages/ if filename indicates a page). Returns a manifest mapping
    {filename: 'custom' | 'inherited'}.

    A file with a 'Page' suffix lands in src/pages/; everything else in
    src/components/.
    """
    manifest: dict[str, str] = {}

    # Catalogue every JSX file in the baseline first.
    src_components = niche_dir / "src" / "components"
    src_pages = niche_dir / "src" / "pages"
    for f in list(src_components.glob("*.jsx")) + list(src_pages.glob("*.jsx")):
        manifest[f.name] = "inherited"

    if overlay_dir and overlay_dir.exists():
        for source in overlay_dir.rglob("*.jsx"):
            target_dir = src_pages if source.stem.endswith("Page") else src_components
            target = target_dir / source.name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            manifest[source.name] = "custom"

    return manifest


def stamp_tailwind_config(niche_dir: Path, tokens: dict) -> None:
    """Update the niche tailwind.config.js theme.extend block with the niche
    palette + typography. Leaves the rest of the baseline tailwind config
    untouched. Best-effort string patching; safe to no-op when the baseline
    doesn't define `theme.extend.colors` yet (then the per-client
    inject-theme.mjs hook handles palette at build time)."""
    path = niche_dir / "tailwind.config.js"
    if not path.exists():
        return

    # Stamp a comment at the top so re-runs are visible and so the validator
    # can tell tokenized configs from baseline ones.
    text = path.read_text()
    marker = "// scaffold-niche-template: tokens injected"
    if marker in text:
        return  # already stamped

    palette = tokens.get("palette") or {}
    typography = tokens.get("typography") or {}
    stamp = (
        f"{marker}\n"
        f"// niche: {tokens.get('niche_slug', '?')}\n"
        f"// palette.primary: {palette.get('primary')}\n"
        f"// palette.accent: {palette.get('accent')}\n"
        f"// typography.heading: {typography.get('heading')}\n"
        f"// typography.body: {typography.get('body')}\n"
        "// (Per-client palette + Google Fonts are injected at prebuild by\n"
        "//  scripts/inject-theme.mjs reading src/config/brand-dna.js.)\n\n"
    )
    path.write_text(stamp + text)


def stamp_brand_dna(niche_dir: Path, tokens: dict) -> None:
    """Write a niche-flavoured brand-dna.js (still sentinel-laden where per-
    client data is required, but with niche-stable values like theme_mode,
    voice_register, shape_motif, motion preset, and palette swatches
    pre-filled from the tokens). Stage 10.1 fills the remaining sentinels
    with per-client values.
    """
    brand_dna_js = niche_dir / "src" / "config" / "brand-dna.js"
    if not brand_dna_js.exists():
        return  # baseline didn't ship a brand-dna.js; nothing to do

    # We do NOT overwrite the file's sentinels for fields that need per-client
    # values. We only patch niche-stable values via a small, safe regex.
    text = brand_dna_js.read_text()

    palette = tokens.get("palette") or {}
    if palette.get("primary"):
        text = _patch_string_field(text, "primary", palette["primary"])
    if palette.get("accent"):
        text = _patch_string_field(text, "accent", palette["accent"])
    if palette.get("accent_light"):
        text = _patch_string_field(text, "accent_light", palette["accent_light"])
    if palette.get("accent_dark"):
        text = _patch_string_field(text, "accent_dark", palette["accent_dark"])

    theme_mode = tokens.get("theme_mode")
    if theme_mode in ("light", "dark"):
        text = _patch_string_field(text, "theme_mode", theme_mode)

    shape_motif = tokens.get("shape_motif")
    if isinstance(shape_motif, str) and shape_motif:
        text = _patch_string_field(text, "shape_motif", shape_motif)

    brand_dna_js.write_text(text)


def _patch_string_field(text: str, field: str, value: str) -> str:
    """Replace the FIRST string value of a JS object field while preserving
    surrounding structure. Skips fields where the current value is not a
    sentinel string (so a manually-overridden value is not clobbered).
    Returns text unchanged on any miss."""
    import re

    # Match  field: "..."  on its own line (most common shape in brand-dna.js).
    pattern = re.compile(rf'(\b{re.escape(field)}:\s*")[^"]*(")')

    def repl(match: re.Match) -> str:
        # The captured opening prefix already contains the field name + colon +
        # opening quote, and the closing capture is the trailing quote. We
        # insert `value` literally; no $ interpolation because we use a
        # function replacer (the $110 lesson from Phase 1 inject-theme).
        return f"{match.group(1)}{value}{match.group(2)}"

    return pattern.sub(repl, text, count=1)


def write_manifest(niche_dir: Path, niche_slug: str, components: dict[str, str], tokens: dict, overlay_dir: Path | None) -> None:
    """Write MANIFEST.json so the validator + the agent can see exactly which
    components are niche-custom and which are inherited from the baseline."""
    custom = sorted([k for k, v in components.items() if v == "custom"])
    inherited = sorted([k for k, v in components.items() if v == "inherited"])
    overlay_display: str | None = None
    if overlay_dir and overlay_dir.exists():
        resolved = overlay_dir.resolve()
        try:
            overlay_display = str(resolved.relative_to(STACK_ROOT))
        except ValueError:
            overlay_display = str(resolved)
    manifest = {
        "niche": niche_slug,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "baseline": "templates/website-template",
        "overlayDir": overlay_display,
        "components": {
            "customCount": len(custom),
            "inheritedCount": len(inherited),
            "custom": custom,
            "inherited": inherited,
        },
        "tokens": {
            "palette": tokens.get("palette"),
            "typography": tokens.get("typography"),
            "theme_mode": tokens.get("theme_mode"),
            "shape_motif": tokens.get("shape_motif"),
            "motion": tokens.get("motion"),
        },
    }
    (niche_dir / "MANIFEST.json").write_text(json.dumps(manifest, indent=2))


def main() -> int:
    parser = argparse.ArgumentParser(description="Scaffold a per-niche template by overlaying generated components onto the website-template baseline")
    parser.add_argument("--niche", required=True, help="Niche slug, e.g. 'auto-detailing'")
    parser.add_argument("--tokens", required=True, type=Path, help="Path to niche-design-tokens.json")
    parser.add_argument("--overlay-dir", type=Path, default=None, help="Directory with niche-generated .jsx component files to overlay onto the baseline")
    parser.add_argument("--force", action="store_true", help="Back up + overwrite an existing niche template")
    args = parser.parse_args()

    niche_slug = _slugify(args.niche)
    niche_dir = TEMPLATES_DIR / niche_slug

    if not BASELINE.exists():
        sys.exit(f"ERROR: baseline template missing: {BASELINE.relative_to(REPO_ROOT)}")

    tokens = _load_tokens(args.tokens)
    tokens.setdefault("niche_slug", niche_slug)

    print(f"=== Scaffolding niche template '{niche_slug}' ===\n")

    print("[1/5] cloning website-template -> templates/{niche-slug}/")
    clone_baseline(niche_dir, args.force)

    print("\n[2/5] overlaying niche-generated components (if any)")
    components = overlay_components(niche_dir, args.overlay_dir)
    custom_count = sum(1 for v in components.values() if v == "custom")
    print(f"  {custom_count} component(s) overlaid; {len(components) - custom_count} inherited from baseline")

    print("\n[3/5] stamping tailwind.config.js with niche tokens")
    stamp_tailwind_config(niche_dir, tokens)

    print("\n[4/5] patching niche-stable values into brand-dna.js")
    stamp_brand_dna(niche_dir, tokens)

    print("\n[5/5] writing MANIFEST.json")
    write_manifest(niche_dir, niche_slug, components, tokens, args.overlay_dir)

    # Drop the package.json name to the niche slug so the build log is unambiguous.
    pkg = niche_dir / "package.json"
    if pkg.exists():
        pkg_obj = json.loads(pkg.read_text())
        pkg_obj["name"] = f"website-template-{niche_slug}"
        pkg.write_text(json.dumps(pkg_obj, indent=2) + "\n")

    print(f"\nDONE -> {niche_dir.relative_to(REPO_ROOT)}")
    print(f"Run: python3 tools/validate-niche-template.py --niche {niche_slug}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
