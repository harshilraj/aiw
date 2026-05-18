# Nano Banana / Gemini Hero Image Prompt Template

> The hero-image-agent (Stage 9 sub-agent) fills this template with client variables and saves it to `clients/[slug]/hero-image/prompt.md`. The user copies that filled file and pastes it into Nano Banana / Gemini AI Studio (with the client's logo attached as a reference image).
>
> The earlier file `nano-banana-hero.template.md` in this folder is the LEGACY 200-line agent-instruction style template (kept as reference for advanced runs).

---

Photorealistic wide-format hero image for the client's website (landscape aspect ratio, approximately 1500x700px). The composition below is the contractor / home-services default. Non-contractor niches override via `templates/{active-niche-slug}/niche-playbook/hero-composition.md`.

## SCENE COMPOSITION

A {REGIONAL_SCENE_DESCRIPTOR} fills the upper two-thirds of the frame, photographed from a slightly low angle. The {SCENE_FOCAL_DETAIL} is a clean, well-maintained architectural detail. The setting looks well-kept and authentic for the {CITY_STATE} market.

The setting is a {CITY_STATE} {SETTING_TYPE} environment with {LANDSCAPING_DESCRIPTOR}. {REGIONAL_LANDMARK} is faintly visible in the far background. {SKY_DESCRIPTOR}.

## ANCHOR OBJECT IN FOREGROUND

Placed in the foreground at a three-quarter view toward the camera is the niche's anchor object (per the niche playbook's `hero-composition.md`). The object carries a clean branded surface in {WRAP_BASE_DESCRIPTOR} {WRAP_BASE_HEX} with {WRAP_ACCENT_DESCRIPTOR} accent striping. {LOGO_MOTIF_VEHICLE_INTEGRATION}

## CRITICAL - ANCHOR OBJECT BRANDING

I am attaching the company's actual logo as a reference image. Use this exact logo design on the anchor object's branded area as it would appear in real life. The logo must be clearly visible and recognizable - {LOGO_VERBAL_DESCRIPTION}. Reproduce the logo's colors, shapes, and iconography faithfully. Additional text reads "{ANCHOR_BED_SERVICES}" in {ANCHOR_BED_TEXT_COLOR}.

The anchor object must be proportionally correct relative to the rest of the scene. It occupies roughly the bottom third of the frame.

## BRANDING COLORS

- **Primary**: {WRAP_BASE_HEX} ({WRAP_BASE_DESCRIPTOR} - anchor object base)
- **Secondary**: {ACCENT_HEX} ({ACCENT_NAME} - logo accent, striping)
- **Tertiary**: {SILVER_HEX} ({SILVER_NAME} - line art details)
- **Text**: {ANCHOR_BED_TEXT_COLOR}

All colors must be consistent with the brand identity. No colors outside this palette. {COLOR_NEGATIVES}.

## COMPOSITION RULES

- No people in the image
- The left side of the image should have darker tones, open sky, or negative space to allow clean text overlay on the website
- The scene and the anchor object are the two visual anchors - the eye should move between them
- Depth of field: scene and anchor object both in sharp focus, background {REGIONAL_BACKGROUND_FEATURE} slightly softer
- Lighting: {LIGHTING_DESCRIPTOR}, warm light from the left, long {REGIONAL_SHADOW_DESCRIPTOR} shadows

## STYLE

High-resolution commercial photography aesthetic. Crisp, professional, trustworthy. Slightly desaturated shadows for a polished commercial feel. The {CITY_STATE} {REGIONAL_CHARACTER} landscape should feel authentic - {REGIONAL_AUTHENTIC_DESCRIPTORS}. This should look like a photo from a premium business's portfolio, not AI-generated art.

## DO NOT INCLUDE

- People or faces (unless the niche playbook's hero-composition.md explicitly includes a founder portrait)
- Visible power lines or utility poles
- Snow, rain, or overcast skies (unless `{LIGHTING_DESCRIPTOR}` explicitly calls for them)
- {VEGETATION_NEGATIVE}
- Any text, watermarks, or overlays not described above
- Anything explicitly listed in the niche playbook's "Forbidden in frame" section

---

## VARIABLE FILL GUIDE (for the agent, NOT for the user paste)

### Per-client core variables

- `{CITY_STATE}` - from `intake.city`, `intake.state` (e.g. "Phoenix, AZ" or "Boulder, CO")
- `{COMPANY_NAME}` - from `intake.company_name`
- `{LOGO_VERBAL_DESCRIPTION}` - from logo-analyzer Phase A output. Verbal description of the logo's recognizable features (e.g. "it shows '{COMPANY_NAME}' in charcoal serif lettering and a descriptor in bold accent-color lettering beneath it, with a niche-appropriate iconographic element")
- `{LOGO_MOTIF_VEHICLE_INTEGRATION}` - 1 sentence describing how the logo's primary motif could be subtly used on the truck wrap. Derived from logo-analyzer Phase A pass 3 (motif). Examples:
  - mountain motif: "The mountain silhouette from the logo is subtly incorporated into the wrap design as a graphic element across the rear panel."
  - shield motif: "The shield outline from the logo is incorporated as a thin chevron line treatment along the truck bed sides."
  - flame motif: "The flame curve from the logo is subtly incorporated as accent striping along the lower body of the truck."
  - wordmark-only: "" (omit this sentence entirely)

### Anchor object branding variables (always pulled from brand-dna.palette)

- `{WRAP_BASE_HEX}` = `brand-dna.palette.primary`
- `{WRAP_BASE_DESCRIPTOR}` - friendly description of `{WRAP_BASE_HEX}`. Generated based on the actual hex value:
  - Near-black warm tone: "matte charcoal black"
  - Near-black cool tone: "matte charcoal"
  - Deep navy: "deep navy"
  - Deep forest: "deep forest green"
  - Deep brown: "espresso brown"
  - Deep slate: "deep slate gray"
- `{ACCENT_HEX}` = `brand-dna.palette.accent`
- `{ACCENT_NAME}` = the name of the accent color from `brand-dna.palette.accent_name`
- `{WRAP_ACCENT_DESCRIPTOR}` - friendly description of `{ACCENT_HEX}` for striping. e.g. "gold/amber" / "burnished copper" / "polished bronze" / "royal blue" / "forest green"
- `{SILVER_HEX}` = `brand-dna.palette.silver`
- `{SILVER_NAME}` = the name of the silver/cream color
- `{ANCHOR_BED_TEXT_COLOR}` - typically "white" but can be the silver hex if it reads cleanly against the wrap base. Default: white.
- `{ANCHOR_BED_SERVICES}` - pulled from `research.services` (top 3 services, separated by `•`). Empty if the niche has no service list.
- `{COLOR_NEGATIVES}` - colors to explicitly exclude based on what's in the brand-dna palette. e.g. if accent is amber/copper: "No orange. No bright yellow." If accent is blue: "No teal. No turquoise." Generated based on the closest "wrong" colors to the actual accent.

### Regional / aesthetic variables (from `research.json` + brand-research.md + state lookup)

| State / Region | `{REGIONAL_HOME_DESCRIPTOR}` | `{ARCHITECTURAL_ACCENTS}` | `{ROOF_MATERIAL}` | `{ROOF_COLOR_DESCRIPTOR}` | `{SETTING_TYPE}` | `{LANDSCAPING_DESCRIPTOR}` | `{REGIONAL_LANDMARK}` (default if research.regional_landmark absent) | `{SKY_DESCRIPTOR}` | `{LIGHTING_DESCRIPTOR}` | `{REGIONAL_BACKGROUND_FEATURE}` | `{REGIONAL_SHADOW_DESCRIPTOR}` | `{REGIONAL_CHARACTER}` | `{REGIONAL_AUTHENTIC_DESCRIPTORS}` | `{VEGETATION_NEGATIVE}` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AZ / NM / NV (Southwest desert) | "single-story stucco Southwest-style" | "terracotta and desert-toned accents" | "concrete tile" | "terracotta/clay color" | "desert suburban" | "desert landscaping (gravel yards, native shrubs, a few saguaro cacti)" | "desert mountains" | "Clear blue Arizona sky with a few soft clouds" | "Golden hour" | "mountains/sky" | "desert" | "Southwestern desert" | "warm, dry, sun-baked" | "Lush green grass or non-desert vegetation" |
| FL / coastal Southeast | "Florida coastal stucco or Mediterranean" | "white-washed stucco and clay tile accents" | "Spanish clay tile" | "terracotta or barrel tile" | "subtropical residential" | "tropical landscaping (palms, hibiscus, manicured St. Augustine grass)" | "coastal palms or Atlantic skyline" | "Bright Florida blue sky with cumulus clouds" | "Golden hour, warm humid light" | "palms/sky" | "tropical" | "Floridian coastal" | "warm, humid, lush" | "Snow, ice, or dead foliage" |
| TX / OK | "Texas brick ranch or contemporary" | "warm brick and stone accents" | "architectural asphalt shingle" | "weathered wood or charcoal gray" | "established suburban" | "manicured lawn with native oaks and crepe myrtles" | "open Texas sky or distant ranchland" | "Wide Texas blue sky with high cirrus clouds" | "Golden hour, strong directional light" | "open sky/ranchland" | "long" | "Texas" | "wide, sunny, expansive" | "Snow or dense forest" |
| Northeast (NY/NJ/CT/MA/PA) | "Colonial / Cape Cod / Tudor" | "clapboard or brick with shutter accents" | "architectural asphalt shingle or slate" | "charcoal or slate gray" | "established residential" | "manicured lawn with mature deciduous trees" | "tree-lined ridge or coastal horizon" | "Soft New England sky with seasonal cloud cover" | "Warm afternoon, soft directional light" | "trees/sky" | "long autumn" | "Northeastern" | "established, traditional, seasonally vibrant" | "Tropical palms or desert plants" |
| PNW (WA/OR) | "Craftsman or Pacific contemporary" | "natural cedar or stained timber accents" | "cedar shake or architectural asphalt" | "warm gray or cedar-tone" | "tree-lined residential" | "Pacific landscaping (rhododendrons, ferns, mature firs)" | "Cascade or coastal ridge" | "Pacific Northwest sky with high broken clouds" | "Filtered afternoon light, slightly cool" | "fir ridge/sky" | "soft cool" | "Pacific Northwestern" | "lush, evergreen, slightly cool" | "Desert plants or palms" |
| Midwest (IL/OH/IN/MI/WI) | "two-story Colonial or Craftsman" | "brick and clapboard accents" | "architectural asphalt shingle" | "charcoal gray or weathered wood" | "established suburban" | "manicured lawn with mature oaks and maples" | "open Midwest sky or treeline" | "Bright Midwest sky with cumulus clouds" | "Warm afternoon, slight golden cast" | "trees/sky" | "long warm" | "Midwestern" | "established, lush, four-season" | "Tropical palms or desert plants" |
| Southeast (NC/SC/TN/AL/GA) | "Brick ranch or Craftsman" | "warm brick or painted clapboard accents" | "architectural asphalt or standing-seam metal" | "weathered wood or charcoal gray" | "established suburban" | "Southern landscaping (pine, dogwood, azalea, manicured lawn)" | "pine ridge or Blue Ridge horizon" | "Soft Southern blue sky with cumulus clouds" | "Warm afternoon, slightly hazy" | "pines/sky" | "warm afternoon" | "Southeastern" | "warm, lush, slightly humid" | "Cacti or desert plants" |
| Mountain West (CO/UT/ID/MT/WY) | "Mountain craftsman or contemporary" | "natural log, cedar, and stone accents" | "standing-seam metal or cedar shake" | "weathered cedar or rust-tone metal" | "mountain residential" | "high-elevation landscaping (aspen, pine, native grasses)" | "snow-capped peaks" | "Crisp clear mountain sky with high cirrus" | "Crisp afternoon, slight blue cast" | "peaks/sky" | "crisp" | "Mountain Western" | "crisp, alpine, expansive" | "Tropical palms or desert plants" |

The agent looks up `intake.state` in this table for defaults, then overrides any field where `research.json.regional_landmark` or `brand-dna.photography` has an explicit per-client value.

### Reference attachment

Beyond the logo, the user can OPTIONALLY attach reference photos from `clients/[slug]/assets/hero-context/` if any exist. These help Nano Banana ground the regional aesthetic. The agent should NOT require these to halt - they're a quality bump, not a hard dependency.
