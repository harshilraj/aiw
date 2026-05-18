#!/usr/bin/env python3
"""
Stage 9 hero image generator for the website factory pipeline.

This module ships with a contractor / home-services default composition:
an anchor vehicle parked in front of a residential home, optional founder
portrait on the right. The composition is wired through `build_prompt()`
below. For non-contractor niches, the active niche playbook supplies its
own hero composition rules at
`templates/{active-niche-slug}/niche-playbook/hero-composition.md`;
Module 2D writes this per-niche based on the top-of-niche reference pool
(e.g. dressed table for hospitality, product still-life for ecommerce,
equipment for fitness). When a per-niche `hero-composition.md` is present,
the niche playbook's composition replaces the contractor default below.

Calls the Gemini Image API directly (replaces the Nano Banana MCP path
for reliability + log visibility).

Usage:
    python3 tools/generate-hero.py --client "Acme Roofing"
    python3 tools/generate-hero.py --client "Acme Construction" --no-owner

Requires:
    pip install google-genai pillow

Reads (from repo root):
    .env                                                       (GEMINI_API_KEY, GEMINI_MODEL)
    clients/[Client]/Pipeline Data/brand/brand-dna.json        (required)
    clients/[Client]/Pipeline Data/research/research.json      (optional)
    clients/[Client]/Pipeline Data/intake/intake-form.json     (optional)
    clients/[Client]/[Client] Assets/logo/logo.png|svg|jpg     (required)
    clients/[Client]/[Client] Assets/founder-photos/owner.*    (optional)

Writes:
    clients/[Client]/Pipeline Data/hero-image/hero-final.png
    clients/[Client]/Pipeline Data/hero-image/hero-prompt.md
    clients/[Client]/Pipeline Data/hero-image/hero-metadata.json
    clients/[Client]/Pipeline Data/hero-image/MANUAL-DROP-NEEDED.md   (only if logo missing)
    clients/[Client]/Pipeline Data/hero-image/REGENERATION-NEEDED.md  (only on hard failure)
"""

from __future__ import annotations

import argparse
import io
import json
import os
import shutil
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = REPO_ROOT / ".env"

# Default desktop landscape and mobile portrait targets used by the website template
# Hero <picture> element. The Gemini Image API does not always honour exact
# pixel dimensions, so the validator allows generous lower bounds. The
# build-from-template step in Stage 10.1 will resize to the final target.
DESKTOP_WIDTH = 1920
DESKTOP_HEIGHT = 1080
MOBILE_WIDTH = 828
MOBILE_HEIGHT = 1200

MAX_RETRIES = 3
BASE_BACKOFF_SEC = 2

DEFAULT_MODEL = "gemini-2.5-flash-image-preview"

MOOD_LIGHTING = {
    "golden_hour_warm": "Warm directional light from low angle, long soft shadows, saturated golden tones",
    "overcast_calm": "Soft diffused daylight, muted colors, even shadows, no harsh contrast",
    "stormy_dramatic_dusk": "Low-key dramatic lighting, dark sky with rim light on subjects",
    "bright_midday_clean": "Clean overhead light, crisp shadows, neutral color, full saturation",
    "dawn_soft_optimistic": "Cool soft light from east, gentle gradient sky, hopeful tone",
}

REGION_DEFAULTS = {
    "florida": {
        "home": "Florida coastal stucco or Mediterranean style",
        "accents": "white-washed stucco and clay tile accents",
        "roof": "Spanish clay tile",
        "roof_color": "terracotta",
        "setting": "subtropical residential",
        "landscaping": "tropical landscaping with palms, hibiscus, and manicured St. Augustine grass",
        "sky": "Bright Florida blue sky with cumulus clouds",
        "background": "coastal palms or distant Atlantic horizon",
    },
    "texas": {
        "home": "Texas brick-veneer two-story or low-pitch ranch",
        "accents": "warm red brick veneer with stone or stucco trim accents",
        "roof": "architectural asphalt shingle",
        "roof_color": "charcoal gray or weathered wood",
        "setting": "wooded master-planned suburban Texas neighborhood",
        "landscaping": "mature loblolly pines and live oaks lining the lot, manicured St. Augustine lawn",
        "sky": "Bright Texas blue sky with a few scattered cumulus clouds (looks like a clear day after a passing storm)",
        "background": "wooded subdivision treeline, no open ranchland",
    },
    "northeast_us": {
        "home": "Colonial, Cape Cod, or Tudor style",
        "accents": "clapboard or brick siding with shutter accents",
        "roof": "architectural asphalt shingle or slate",
        "roof_color": "charcoal or slate gray",
        "setting": "established residential",
        "landscaping": "manicured lawn with mature deciduous trees",
        "sky": "Soft New England sky with seasonal cloud cover",
        "background": "tree-lined ridge or coastal horizon",
    },
    "midwest_us": {
        "home": "two-story Colonial or Craftsman",
        "accents": "brick and clapboard accents",
        "roof": "architectural asphalt shingle",
        "roof_color": "charcoal gray or weathered wood",
        "setting": "established suburban",
        "landscaping": "manicured lawn with mature oaks and maples",
        "sky": "Bright Midwest sky with cumulus clouds",
        "background": "open sky or treeline",
    },
    "southeast_us": {
        "home": "brick ranch or Craftsman",
        "accents": "warm brick or painted clapboard accents",
        "roof": "architectural asphalt or standing-seam metal",
        "roof_color": "weathered wood or charcoal gray",
        "setting": "established suburban",
        "landscaping": "Southern landscaping with pine, dogwood, azalea, manicured lawn",
        "sky": "Soft Southern blue sky with cumulus clouds",
        "background": "pine ridge or distant Blue Ridge horizon",
    },
    "coastal_southeast": {
        "home": "coastal-southeast brick-veneer two-story or single-story ranch with vinyl siding accent (small-town residential character, modest scale)",
        "accents": "warm brick veneer paired with vinyl siding accents on the gable or second story",
        "roof": "freshly installed architectural asphalt shingle (clean, recently completed work)",
        "roof_color": "weathered wood or charcoal gray",
        "setting": "small-town coastal-southeast residential, modest lot, quiet street",
        "landscaping": "mature pines and live oaks along the property line, occasional palmetto, manicured lawn",
        "sky": "bright coastal blue sky with scattered cumulus clouds, post-storm clarity",
        "background": "pine and live oak treeline at the back of the lot, no mountains, no urban skyline",
    },
    "pacific_northwest": {
        "home": "Craftsman or Pacific contemporary",
        "accents": "natural cedar or stained timber accents",
        "roof": "cedar shake or architectural asphalt",
        "roof_color": "warm gray or cedar tone",
        "setting": "tree-lined residential",
        "landscaping": "Pacific landscaping with rhododendrons, ferns, and mature firs",
        "sky": "Pacific Northwest sky with high broken clouds",
        "background": "Cascade or coastal ridge",
    },
    "southwest_us": {
        "home": "single-story Southwest stucco",
        "accents": "terracotta and desert-toned accents",
        "roof": "concrete tile",
        "roof_color": "terracotta or clay tone",
        "setting": "desert suburban",
        "landscaping": "desert landscaping with gravel yards, native shrubs, occasional saguaro",
        "sky": "Clear blue Arizona sky with a few soft clouds",
        "background": "desert mountains in the distance",
    },
    "mountain_west": {
        "home": "Mountain Craftsman or contemporary with log accents",
        "accents": "natural log, cedar, and stone accents",
        "roof": "standing-seam metal or cedar shake",
        "roof_color": "weathered cedar or rust-tone metal",
        "setting": "mountain residential",
        "landscaping": "high-elevation landscaping with aspen, pine, and native grasses",
        "sky": "Crisp clear mountain sky with high cirrus",
        "background": "snow-capped peaks",
    },
    "default": {
        "home": "well-maintained suburban two-story",
        "accents": "neutral mixed siding accents",
        "roof": "architectural asphalt shingle",
        "roof_color": "weathered wood or charcoal gray",
        "setting": "established suburban",
        "landscaping": "manicured lawn with mature trees",
        "sky": "Bright blue sky with cumulus clouds",
        "background": "tree-lined horizon",
    },
}


def load_env():
    if not ENV_PATH.exists():
        sys.exit(f"ERROR: .env not found at {ENV_PATH}")
    for line in ENV_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def find_client_paths(client_name: str) -> dict:
    base = REPO_ROOT / "clients" / client_name
    if not base.exists():
        sys.exit(f"ERROR: client folder not found: {base}")
    pipeline = base / "Pipeline Data"
    assets = base / f"{client_name} Assets"
    return {
        "base": base,
        "brand_dna": pipeline / "brand" / "brand-dna.json",
        "research": pipeline / "research" / "research.json",
        "intake": pipeline / "intake" / "intake-form.json",
        "logo_dir": assets / "logo",
        "owner_dir": assets / "founder-photos",
        "out_dir": pipeline / "hero-image",
    }


def find_logo(logo_dir: Path):
    if not logo_dir.exists():
        return None
    for ext in ("png", "svg", "jpg", "jpeg"):
        for p in sorted(logo_dir.glob(f"*.{ext}")):
            return p
    return None


def find_owner_photo(owner_dir: Path):
    """Resolve owner photo with this priority order:
    1. owner.{png,jpg,jpeg} alias (Stage 1 intake creates this from the curated pick)
    2. primary.{png,jpg,jpeg} alias (alternate naming convention)
    3. First file alphabetically as last resort
    Skips any path under a 'truck/' subfolder.
    """
    if not owner_dir.exists():
        return None
    # Priority 1: explicit owner.* / primary.* alias
    for stem in ("owner", "primary"):
        for ext in ("png", "jpg", "jpeg"):
            candidate = owner_dir / f"{stem}.{ext}"
            if candidate.exists():
                return candidate
    # Priority 2: first non-truck photo alphabetically (legacy behaviour)
    for ext in ("png", "jpg", "jpeg"):
        for p in sorted(owner_dir.glob(f"*.{ext}")):
            if "/truck/" in str(p) or "truck" in p.parent.name.lower():
                continue
            return p
    return None


def safe_load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError as e:
        print(f"WARNING: bad JSON in {path}: {e}", file=sys.stderr)
        return {}


def build_prompt(brand_dna: dict, research: dict, intake: dict, has_owner: bool, client_name: str, variant: str = "desktop", mood_override: str = None, region_override: str = None) -> str:
    company = (
        intake.get("company_name")
        or brand_dna.get("company_name")
        or client_name
    )
    city = intake.get("city") or research.get("primary_city", "")
    state = intake.get("state") or research.get("primary_state", "")
    location = ", ".join([x for x in (city, state) if x])

    palette = brand_dna.get("palette", {})
    primary = palette.get("primary", "#1a1a1a")
    accent = palette.get("accent", "#FFD700")
    accent_name = palette.get("accent_name", "gold")

    hero_block = brand_dna.get("hero", {}) if isinstance(brand_dna.get("hero"), dict) else {}
    mood = mood_override or hero_block.get("mood", "golden_hour_warm")
    lighting = MOOD_LIGHTING.get(mood, MOOD_LIGHTING["golden_hour_warm"])

    region = region_override or brand_dna.get("region", "default")
    region_data = REGION_DEFAULTS.get(region, REGION_DEFAULTS["default"])

    # Read the optional photo_style_note from the brand resonance pass; falls
    # back to a neutral documentary descriptor if not present.
    photo_style_note = (
        brand_dna.get("photo_style_note")
        or "clean documentary photography, well-lit, clarity over cinematic mood"
    )

    services = research.get("services", []) or []
    # The wrap text rendered on the anchor vehicle (contractor default).
    # Niche playbooks override this via hero-composition.md when relevant.
    if isinstance(services, list) and services:
        anchor_wrap_text = " • ".join(str(s).upper() for s in services[:3])
    else:
        anchor_wrap_text = ""

    is_mobile = variant == "mobile"

    parts = []
    if is_mobile:
        parts.append(
            f"Photorealistic vertical (portrait) hero image for {company}"
            + (f" serving {location}" if location else "")
            + f". Tall portrait format, approximately {MOBILE_WIDTH}x{MOBILE_HEIGHT} pixels, aspect ratio close to 3:4. "
            "Designed for a mobile phone hero where the focal point sits in the UPPER TWO-THIRDS of the "
            "frame so a lead-capture form can overlay the lower third without covering the subject.\n"
        )
    else:
        parts.append(
            f"Photorealistic wide-format hero image for {company}"
            + (f" serving {location}" if location else "")
            + f". Landscape format, approximately {DESKTOP_WIDTH}x{DESKTOP_HEIGHT} pixels, 16:9 aspect ratio.\n"
        )

    parts.append("SCENE COMPOSITION")
    if is_mobile:
        parts.append(
            f"A {region_data['home']} fills the upper half of the frame, photographed from a slightly low angle. "
            f"The {region_data['roof']} in {region_data['roof_color']} is a clean, well-maintained architectural detail. "
            "The setting looks lived-in and well kept, not staged or aspirational."
        )
        parts.append(
            f"The setting is a {location or 'local'} {region_data['setting']} neighborhood with {region_data['landscaping']}. "
            f"{region_data['sky']}. {region_data['background']} sits faintly in the background.\n"
        )
    else:
        parts.append(
            f"A {region_data['home']} fills the upper two-thirds of the frame, photographed from a slightly low angle. "
            f"The {region_data['roof']} in {region_data['roof_color']} is a clean, well-maintained architectural detail. "
            f"The setting looks lived-in and well kept, not staged or aspirational for the {location or 'local'} market."
        )
        parts.append(
            f"The setting is a {location or 'local'} {region_data['setting']} neighborhood with {region_data['landscaping']}. "
            f"{region_data['sky']}. {region_data['background']} sits faintly in the background.\n"
        )

    parts.append("ANCHOR OBJECT IN FOREGROUND")
    if is_mobile:
        parts.append(
            "An anchor object representing the niche (per the niche playbook's "
            "`hero-composition.md`) sits in the foreground, angled at a three-quarter "
            f"view toward the camera. It carries clean accent striping in {accent} ({accent_name}), "
            "mirroring the colors and design language of the company's actual logo. "
            "Vertical framing: anchor object sits in the LOWER MIDDLE of the frame (around 40-60 "
            "percent from the top), with the scene above and clear foreground below.\n"
        )
    else:
        parts.append(
            "An anchor object representing the niche (per the niche playbook's "
            "`hero-composition.md`) sits in the foreground, angled at a three-quarter "
            f"view toward the camera. It carries clean accent striping in {accent} ({accent_name}), "
            "mirroring the colors and design language of the company's actual logo.\n"
        )

    parts.append("CRITICAL ANCHOR OBJECT BRANDING")
    parts.append(
        "The company's actual logo is attached as a reference image (subject consistency). Place the EXACT logo design on "
        "the anchor object as it would naturally appear in real life. The logo must be clearly visible and recognizable: "
        f"reproduce the logo's wordmark, lockup, iconography, and {primary} brand colors faithfully. Do NOT invent a "
        f"different logo or alter the colors and shapes. Any background detail beyond the logo is clean with {accent} "
        f"({accent_name}) accent striping pulled from the actual brand palette. NO other accent colors.\n"
    )
    parts.append(
        "The anchor object must be proportionally correct relative to the rest of the scene. It occupies roughly the bottom "
        "third of the frame in landscape, or the middle band in portrait.\n"
    )

    if has_owner:
        parts.append("FOUNDER PORTRAIT (RIGHT SIDE)")
        parts.append(
            "The founder's actual headshot is attached as a second reference image. Standing to the right of the "
            "anchor object, half-overlapping it (front of object visible behind shoulder), is a confident professional "
            "matching the provided reference photo. Casual professional attire, hands relaxed, natural smile, looking "
            "at camera. Studio-quality lighting on the subject. Reproduce the founder's facial features, hair, and skin "
            "tone faithfully from the reference photo. The founder occupies roughly the right 25 percent of the frame.\n"
        )
    else:
        parts.append("NO PEOPLE IN FRAME")
        parts.append(
            "Truck and house only. Do not generate any people, faces, or human figures.\n"
        )

    parts.append("LIGHTING AND MOOD")
    parts.append(f"{lighting}.\n")

    parts.append("COMPOSITION RULES")
    if is_mobile:
        parts.append(
            "- Focal point (scene + anchor object) lives in the UPPER 60-70 percent of the frame; the LOWER 30 percent must "
            "be calmer (clean foreground or open ground tone) so a lead form can overlay it cleanly\n"
            "- The scene and anchor object are the two primary visual anchors\n"
            "- Depth of field: both elements in sharp focus\n"
            "- No watermarks, no fabricated text on any surface other than the anchor object's branded area\n"
        )
    else:
        parts.append(
            "- The LEFT 40 percent of the image must have calmer tones, open sky, or negative space to allow clean text overlay; "
            "the RIGHT 30 percent must have enough room for a form column over the anchor-object area\n"
            "- The scene and anchor object are the two primary visual anchors"
            + (", with the founder as the human focal point on the right" if has_owner else "")
            + "\n"
            "- Depth of field: scene and anchor object both in sharp focus\n"
            "- No watermarks, no fabricated text on any surface other than the anchor object's branded area\n"
        )

    parts.append("STYLE")
    parts.append(
        f"Photo style: {photo_style_note}. Honest, locally-anchored documentary feel. "
        "Crisp and trustworthy without being cinematic or hyper-stylized. Avoid heavy color grading, lens flares, dramatic "
        "haze, or over-saturated commercial gloss. This should look like a real photo the business would post, not AI art. "
        "Avoid AI giveaways: no warped architecture, no melted edges, no impossibly perfect surfaces, no fabricated text on "
        f"any surface other than the anchor object's branded area. Regional context is {region_data['setting']}: "
        f"{region_data['home']}, {region_data['landscaping']}, {region_data['sky']}."
    )

    return "\n".join(parts).strip()


def call_gemini(prompt: str, logo_path: Path, owner_path, model_name: str) -> bytes:
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        sys.exit("ERROR: install google-genai (pip install google-genai)")

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        sys.exit("ERROR: GEMINI_API_KEY not in env")

    client = genai.Client(api_key=api_key)

    def _mime(path: Path) -> str:
        suffix = path.suffix.lstrip(".").lower()
        if suffix in ("jpg", "jpeg"):
            return "image/jpeg"
        if suffix == "svg":
            return "image/svg+xml"
        return f"image/{suffix}"

    contents = [prompt]
    contents.append(types.Part.from_bytes(data=logo_path.read_bytes(), mime_type=_mime(logo_path)))
    if owner_path:
        contents.append(types.Part.from_bytes(data=owner_path.read_bytes(), mime_type=_mime(owner_path)))

    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.models.generate_content(model=model_name, contents=contents)
            for cand in response.candidates or []:
                for part in cand.content.parts or []:
                    inline = getattr(part, "inline_data", None)
                    if inline and getattr(inline, "data", None):
                        return inline.data
            raise RuntimeError("API returned no image part")
        except Exception as e:
            last_err = e
            if attempt < MAX_RETRIES:
                wait = BASE_BACKOFF_SEC * (2 ** (attempt - 1))
                print(f"[retry {attempt}/{MAX_RETRIES}] {e}; waiting {wait}s", file=sys.stderr)
                time.sleep(wait)
            else:
                raise
    raise RuntimeError(f"Gemini API failed after {MAX_RETRIES} retries: {last_err}")


def validate_image(image_bytes: bytes, variant: str = "desktop") -> tuple[bool, str]:
    if len(image_bytes) < 10_000:
        return False, f"image too small ({len(image_bytes)} bytes)"
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        w, h = img.size
        if variant == "mobile":
            # Mobile must be portrait-leaning and ≥ 800x1000
            if w < 600 or h < 800:
                return False, f"mobile dimensions too small: {w}x{h}"
            if w >= h:
                return False, f"mobile must be portrait, got landscape {w}x{h}"
        else:
            if w < 1000 or h < 500:
                return False, f"desktop dimensions too small: {w}x{h}"
        sample = list(img.convert("RGB").resize((10, 10)).getdata())
        unique = {tuple(p) for p in sample}
        if len(unique) < 3:
            return False, "image appears to be a solid color"
    except ImportError:
        pass
    return True, "ok"


def write_text(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)


def _is_quota_error(err: Exception) -> bool:
    """Detect Gemini quota / rate-limit / billing errors from the exception message."""
    msg = str(err).lower()
    return any(token in msg for token in (
        "429",
        "resource_exhausted",
        "rate limit",
        "quota",
        "billing",
        "insufficient",
    ))


def _pick_fallback_photo(paths: dict, variant: str) -> Path | None:
    """Pick the best available scraped/dropped photo to use as a hero placeholder
    when Gemini generation fails (free-tier quota, network outage, etc).
    Preference order: hero-context > projects > project-images > owner.
    Variant hint (`desktop` | `mobile`) is currently informational only; image
    orientation is left to the PIL resize step in Stage 10.1.
    """
    candidate_dirs: list[Path] = []
    photos = paths.get("owner_dir")  # this is assets/photos/ per find_client_paths
    if photos:
        candidate_dirs.extend([
            photos / "hero-context",
            photos / "projects",
            photos,
            photos / "team",
        ])
    # Newer Stage 4 layouts that drop assets into different folders.
    base = paths.get("base") or paths.get("out_dir", Path(".")).parent
    if base:
        for sub in ("project-images", "founder-photos"):
            candidate_dirs.append(base / sub)

    seen: set[str] = set()
    for dir_path in candidate_dirs:
        if not dir_path or not dir_path.exists():
            continue
        for p in sorted(dir_path.iterdir()):
            if not p.is_file():
                continue
            if p.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                continue
            key = p.name.lower()
            if key in seen:
                continue
            seen.add(key)
            return p
    return None


def _write_fallback_image(fallback_src: Path, output_path: Path) -> int:
    """Copy a scraped photo into the hero output path. Returns byte count.
    Stage 10.1 (build-from-template.py) handles the WebP conversion + resize."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(fallback_src, output_path)
    return output_path.stat().st_size


def _generate_variant(variant: str, brand_dna: dict, research: dict, intake: dict, owner, has_owner: bool, logo: Path, client_name: str, model_name: str, out_dir: Path, mood_override: str = None, region_override: str = None, paths: dict = None, allow_fallback: bool = True) -> tuple[Path, dict, str]:
    """Generate one variant (desktop or mobile). Returns (output_path, info_dict, prompt_text).

    Fallback behavior: when `allow_fallback=True` (the default), the function
    falls back to the best-available scraped photo if Gemini generation
    exhausts retries OR returns a quota-related error. A MANUAL-DROP-NEEDED
    note is written so the student knows to swap in a real hero later. The
    pipeline does NOT halt on fallback; only when no scraped photo is
    available does the function raise.
    """
    prompt = build_prompt(brand_dna, research, intake, has_owner, client_name, variant=variant, mood_override=mood_override, region_override=region_override)

    image_bytes = None
    last_reason = ""
    quota_error_seen = False
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            candidate_bytes = call_gemini(prompt, logo, owner, model_name)
            ok, reason = validate_image(candidate_bytes, variant=variant)
            if ok:
                image_bytes = candidate_bytes
                break
            last_reason = reason
            print(f"[{variant} validation retry {attempt}/{MAX_RETRIES}] {reason}", file=sys.stderr)
        except Exception as e:
            last_reason = str(e)
            if _is_quota_error(e):
                # Quota / rate-limit. Retrying won't help. Break out and try fallback.
                quota_error_seen = True
                print(f"[{variant}] quota error: {e}", file=sys.stderr)
                break
            if attempt == MAX_RETRIES:
                if allow_fallback and paths is not None:
                    break  # fall through to fallback below
                write_text(
                    out_dir / f"REGENERATION-NEEDED-{variant}.md",
                    f"# Hero {variant} generation failed\n\n```\n{e}\n```\n\n## Filled prompt\n\n{prompt}\n",
                )
                raise

    if image_bytes is None:
        if allow_fallback and paths is not None:
            fallback = _pick_fallback_photo(paths, variant)
            if fallback is not None:
                output_path = out_dir / f"hero-final-{variant}.png"
                size = _write_fallback_image(fallback, output_path)
                reason_line = "free-tier quota exhausted" if quota_error_seen else f"generation failed: {last_reason}"
                write_text(
                    out_dir / f"MANUAL-DROP-NEEDED-hero-{variant}.md",
                    (
                        f"# Hero {variant} fallback in use\n\n"
                        f"Stage 9 could not generate a fresh hero image ({reason_line}). "
                        f"The build is using a scraped placeholder so the pipeline can continue:\n\n"
                        f"- Fallback source: `{fallback.relative_to(REPO_ROOT)}`\n"
                        f"- Output: `{output_path.relative_to(REPO_ROOT)}`\n\n"
                        f"## How to replace\n\n"
                        f"1. Top up Gemini billing OR resolve the failure cause.\n"
                        f"2. Re-run `python3 tools/generate-hero.py --client \"{client_name}\" --variant {variant}`.\n"
                        f"3. The fresh hero will overwrite this placeholder.\n\n"
                        f"## Filled prompt (for manual swap-in)\n\n{prompt}\n"
                    ),
                )
                info = {
                    "variant": variant,
                    "size_bytes": size,
                    "width": 0,
                    "height": 0,
                    "path": str(output_path.relative_to(REPO_ROOT)),
                    "fallback": True,
                    "fallback_source": str(fallback.relative_to(REPO_ROOT)),
                }
                print(f"  {variant}: FALLBACK -> {output_path.name} (from {fallback.name})", file=sys.stderr)
                return output_path, info, prompt
        write_text(
            out_dir / f"REGENERATION-NEEDED-{variant}.md",
            f"# Hero {variant} validation kept failing\n\nLast reason: {last_reason}\n\n## Filled prompt\n\n{prompt}\n",
        )
        raise RuntimeError(f"{variant} validation failed {MAX_RETRIES} times: {last_reason}")

    output_path = out_dir / f"hero-final-{variant}.png"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(image_bytes)

    try:
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        w, h = img.size
    except Exception:
        w, h = 0, 0

    info = {
        "variant": variant,
        "size_bytes": len(image_bytes),
        "width": w,
        "height": h,
        "path": str(output_path.relative_to(REPO_ROOT)),
    }
    print(f"  {variant}: {output_path.name} ({w}x{h}, {len(image_bytes):,} bytes)", file=sys.stderr)
    return output_path, info, prompt


def main():
    parser = argparse.ArgumentParser(description="Generate Stage 9 hero image(s) via Gemini API")
    parser.add_argument("--client", required=True, help="Client folder name (e.g. 'Acme Roofing')")
    parser.add_argument("--no-owner", action="store_true", help="Force skip founder cutout even if photo exists")
    parser.add_argument(
        "--variant",
        choices=("desktop", "mobile", "both"),
        default="both",
        help="Which variant to generate (default: both)",
    )
    parser.add_argument(
        "--mood",
        choices=tuple(MOOD_LIGHTING.keys()),
        default=None,
        help="Override brand-dna hero.mood for this run (does not mutate brand-dna.json)",
    )
    parser.add_argument(
        "--region",
        choices=tuple(REGION_DEFAULTS.keys()),
        default=None,
        help="Override brand-dna region for this run (does not mutate brand-dna.json)",
    )
    parser.add_argument(
        "--no-fallback",
        action="store_true",
        help="Disable the scraped-photo fallback when Gemini generation fails. By default, when Gemini hits quota or otherwise fails, the script uses the best available client photo as a placeholder + writes MANUAL-DROP-NEEDED so the pipeline can continue.",
    )
    args = parser.parse_args()

    load_env()
    paths = find_client_paths(args.client)
    out_dir = paths["out_dir"]

    logo = find_logo(paths["logo_dir"])
    if not logo:
        write_text(
            out_dir / "MANUAL-DROP-NEEDED.md",
            f"# Logo missing\n\nNo logo found in {paths['logo_dir']}.\nDrop a PNG/SVG and re-run Stage 9.\n",
        )
        sys.exit(f"ERROR: no logo at {paths['logo_dir']}")

    owner = None if args.no_owner else find_owner_photo(paths["owner_dir"])

    brand_dna = safe_load_json(paths["brand_dna"])
    research = safe_load_json(paths["research"])
    intake = safe_load_json(paths["intake"])

    if not brand_dna:
        sys.exit(f"ERROR: brand-dna.json missing or invalid at {paths['brand_dna']}")

    has_owner = owner is not None

    print(f"Generating hero for {args.client}", file=sys.stderr)
    print(f"  Logo: {logo.name}", file=sys.stderr)
    print(f"  Founder: {owner.name if owner else '(none, anchor-object only)'}", file=sys.stderr)
    print(f"  Mood: {brand_dna.get('hero', {}).get('mood', 'golden_hour_warm')}", file=sys.stderr)
    print(f"  Region: {brand_dna.get('region', 'default')}", file=sys.stderr)
    print(f"  Variant: {args.variant}", file=sys.stderr)

    model_name = os.environ.get("GEMINI_MODEL", DEFAULT_MODEL)

    variants_to_run = ["desktop", "mobile"] if args.variant == "both" else [args.variant]
    results = {}
    prompts = {}
    final_output = None

    for v in variants_to_run:
        output_path, info, prompt = _generate_variant(
            v, brand_dna, research, intake, owner, has_owner, logo, args.client, model_name, out_dir,
            mood_override=args.mood, region_override=args.region,
            paths=paths, allow_fallback=not args.no_fallback,
        )
        results[v] = info
        prompts[v] = prompt
        final_output = output_path

    # Combined prompt audit file: include each variant's prompt
    prompt_md_parts = [f"# Hero prompts for {args.client}\n"]
    for v in variants_to_run:
        prompt_md_parts.append(f"\n## {v.upper()} variant\n\n{prompts[v]}\n")
    write_text(out_dir / "hero-prompt.md", "\n".join(prompt_md_parts))

    metadata = {
        "client": args.client,
        "logo_used": str(logo.relative_to(REPO_ROOT)),
        "owner_used": str(owner.relative_to(REPO_ROOT)) if owner else None,
        "mood": brand_dna.get("hero", {}).get("mood", "golden_hour_warm"),
        "region": brand_dna.get("region", "default"),
        "variants": results,
        "model": model_name,
        "ts": int(time.time()),
    }
    write_text(out_dir / "hero-metadata.json", json.dumps(metadata, indent=2))

    if final_output is not None:
        print(f"DONE -> {out_dir}", file=sys.stderr)
        print(str(final_output))


if __name__ == "__main__":
    main()
