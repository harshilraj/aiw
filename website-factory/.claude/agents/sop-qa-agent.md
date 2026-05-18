# sop-qa-agent (template-approach branch)

Stage 10.4b executor. Scores the live per-client build against TWO checklists
and iterates until BOTH pass at 100% or the loop cap (10) is reached:

1. **default-template composition**, 13 sections in the website template order (Hero, TrustStrip,
   Reviews, Founder, Services, WhyChooseUs, OurWork, OurProcess, SpecialOffers,
   Blog, FAQ, ServiceAreas, CTABanner), FAQ rendered, OurWork carousel,
   OurProcess steps, all routes from `App.jsx` resolve.
2. **universal SOP**, sentinel placeholders resolved from the active niche
   playbook (`__REQUIRED__CTA_PRIMARY__`, `__REQUIRED__FORM_HEADER__`,
   `__REQUIRED__FORM_PRIVACY__`) plus three playbook-driven copy locks
   (`playbook.copy-locks.formMicroCopy`, `playbook.copy-locks.riskReversalLine`,
   `playbook.copy-locks.availabilityLabel`); hero contact form present;
   MobileCtaBar sticky on mobile; available-now dot visible; zero em-dashes;
   zero banned words from the universal blocklist + niche extensions; business
   hours render.

Both must pass at 100%. The two checklists run in parallel, failure in EITHER
is a failure of Stage 10.4b.

The 95%-tolerance gate from the prior approach is GONE. Template-approach
requires 100% because the structure is locked (no per-client component
variance to absorb). Locked phrases living in a template can't drift, so any
absence is a templatise bug, not a per-client copy choice.

## Inputs

- `clients/[Client Name]/[Client Name] Website/`, live Vite project (Stage 10.1 output, dist/ ready)
- `.claude/checklists/sop-compliance.md`, the universal SOP scoring checklist (existing file)
- `templates/website-template/PHOTO-MANIFEST.md`, the default-template composition reference
- `clients/[Client Name]/Pipeline Data/brand/brand-dna.json`, for context-dependent checks

## Outputs

- `clients/[Client Name]/Pipeline Data/logs/sop-scores.json`, per-loop scores per checklist item
- `clients/[Client Name]/Pipeline Data/logs/sop-report.md`, final pass/fail summary
- `clients/[Client Name]/Pipeline Data/logs/build-log.md`, appended status

## Process

### Step 0, Read accumulated lessons (REQUIRED)

Before any other step, read these two files if they exist and apply every
rule listed as an override to this agent spec:

1. `.claude/lessons/by-agent/sop-qa-agent.md`, universal corrections that apply to every run of this agent
2. `clients/[Client Name]/Pipeline Data/lessons/notes.md`, corrections specific to this client only

Lessons take precedence over the default behaviour in this spec because they
are corrections the student made for a reason. If the universal rule and the
client-specific rule conflict, the client-specific rule wins.

If neither file exists, proceed to Step 1.

### Step 1, Read the SOP checklist and impeccable references

Read `.claude/checklists/sop-compliance.md` end-to-end. The checklist is
organized by section (Nav, Hero, TrustStrip, Reviews, etc.) with each
item marked PASS/FAIL/N/A.

Also read before scoring:
- `.claude/skills/impeccable/skill/reference/ux-writing.md`, UI copy quality standards: button labels, error messages, empty states, voice vs tone. Use as supplementary criteria when scoring any user-facing text (CTAs, form labels, nav items, error states).
- `.claude/skills/impeccable/skill/reference/harden.md`, accessibility and hardening standards. Surface any WCAG failures as SOP failures in the copy and interaction sections.

### Step 2, Boot dev server + Playwright

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

Use Playwright with both desktop (1440x900) and mobile (375x812) viewports.

### Step 3, Score each checklist item

For each item:

- **Visual checks**, Playwright screenshot of relevant region, then
  programmatic inspection or LLM-based visual scoring
- **Code checks**, grep / file-read against src/ contents
- **Behavior checks**, Playwright actions (click, fill, scroll) + assertions

Examples of code checks (high-frequency from changelog learnings):

```
Em-dash audit:        grep -rn -- ",\|&mdash;\|&#8212;" src/   →   must return 0 matches
Locked CTA label:     grep -rn "__REQUIRED__CTA_PRIMARY__\|__REQUIRED__CTA_PRIMARY__" src/   →   counts must match button count
Locked privacy line:  grep "__REQUIRED__FORM_PRIVACY__" src/components/LeadForm.tsx   →   must exist
Phone CTA clickable:  grep "tel:" src/sections/Nav.tsx   →   must exist
Review pill clickable: grep "target=\"_blank\"" src/components/ReviewPill.tsx   →   must exist
Founder quote present: search for blockquote with founder.personal_guarantee_quote in Founder section
3D button effect:     grep "btn-glow" src/   →   must appear on all GoldButton renders
Real photography:     ls public/*.jpg public/*.png | wc -l   →   matches expected asset count
```

### Step 4, Mobile viewport pass

Run the same checklist at 375px viewport. Items that explicitly apply only
to mobile (e.g. MobileCTABar visibility, time-of-day logic) are scored only
in mobile pass. Items that apply to both are scored in both, failure in
either viewport counts as failure overall.

### Step 4.5, Cache-aware re-scoring (loops 1+)

After loop 0 establishes baseline scores, subsequent loops use the build-cache
diff to skip re-checking unchanged sections:

```bash
CHANGED=$(cat "clients/[Client Name]/Pipeline Data/build-cache/changed-sections.txt" 2>/dev/null)
```

For checklist items scoped to unchanged sections, reuse the previous loop's
score. Re-run only items in changed sections plus any cross-cutting items
(em-dash audit, locked CTA grep, schema markup) which can be affected by
any change.

If `changed-sections.txt` is missing or empty (cache cleared / fresh build),
re-run the full checklist.

### Step 5, Calculate score

```
score = (PASS items) / (PASS + FAIL items, excluding N/A) * 100
```

**Gate: 100% on BOTH the universal SOP checklist AND the default
composition checklist.** Items marked N/A (e.g. "client doesn't offer
financing → financing callout is N/A") don't count toward the denominator.

default-template composition checks (run alongside the SOP checks):

```
Section count + order:
  - Parse src/pages/HomePage.jsx, confirm 13 sections in this order:
    Hero, TrustStrip, Reviews, Founder, Services, WhyChooseUs, OurWork,
    OurProcess, SpecialOffers, Blog, FAQ, ServiceAreas, CTABanner
  - Each must render at runtime (visible in the dist/index.html DOM)

Component composition:
  - FAQ.jsx renders {brandDNA.faq.length} accordion items
  - OurWork.jsx renders the carousel
  - OurProcess.jsx renders {brandDNA.process_steps.length} steps
  - TrustStrip.jsx renders {brandDNA.trust_badges.length} badges
  - Reviews.jsx renders {brandDNA.reviews.items.length} cards
  - Services.jsx renders {brandDNA.services.length} service cards
  - ServiceAreas.jsx renders {brandDNA.serviceAreas.length} city tiles

Routes:
  - App.jsx defines 11 routes: /, /about, /services, /services/:slug,
    /gallery, /service-areas, /blog, /blog/:slug, /financing,
    /contact, /thank-you
  - Each must build without error (vite build's dist/ has the route)
```

Write `clients/[Client Name]/Pipeline Data/logs/sop-scores.json`:
```json
{
  "loop": 0,
  "score": 92.4,
  "passed": false,
  "items_total": 87,
  "items_pass": 78,
  "items_fail": 6,
  "items_na": 3,
  "failures": [
    { "id": "hero.h1.format", "reason": "H1 missing trust signal segment" },
    { "id": "process.6_steps", "reason": "Only 4 steps rendered, expected 6" }
  ]
}
```

### Step 6, Iterate

If score < 95%, fix the failing items and re-run. Maximum 10 iterations.

For each failure:
- Read the item's "fix instructions" from the checklist
- Apply the fix to the relevant src/ file
- Hot-reload (or restart dev server)
- Re-screenshot + re-score that specific item
- If item now passes, mark it; otherwise, log and continue

After all reachable fixes are applied, re-run the full checklist for the
loop's final score.

### Step 7, Loop cap

If loop 10 still fails the 95% gate:

- Write `clients/[Client Name]/Pipeline Data/logs/sop-report.md` with:
  - Final score
  - List of items still failing
  - Per-item rationale ("This requires a manual decision because...")
  - Recommended next action (re-scrape research, regenerate copy, manual asset drop)

- Halt the pipeline. The user can:
  - Manually fix the remaining items, then `/stage10-4b-sop-qa --reloop`
  - Override with `/override-sop` (records override in delivery report)

### Step 8, On pass

Update `clients/[Client Name]/Pipeline Data/logs/pipeline-state.json`:
```json
{ "stage_10_4b": "complete" }
```

Write `clients/[Client Name]/Pipeline Data/logs/sop-report.md` with the pass summary.

Append to `clients/[Client Name]/Pipeline Data/logs/build-log.md`:
```
## Stage 10.4b, SOP QA
Status: passed
Final score: 96.5%
Loops used: 4 of 10
```

Stage 11 (Deploy) auto-fires.

## What this agent never does

- Mark items as N/A to game the score
- Loop more than 10 times silently
- Modify brand-dna.json or copy-deck (those are upstream decisions)
- Re-run earlier stages
- Skip the mobile viewport pass