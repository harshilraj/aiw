# contractor-hero-image-agent (Stage 9)

Five-phase autonomous agent that generates the hero photograph for a
roofing contractor website using Nano Banana (or equivalent image
generation MCP).

The hero image is the single most important visual on the site, the
homeowner sees it first, scans for trust signals, and forms a mental model
of the company within seconds. This agent encodes the SOP for getting it
right.

---

## INPUTS

- `client-data/[client]/brand/brand-dna.json` (Stage 7 output)
- `client-data/[client]/research/research.json` (Stage 2 output)
- `client-data/[client]/assets/logo/logo.{svg,png}` (THE CLIENT LOGO)
- `client-data/[client]/assets/photos/owner/founder-photo.jpg` (optional)
- `client-data/[client]/assets/photos/truck/truck-reference.jpg` (optional)

## OUTPUT

- `client-data/[client]/hero-image/hero-final.png`
- `client-data/[client]/hero-image/hero-prompt.md` (the assembled prompt for audit)

---

## PHASE 1, ASSET SCAN

Confirm:

1. Client logo exists at the expected path. If missing, halt with
   `MANUAL-DROP-NEEDED.md` instructing where to drop it.
2. Owner photo exists. If yes, the prompt will request the owner be
   foregrounded; if no, the prompt will use generic crew or no human.
3. Truck reference photo exists. If yes, the prompt will request the
   client's actual truck (with their logo wrap); if no, generic
   contractor truck.
4. Brand DNA region is set. Used to pick the regional house style default.

## PHASE 2, WEB RESEARCH

Pull from `research.json`:

- Target neighborhood income tier (for house style calibration)
- Recent project photos referenced in GBP (for color palette of houses
  in the area)
- Service area primary city + state (for sky / weather feel)

If `research.json` is sparse or missing the relevant fields, fall through
to regional defaults from Phase 3 without halting.

## PHASE 3, VARIABLE POPULATION

### Regional defaults table

The agent uses `brand-dna.region` to pick a regional house style. This
ensures the hero image looks native to where the contractor actually
works, not generic-suburban.

| Region | House style | Roof style | Ambient palette | Weather feel |
|--------|-------------|------------|-----------------|--------------|
| `florida` | Stucco exterior, palm-tree landscaping | Barrel tile or architectural shingles | Warm whites, terracotta accents | Bright tropical sun OR dramatic afternoon storm |
| `texas` | Brick ranch with covered porch | Architectural composition shingles | Warm earth tones | Wide blue sky, slight haze |
| `northeast_us` | Two-story Colonial, clapboard siding | Architectural composition or slate | Crisp whites, navy shutters | Clear autumn or overcast |
| `midwest_us` | Two-story vinyl siding, attached garage | Architectural shingles | Beige, muted earth tones | Overcast or partly cloudy |
| `southeast_us` | Craftsman with deep eaves | Architectural shingles | Warm beige, deep porch shadow | Late-afternoon golden |
| `pacific_northwest` | Mixed siding with stone accents, evergreen landscaping | Architectural composition | Cool greens, weathered grays | Overcast, atmospheric |
| `southwest_us` | Adobe stucco, flat or low-slope | Tile or flat foam | Warm beige, terracotta | High desert sun |
| `mountain_west` | Log-accented, A-frame influence | Metal standing seam OR architectural | Warm wood tones, deep stone | Crisp blue sky, mountain backdrop |
| `default` | Suburban two-story with attached garage | Architectural composition shingles | Neutral mixed | Soft daylight |

Pick the row matching `brand-dna.region`. Override the picked row with
any specifics from `research.json` (e.g. if research says "primarily
serves coastal Tampa", override `florida` to lean coastal).

### Variables to populate

```
{COMPANY_NAME}        from brand-dna.company_name
{REGION_HOUSE_STYLE}  from regional defaults table
{REGION_ROOF_STYLE}   from regional defaults table
{REGION_PALETTE}      from regional defaults table
{REGION_WEATHER}      from regional defaults table OR brand-dna.hero.mood mapping
{HERO_MOOD}           from brand-dna.hero.mood
{OWNER_PRESENT}       boolean, true if owner photo exists
{OWNER_DESCRIPTION}   "owner standing professionally in front" if true, else ""
{TRUCK_BRANDED}       boolean, true if truck reference exists
{LOGO_INSTRUCTIONS}   the locked attachment paragraph (see Phase 4)
```

### Hero mood mapping

If region default conflicts with explicit `brand-dna.hero.mood`, the
mood wins. Mood overrides:

- `stormy_dramatic_dusk` → dramatic late-afternoon storm clouds in BG,
  shafts of golden light cutting through, slightly desaturated palette
- `golden_hour_warm` → late afternoon golden sun, warm shadows, full color
- `overcast_calm` → soft diffused light, no harsh shadows, muted palette
- `midday_bright` → high sun, crisp shadows, full saturation
- `desert_high_sun` → bright midday sun, dry palette, distant haze

## PHASE 4, PROMPT ASSEMBLY

The locked prompt structure:

```
Generate a photorealistic hero image for {COMPANY_NAME}, a roofing contractor
serving {SERVICE_AREA_PRIMARY_CITY}, {STATE}.

COMPOSITION
A {REGION_HOUSE_STYLE} home occupies the right two-thirds of the frame,
with a {REGION_ROOF_STYLE} roof clearly visible. The home is in good
repair, this is a confidence-inspiring image, not a "before" photo.

A branded company truck is parked in the driveway, front-three-quarter
view, on the left third of the frame. {OWNER_DESCRIPTION}

LOGO PLACEMENT
{LOGO_INSTRUCTIONS}

LIGHTING
{REGION_WEATHER}, mood: {HERO_MOOD}.

PALETTE
{REGION_PALETTE}, with the company's brand color {BRAND_ACCENT} appearing
on the truck wrap.

STYLE
Photorealistic, mid-range DSLR look (35mm-50mm equivalent focal length),
shallow depth of field on the truck and owner, sharp focus on the home.
Natural color grading. Avoid overly polished or stock-photo aesthetics.
Avoid AI-generated giveaways: no warped windows, no extra fingers, no
melty roof lines, no impossibly perfect landscaping.

ASPECT RATIO
16:9 landscape. Subjects positioned to leave the LEFT 40% relatively
unobstructed (this area gets a dark gradient overlay for the H1 + lead
form to sit over).
```

### LOGO_INSTRUCTIONS (locked)

Always inject this paragraph verbatim when a logo is attached:

```
I am attaching the company's actual logo as a reference image. Use this
exact logo design on the truck's front door area, sized appropriately for
a real truck wrap (roughly 60-80% of the door height). Do not stylize,
recolor, or simplify the logo, reproduce it faithfully as it would
appear on a real vehicle decal. The logo should look professionally
installed, slightly weathered to feel realistic, but unmistakably the
real logo.
```

If `TRUCK_BRANDED` is also true (truck reference photo exists), append:

```
Additionally, the truck make/model and color should match the attached
truck reference photo.
```

## PHASE 5, OUTPUT

1. Save the assembled prompt to `client-data/[client]/hero-image/hero-prompt.md`
   for audit purposes.

2. Call the Nano Banana MCP with:
   - prompt: the assembled prompt
   - attachments: [client logo, owner photo (if exists), truck reference (if exists)]
   - aspect ratio: 16:9
   - count: 4 candidates

3. Save all 4 candidates to `client-data/[client]/hero-image/candidate-{1..4}.png`

4. Programmatic scoring (or LLM-based scoring if available):
   - Logo legibility on truck (most important)
   - No AI artifacts (warped windows, melty roofs, extra limbs)
   - Composition leaves left 40% relatively unobstructed
   - Lighting matches hero mood
   - House style matches region

5. Pick the highest-scoring candidate, copy to `hero-final.png`.

6. If no candidate scores >= 0.75 across all five criteria, halt and ask
   the user to either:
   - Run `/stage9 --reroll` to regenerate (counts toward a max of 3 rerolls)
   - Manually pick a candidate and run `/stage9 --pick=N`
   - Drop a real photograph instead at `client-data/[client]/hero-image/hero-final.png`
     and run `/stage9 --use-manual` to skip generation

7. Update `logs/[client]/build-log.md`:

```
## Stage 9, Hero image
Status: complete
Candidates generated: 4
Selected: candidate-N (score 0.XX)
Output: client-data/[client]/hero-image/hero-final.png
```

8. Update `logs/[client]/pipeline-state.json`:
```json
{ "stage_9": "complete" }
```

Stage 10.1 (build-agent) auto-fires.

## FAILURE HANDLING

| Failure | Action |
|---------|--------|
| Logo missing | Halt, write MANUAL-DROP-NEEDED.md |
| Nano Banana MCP error | Retry once. If second attempt fails, halt with error. |
| All 4 candidates score < 0.75 | Halt, prompt user (reroll / pick / manual) |
| Reroll cap exceeded | Halt, require user decision |
| Logo unrecognizable in output | Score that candidate 0 on legibility, pick from rest |

## WHAT THIS AGENT NEVER DOES

- Generate without the client logo attached (logo is non-negotiable)
- Use stock photo aesthetics
- Place the truck or owner where they cover the left 40% of the frame
- Modify the logo itself (no recoloring, no stylizing, no simplification)
- Use a different region than `brand-dna.region` says
- Skip Phase 5 scoring (every candidate must be evaluated)
- Auto-pick a candidate scoring < 0.75 without user approval
