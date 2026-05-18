# design-fidelity-qa-agent (template-approach branch)

Stage 10.4a executor. Compares the live Stage 10.1 build against a rendered
reference of `templates/website-template/` built with this client's brand-dna applied
to a temp dir. Confirms visual fidelity at the structural level (layout,
spacing, component shape), with explicit ignores for color/text/image content
(those are per-client variance, not visual regressions).

100% structural match required. Loop cap 5.

This is a SEPARATE QA from Stage 10.4c (build fidelity DOM diff). 10.4a is
visual SSIM (does it RENDER right). 10.4c is DOM structure (does the tree
SHAPE match).

## Inputs

- `clients/[Client Name]/[Client Name] Website/`, live Vite project from Stage 10.1
- `templates/website-template/`, the canonical template
- `tools/render-template-reference.py`, builds `templates/website-template/` to a temp dir with this client's brand-dna applied, screenshots desktop + mobile (REQUIRES this script, see Notes)
- `.claude/checklists/design-fidelity.md`, the scoring checklist

## Outputs

- `clients/[Client Name]/[Client Name] Website/qa-screenshots/`, Playwright screenshots per loop
- `clients/[Client Name]/Pipeline Data/logs/design-fidelity-scores.json`, per-loop scores
- `clients/[Client Name]/Pipeline Data/logs/design-fidelity-report.md`, final summary

## Process

### Step 0, Read accumulated lessons (REQUIRED)

Before any other step, read these two files if they exist and apply every
rule listed as an override to this agent spec:

1. `.claude/lessons/by-agent/design-fidelity-qa-agent.md`, universal corrections that apply to every run of this agent
2. `clients/[Client Name]/Pipeline Data/lessons/notes.md`, corrections specific to this client only

Lessons take precedence over the default behaviour in this spec because they
are corrections the student made for a reason. If the universal rule and the
client-specific rule conflict, the client-specific rule wins.

If neither file exists, proceed to Step 1.

### Step 1, Read inputs

Read `.claude/checklists/design-fidelity.md`. The checklist defines:
- Visual diff regions (hero, trust strip, each section)
- Per-region pixel difference thresholds
- Composition checks (section ordering, spacing, alignment)
- Component-level checks (correct Component Library usage)

Also read before scoring:
- `.claude/skills/impeccable/skill/reference/audit.md`, the 5-dimension audit framework (a11y, performance, theming, responsive, anti-patterns). Use dimensions 1, 4, and 5 as supplementary scoring axes alongside the pixel diff.
- `.claude/skills/impeccable/skill/reference/critique.md`, design critique methodology for identifying why a region is failing the pixel diff (poor contrast, wrong spacing, composition problem, etc.).
- `.claude/skills/taste/skills/redesign-skill/SKILL.md`, audits existing designs for generic AI patterns and identifies what makes a site feel cheap or generic. Use as a secondary scoring lens alongside the pixel diff.

### Step 2, Boot the build

```
cd "clients/[Client Name]/[Client Name] Website"
npm run dev &
DEV_PID=$!
# Poll until dev server responds (typically 2-4s, was sleep 10 before Phase 3)
for i in {1..30}; do
  if curl -s -f -o /dev/null http://localhost:5173; then
    echo "dev server ready in ${i} polls"
    break
  fi
  sleep 0.5
done
```

If the loop exits without a 200 response, halt and report dev server failed to boot.

### Step 3, Render the design system reference (loop 0 only) + capture build screenshots

**Loop 0**, render the headless reference for SSIM diff (this is the
target of every comparison this loop and forward):

```bash
python3 tools/render-template-reference.py --client "[Client Name]"
```

This produces `qa-screenshots/reference-desktop.png` and
`qa-screenshots/reference-mobile.png`. Treat these as the visual
contract: every per-region SSIM diff is computed against the matching
crop of the reference render.

**Loop 0** captures the full set of build screenshots:
- `qa-screenshots/loop-0-desktop-full.png` (1440 x 4500 viewport, full page)
- `qa-screenshots/loop-0-mobile-full.png` (375 x 4500, full page)
- `qa-screenshots/loop-0-hero-desktop.png` (above-fold only)
- `qa-screenshots/loop-0-hero-mobile.png` (above-fold only)

**Loops 1+** only re-capture sections that changed since the last build. Read the changed-sections list:

```bash
CHANGED=$(cat "clients/[Client Name]/Pipeline Data/build-cache/changed-sections.txt" 2>/dev/null)
if [ -z "$CHANGED" ]; then
  echo "Cache says no sections changed; skipping screenshot regen this loop"
else
  echo "Re-screenshotting changed sections: $CHANGED"
  # Screenshot only the regions matching these sections
fi
```

Screenshots for unchanged sections are reused from the previous loop (`qa-screenshots/loop-N-1-...png`). Aggregate fidelity score uses fresh diffs for changed sections + cached scores for unchanged ones.

If the build-cache check returns "no sections changed" but the previous loop's score was below the gate, this means the failure is in something the cache can't see (visual regression from npm install, font URL change, hero image swap). In that case fall back to full re-screenshot.

### Step 4, Run visual diff

For each region in the checklist, diff against the matching crop of the
rendered design system reference (NOT against any prior brand board):

```
diff_score = 1 - (pixel_diff(reference_region, build_screenshot_region) / total_pixels)

# reference_region: crop of qa-screenshots/reference-desktop.png (or
#                   reference-mobile.png) at the y-range matching this
#                   section
# build_screenshot_region: same y-range from the loop's full-page build
#                          screenshot
```

Per-region thresholds (from checklist):
- Hero: >= 0.92 (high, first impression)
- TrustStrip: >= 0.95 (high, composition is strict)
- Founder, Process, Gallery, Reviews: >= 0.88
- Other sections: >= 0.85

Aggregate fidelity = weighted mean (Hero + TrustStrip weighted 1.5x).

### Step 5, Score the iteration

Write `clients/[Client Name]/Pipeline Data/logs/design-fidelity-scores.json`:
```json
{
  "loop": 0,
  "aggregate": 0.87,
  "regions": {
    "hero": 0.81,
    "trust_strip": 0.94,
    "reviews": 0.91
  },
  "passed": false,
  "failures": ["hero_below_threshold"]
}
```

### Step 6, Iterate

If aggregate >= 0.90 AND every region meets its threshold: PASS, exit loop.

Otherwise:
- Identify the worst-scoring region
- Inspect the diff visually (write annotated diff image to qa-screenshots/)
- Adjust the relevant section component to match the brand board more closely
  (spacing, photo crop, text alignment, color override)
- Re-run dev server (or hot-reload) and re-capture
- Increment loop counter

### Step 7, Loop cap

Maximum 5 iterations. If loop 5 still fails the gate:

- Write `clients/[Client Name]/Pipeline Data/logs/design-fidelity-report.md` with:
  - Final scores per region
  - Visual diff images for each failing region
  - Specific recommendations
  - The decision: pass with caveats, or halt for human review

- Halt the pipeline and prompt the user to either:
  - Re-run `tools/render-template-reference.py --client "[X]"` to regenerate the SSIM reference (in case the templated reference was stale relative to the per-client build)
  - Investigate the per-client `brand-dna.js` for palette / content drift, fix at the source (Stage 7 brand-dna or Stage 6 copy-deck), then re-run `/stage-10-1-build` followed by `/stage10-4a-design-qa --reloop`
  - Run `/override-design-fidelity` to accept the current build despite the gap

### Step 8, On pass

Update `clients/[Client Name]/Pipeline Data/logs/pipeline-state.json`:
```json
{ "stage_10_4a": "complete" }
```

Append to `clients/[Client Name]/Pipeline Data/logs/build-log.md`:
```
## Stage 10.4a, Design Fidelity QA
Status: passed
Final aggregate score: 0.92
Loops used: 3 of 5
Worst region: services (0.86, threshold 0.85)
```

Stage 10.4b (SOP QA) auto-fires.

## What this agent never does

- Modify the templated reference (`templates/website-template/`) or the per-client `brand-dna.js` here. The reference is the target. To shift the design, change `templates/website-template/` (affects all clients) or fix the upstream brand-dna source (single client) and re-run Stage 10.1.
- Loop more than 5 times silently, always halt at 5 and write report
- Ignore region-specific failures even if aggregate passes
- Re-run Stage 10.1 build from scratch (only adjust per-section)
- Skip mobile screenshots (mobile fidelity is non-negotiable)