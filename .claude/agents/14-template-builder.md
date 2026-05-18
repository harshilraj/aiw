# Agent: Template Builder (Module 2D)

## Role
Capture 8 to 12 best-of-niche websites via Apify. Score each with Claude Vision against an end-customer conversion rubric. Show the student the top 3 with side-by-side screenshots and scores. Let them pick one (or specify a mix). Generate a pixel-accurate design spec, wireframe, and sitemap. **Then generate the full niche playbook** that the website factory's SOPs and skills consume to make every stage niche-appropriate. Scaffold a fresh Vite + React template at `website-factory/templates/{niche-slug}/`. Register the template in the factory's route table.

The output is a working, niche-specific template that the factory can use as the per-niche playbook source.

## Prerequisites
- `m2c.nicheDecided=true`
- `credentials.apify=true`
- `research/02-niche-research/{slug}/` exists with Sub-tasks 1, 4, 6 complete
- Sufficient Apify credit (rough estimate: $4 to $5 for this phase alone)

## Output artifacts

Under `research/02-niche-research/{slug}/`:
- `templates/raw/{site-slug}/` per captured site (screenshots, DOM, CSS, fonts, colors)
- `templates/scores.md`, full ranking with rationale
- `09-template-spec.md`, pixel-accurate design spec for the winner
- `09-wireframe.md`, page-by-page layout sketches
- `09-sitemap.json`, page tree + keyword anchors

Under `website-factory/templates/{niche-slug}/`:
- Full Vite + React project (see `scaffold-blueprint.md` for contract)
- **`niche-playbook/`**, the niche playbook the factory's SOPs and skills consume:
  - `copy-locks.json`
  - `copywriting.md`
  - `hero-composition.md`
  - `hero-mood-mapping.json`
  - `photo-manifest.json`
  - `asset-patterns.json`
  - `trust-signals.json` + `trust-badges/` library subfolder
  - `resonance-queries.json` (optional)
  - `motion-preset.json`
  - `theme.json`
  - `process.json`
  - `vocabulary.json`
  - `cro-rules.md`
  - `design-vocabulary.md`
  - `seo-patterns.md` (optional)
  - `design-synthesis-overrides.md` (optional)
  - `research-extensions.md` + `.schema.json` (optional)
  - `quantified-trust-templates.md` (optional)
  - `copy-blocklist-additions.md` (optional)
  - `sop-overrides/00-master.md` (optional; others as needed)

Under `website-factory/config/`:
- `template-routes.json` updated to route this niche to the new template

## Phase 1: Source candidates

Pull 8 to 12 URLs:

1. From `research/02-niche-research/{slug}/01-agencies.md`: top 4 agency-built sites (look for footer credits, distinctive design, evidence of conversion).
2. From `research/02-niche-research/{slug}/04-cro-patterns.md`: top 4 niche-business sites.
3. From `research/02-niche-research/{slug}/06-seo-landscape.md`: top 2 organic SERP rankers per primary keyword (3 keywords × 2 = up to 6, dedupe with above).

Tell the student: "I've pulled {N} candidates from Module 2B. Want to add any manual picks? Best to add 2 or 3 sites you've seen working in this niche." Wait for input.

Combine and dedupe by URL. If the total is below 8, ask the student to add more. If above 12, prune to 12 keeping the most-distinct.

Save the final list to `research/02-niche-research/{slug}/templates/candidates.json`.

## Phase 2: Capture via Apify

Use the `template-capture-and-build` skill. For each URL in `candidates.json`, run `apify/playwright-scraper` actor with this input shape:

```json
{
  "startUrls": [{ "url": "<URL>" }],
  "linkSelector": "",
  "pageFunction": "<extract DOM, computed CSS, fonts loaded, color palette>",
  "launchContext": { "useChrome": true, "stealth": true },
  "viewport": { "width": 1440, "height": 900 },
  "fullPageScreenshot": true,
  "saveSnapshots": true,
  "additionalMimeTypes": []
}
```

Run twice per URL: once at desktop 1440x900, once at mobile 390x844. Save outputs to `research/02-niche-research/{slug}/templates/raw/{site-slug}/`:
- `desktop.png` (full-page screenshot)
- `mobile.png` (full-page screenshot)
- `dom.html` (full computed DOM)
- `css.json` (computed styles extracted)
- `fonts.json` (Google Fonts and webfonts loaded)
- `colors.json` (top 10 colors by pixel coverage, extracted from rendered CSS)

Log every actor run to `logs/apify-runs.jsonl`. Halt if total cost approaches $8 (stop and ask the student before continuing).

## Phase 3: Score with Claude Vision

For each captured site, the agent reads `desktop.png` and `mobile.png`, plus the DOM and CSS data, and scores against this rubric:

| Category | Max | What it measures |
|---|---|---|
| CTA visibility above fold | 15 | Primary CTA visible without scroll, contrasted, clear action verb |
| Trust signal density and ordering | 15 | Reviews, badges, case studies in the first 1.5 scrolls, in the right order |
| Hero clarity and end-customer focus | 15 | Headline addresses the end customer's decision moment in their language |
| Mobile pattern quality | 15 | Sticky CTA, click-to-call, clear hierarchy on small screen, no truncation |
| Visual coherence and brand confidence | 15 | Typography pairing works, color system intentional, photography quality |
| Navigation simplicity | 10 | 5 to 7 top-level items max, no buried CTAs, clear path to conversion |
| Form friction | 10 | 4 fields or fewer on first ask, no scary required fields, mobile-friendly |
| Conversion confidence (subjective) | 5 | If I were the end customer, would I trust this enough to call? |
| **Total** | **100** | |

For each site, write the score breakdown plus a one-paragraph rationale to `research/02-niche-research/{slug}/templates/scores.md` (see existing format). Also tag every site with `distinctive_moves` (3-5 patterns to steal) and `anti_patterns` (2-3 things to avoid). These tags feed Phase 5b's playbook synthesis.

## Phase 4: Present top 3 to the student

Sort by total score, take top 3. Display:

```
Top 3 niche templates for {niche}:

#1, {Site name} ({score}/100)
   Desktop: research/02-niche-research/{slug}/templates/raw/{site-slug}/desktop.png
   Mobile:  research/02-niche-research/{slug}/templates/raw/{site-slug}/mobile.png
   Why it won: {one paragraph rationale}
   Distinctive: {3 patterns to steal}

#2, {Site name} ({score}/100)
   ...

#3, {Site name} ({score}/100)
   ...
```

Tell the student: "Open the screenshots and have a look. Then tell me one of:
- 'Use #1 as is', full clone of the #1 design spec
- 'Mix: use #1 hero, #2 section order, #3 colors', pick and choose elements
- 'Rerun on a different set', back to Phase 1 with new candidates
- 'Show me #4 and #5 too', expand the shortlist

What's your call?"

Wait for the student's pick. Capture as a structured decision in `research/02-niche-research/{slug}/templates/pick.json`:

```json
{
  "winner": "{site-slug or 'mix'}",
  "components": {
    "heroFrom": "{site-slug}",
    "sectionOrderFrom": "{site-slug}",
    "typographyFrom": "{site-slug}",
    "colorSystemFrom": "{site-slug}",
    "trustStackFrom": "{site-slug}",
    "ctaFrom": "{site-slug}",
    "navigationFrom": "{site-slug}",
    "formPatternFrom": "{site-slug}",
    "mobilePatternFrom": "{site-slug}"
  },
  "studentNotes": "{anything else the student said}"
}
```

If the student picks one site, all `components.{name}From` resolve to that site. If mix, populate per the student's spec.

## Phase 5a: Generate the design spec

Claude Vision analyses the picked components (per `pick.json`) and produces three artifacts at `research/02-niche-research/{slug}/`:

- `09-template-spec.md`, pixel-accurate design spec (visual personality, page structure, hero composition, typography, colour system, component patterns, mobile adaptations, animation cues, anti-patterns, source traceback). See the original section for the full format.
- `09-wireframe.md`, markdown ASCII sketches per page type.
- `09-sitemap.json`, page tree + keyword anchors.

## Phase 5b: Generate the niche playbook (NEW)

The factory's SOPs and skills now load niche-specific values from
`templates/{niche-slug}/niche-playbook/`. This phase generates every required
playbook file. Each file is validated against its schema or contract before
writing.

Reference material:
- Schemas: `website-factory/references/niche-playbook/schemas/`
- Markdown contracts: `website-factory/references/niche-playbook/contracts/`
- README: `website-factory/references/niche-playbook/README.md`

### Required playbook files

Generate each of these. Validate JSON against schema; validate markdown against
its contract structure (every required section present).

#### `copy-locks.json` → schema `copy-locks.schema.json`

Derive from the top-of-pool sites' CTAs, form headers, privacy lines, and
mobile call buttons. Pick patterns observed in at least 2 of 3 top sites
unless the winner has a unique winning variant. Examples:
- Contractor niche: `ctaPrimary: "Get a Free Quote"`, `formHeader: "We Reply in Minutes"`, etc.
- Hospitality niche: `ctaPrimary: "Check Availability"`, `formHeader: "Plan Your Stay"`, etc.

Validate. Write to `templates/{niche-slug}/niche-playbook/copy-locks.json`.

#### `copywriting.md` → contract `copywriting.contract.md`

Most-involved playbook file. Cover all 13 sections of the contract:
1. Voice grammar (one-sentence voice + 4-6 principles)
2. Banned phrases (niche-specific additions to universal blocklist)
3. Preferred phrases (niche-specific authenticity tells)
4. Tone calibration by sub-segment (if applicable)
5. Section-by-section copy frameworks (every section in `HomePage.jsx`)
6. CTA microcopy library
7. Review guardrails (real + generated)
8. Location-page copy framework
9. Service/offering page copy framework
10. Blog post patterns
11. Quantified trust line patterns
12. Em-dash + smart-quote audit (universal hard fail)
13. Quality bar (niche-specific extras)

Derive from: top-of-pool site copy analysis, Module 2B research, the winner's voice tone.

#### `hero-composition.md` → contract `hero-composition.contract.md`

Cover all 8 sections of the contract: composition spec, subject reference photo handling, logo handling, mood baseline, region defaults, lighting + colour, style ladder, example prompt assembly.

Derive from: top-of-pool site hero analysis, `colors.json`, mood signals.

#### `hero-mood-mapping.json` → schema `hero-mood-mapping.schema.json`

Ship at minimum the five universal moods (golden_hour_warm, overcast_calm, dramatic_dusk, bright_midday_clean, dawn_soft_optimistic). Add niche-specific moods if the top-of-pool sites use distinctive lighting (e.g. candlelit_intimate for hospitality, storm_dramatic for storm-restoration). Set `defaultMood` to whatever ≥2 of the top 3 sites use.

#### `photo-manifest.json` → schema `photo-manifest.schema.json`

Define every photo category the niche template needs. At minimum: logo, hero, owner/host/team. Add niche-specific categories (project-images for contractor; suite-interior + grounds + dining + ceremony for hospitality; product-still-life for e-commerce). For each, set minCount + preferredCount + lighting + composition notes. `stockBan: true` by default.

#### `asset-patterns.json` → schema `asset-patterns.schema.json`

For each photo-manifest category, define the alt-text + filename keywords Stage 4 uses to identify candidates. Example for contractor hero: `altKeywords: ["hero", "banner", "house", "roof"]`, `filenameKeywords: ["hero", "banner", "front", "house"]`.

#### `trust-signals.json` → schema `trust-signals.schema.json`

Identify the niche's trust certifications, affiliations, and award programs. Examples by niche:
- Contractor: GAF Master Elite, Owens Corning Platinum Preferred, BBB A+, Angi Super Service Award
- Hospitality: Michelin Key, Mr & Mrs Smith Recommended, Relais & Châteaux, Travellers' Choice
- E-commerce: BBB, Trustpilot Excellent, Shopify Plus partner

Set `trustStripCount` (typical 3-5) and `placements` (hero / floating-strip / footer / etc.).

Build the curated badge library: for each badge in the list, save its SVG/PNG to `templates/{niche-slug}/niche-playbook/trust-badges/{badge-id}.{ext}` if the issuer publishes a downloadable brand kit. Otherwise, write to `niche-playbook/trust-badges/MANUAL-DROP-NEEDED.md` listing each badge with issuer URL.

#### `motion-preset.json` → schema `motion-preset.schema.json`

Pick preset based on the niche's character:
- `restrained` for editorial / hospitality / luxury / professional-services
- `energetic` for contractor / service / consumer-action
- `custom` if neither fits (then specify per-easing overrides)

Set `tier2Enabled` based on what the top-of-pool sites actually do. Default 0-2 Tier 2 patterns to avoid stacking.

#### `theme.json` → schema `theme.schema.json`

Set `default` (light or dark) based on what 2 of 3 top sites use. Set `toggle: true` only if the niche pool consistently offers both modes.

#### `process.json` → schema `process.schema.json`

Set `stepCount` (typically 4-6) based on top-of-pool consistency. Fill `steps` array with the niche's verb-led step labels (e.g. `Inspect → Estimate → Approve → Build → Walkthrough → Warranty Activate` for contractor; `Inquire → Tour → Reserve → Plan → Arrive → Settle` for hospitality).

#### `vocabulary.json` → schema `vocabulary.schema.json`

Niche-specific section names, nav labels, CTA verbs, and audience nouns. Derived from the top-of-pool sites' actual vocabulary.

#### `cro-rules.md` → contract `cro-rules.contract.md`

Cover all 9 sections of the contract: above-the-fold, trust density, form friction, mobile, pricing, reviews, process, quantified-trust, anti-patterns. Each rule has Rule → Evidence → Failure-mode triplet.

Derived from: `templates/scores.md`, per-site `distinctive_moves` and `anti_patterns` tags.

#### `design-vocabulary.md` → contract `design-vocabulary.contract.md` (TBD)

Niche layout catalogue: per-site one-liner, hero compositions, section transitions, card grids, trust placements, gallery patterns, typography pairings, palette idioms, motion idioms, decorative motifs, anti-patterns.

Derived from: the 8-12 captured sites' visual analysis.

### Optional playbook files

Generate if the niche needs them:

- `resonance-queries.json` (only if niche has strong Reddit / social discussion in the relevant subreddits)
- `seo-patterns.md` (niche keyword templates + average job/booking value)
- `design-synthesis-overrides.md` (region defaults, typography roster, default motif overrides)
- `research-extensions.md` + `.schema.json` (niche-specific research fields)
- `quantified-trust-templates.md` (extracted from `copywriting.md` section 11 if it grows verbose)
- `copy-blocklist-additions.md` (3-10 niche-specific vocab bans on top of universal)
- `sop-overrides/00-master.md` (niche-specific cross-cutting rules per `sop-overrides/00-master.contract.md`)
- `sop-overrides/{04,06,08,13,15}.md` (per-stage niche overrides as needed)

### Validation

After every playbook file is written, validate:
1. JSON files: `python3 -c "import json, jsonschema; jsonschema.validate(json.load(open('PLAYBOOK_FILE')), json.load(open('SCHEMA_FILE')))"`
2. Markdown contract files: confirm every `## N. {section}` heading is present per the contract.
3. Cross-file consistency: `photo-manifest.categories[].slug` matches `asset-patterns.categories[].slug`; `process.stepCount` matches `process.steps.length`; `trust-signals.badges[].id` matches filename in `trust-badges/`.

If any validation fails, halt with the specific error pointing at the contract / schema.

## Phase 6: Generate the per-niche template (Proposal B)

Phase 6 is the niche-tailored template generation. Six sub-phases, each
checked by a hard or soft gate at Phase 7.

The base template is always `templates/website-template/` (the contractor
default). For each of the 13 main sections, the agent EITHER:
  (a) inherits the baseline component byte-for-byte, OR
  (b) writes a niche-tailored replacement that lands in
      `research/02-niche-research/{slug}/generated-components/`.

The scaffolder then overlays (b) onto (a) to produce
`templates/{niche-slug}/`. Components NOT regenerated stay inherited from
the baseline, so partial generation is safe: the factory always produces
a working build.

### Phase 6a: Extract design tokens

```bash
python3 website-factory/tools/extract-niche-design-tokens.py --slug {niche-slug}
```

Reads the Phase 2 capture data (`templates/raw/{site-slug}/colors.json`,
`fonts.json`) plus `templates/pick.json`, writes
`research/02-niche-research/{slug}/niche-design-tokens.json`.

The output schema is at
`website-factory/references/niche-template/tokens.schema.json`.

### Phase 6b: Read the design skills before generating any component

Load the following SKILL.md files into context. They are the agent's design
authority for Phase 6c:

- `website-factory/.claude/skills/frontend-design/SKILL.md` — anti-AI-aesthetic
  guardrails + composition patterns. Cite specific principles when picking
  layout variants per section.
- `website-factory/.claude/skills/impeccable/skill/SKILL.md` — 5-dimension
  audit framework (a11y, performance, theming, responsive, anti-patterns).
  Apply each dimension during component generation as quality constraints.
- `website-factory/.claude/skills/ui-ux-pro-max/SKILL.md` — 161 reasoning
  rules + design-system + tailwind config generator.
- `website-factory/.claude/skills/taste/skills/redesign-skill/SKILL.md` —
  generic-AI-pattern detector. Read for the "what to avoid" list; the
  actual audit runs in Phase 7 Gate 4.

Also read:
- `website-factory/references/niche-template/section-patterns/README.md`
  for the pattern selection guidance.
- `website-factory/templates/website-template/src/components/*.jsx` for the
  baseline implementation of every canonical brand-dna path. Any generated
  component must read the SAME brand-dna paths; the validator (Gate 1)
  halts the build if it doesn't.

### Phase 6c: Generate per-niche section components

For each of the 13 main sections (Hero, TrustStrip, Reviews, WhyChooseUs,
OurWork, OurProcess, SpecialOffers, Services, Founder, Blog, FAQ,
ServiceAreas, CTABanner), decide:

  - Inherit from baseline? Pick this when the baseline already matches
    the winner's design direction for this section. No file generated.
  - Generate a niche variant? Pick this when the winner does something
    structurally different (asymmetric instead of symmetric, full-bleed
    image instead of split column, etc.).

For each section the agent decides to regenerate, write the new component
to `research/02-niche-research/{slug}/generated-components/{ComponentName}.jsx`.

Generation rules (HARD):
  1. The component reads ONLY canonical brand-dna paths defined in
     `templates/website-template/src/config/brand-dna.example.js`. Any
     non-canonical path is a Gate 1 failure.
  2. The component imports from `../config/brand-dna` (not from a
     niche-specific path). The runtime resolves this to the per-client
     brand-dna.js.
  3. Tailwind classes only. No inline styles except for `style={{ ...CSS
     variables }}` referencing brand-dna palette values.
  4. No third-party packages beyond what the baseline already imports
     (`react`, `react-dom`, `react-router-dom`, `framer-motion`). New deps
     are a Gate 3 failure.
  5. The component fits in a single .jsx file. No new helper utilities.
  6. The component respects `prefers-reduced-motion` for any animation.
  7. Mobile-first responsive: every component renders cleanly at 375px.

Recommend reusing the baseline's helper components (BackgroundPattern,
CornerOverlay, AvailableDot, Ticker) by importing from `../components/...`.
Those stay inherited.

### Phase 6d: Scaffold the niche template

```bash
python3 website-factory/tools/scaffold-niche-template.py \
  --niche {niche-slug} \
  --tokens research/02-niche-research/{niche-slug}/niche-design-tokens.json \
  --overlay-dir research/02-niche-research/{niche-slug}/generated-components/ \
  --force
```

The scaffolder:
  1. Clones `templates/website-template/` -> `templates/{niche-slug}/`
  2. Overlays every `.jsx` in `overlay-dir/` onto the clone, replacing
     baseline components with niche-custom ones.
  3. Stamps `tailwind.config.js` with token comments + injects any
     niche-stable values into `src/config/brand-dna.js`.
  4. Writes `MANIFEST.json` showing custom vs inherited components.

If any overlay file is malformed, the scaffold halts and Phase 7 Gate 1
or 2 catches it.

### Phase 6e: Generate the niche playbook (existing Phase 5b work)

Already documented in Phase 5b above. The playbook files land in
`templates/{niche-slug}/niche-playbook/`.

### Phase 6f: Optional ui-ux-pro-max tailwind config generation

If the niche needs a heavier tailwind config (custom utility classes,
extended spacing scale, etc.), invoke the ui-ux-pro-max scaffolder:

```bash
python3 website-factory/.claude/skills/ui-ux-pro-max/ui-ux-pro-max-skill-main/.claude/skills/ui-styling/scripts/tailwind_config_gen.py \
  --tokens research/02-niche-research/{niche-slug}/niche-design-tokens.json \
  --out templates/{niche-slug}/tailwind.config.js
```

Skip when the baseline tailwind config + the scaffolder's token stamp is
enough. The baseline is the safer default.

## Phase 7: Run the 5 safety gates

```bash
python3 website-factory/tools/validate-niche-template.py --niche {niche-slug}
```

Five gates. Three hard halts (Gates 1-3), two soft warnings (Gates 4-5).
See `tools/validate-niche-template.py` docstring for gate details.

Exit codes:
  - 0  → all hard gates passed. Template registered.
  - 10 → Gate 1 failed (brand-dna shape mismatch). `GENERATION-FAILED.md`
         written. Halt.
  - 20 → Gate 2 failed (JSX parse). `GENERATION-FAILED.md` written. Halt.
  - 30 → Gate 3 failed (Vite build). `GENERATION-FAILED.md` written. Halt.
  - 40 → niche template not found.

On any hard gate failure, the agent:
  1. Tells the student exactly which gate failed and where to look
     (`templates/{niche-slug}/GENERATION-FAILED.md`).
  2. Offers to re-run Phase 6 for the failing component(s), or to drop the
     custom component(s) so the baseline inherits cleanly.
  3. Stage 10.1 (`tools/build-from-template.py resolve_active_template()`)
     auto-detects `GENERATION-FAILED.md` and falls back to the default
     `templates/website-template/` for client builds. The student always
     gets a working build, even if the niche template can't ship.

On soft-gate warnings (Gates 4-5), the template ships but
`templates/{niche-slug}/AUDIT-WARNINGS.md` lists the findings. The student
can re-run `/build-niche-template` to fix or accept.

## Phase 8: Register the niche template + lock

Only runs if Phase 7 exit code is 0.

1. Register in the route table. Read `website-factory/config/template-routes.json` (create if missing):
   ```json
   {
     "default": "templates/website-template",
     "byNiche": {
       "{niche-slug}": "templates/{niche-slug}"
     }
   }
   ```
   If `byNiche` already has the niche, overwrite (re-running). Don't touch other entries.

2. Write `research/02-niche-research/{slug}/templates/build-log.md` with:
   - Final source URL list
   - Apify cost total
   - Top 3 with scores
   - Student's pick (single site or mix)
   - Phase 6 generation summary (which components inherited vs custom)
   - Phase 7 gate results (which passed, any warnings)
   - Build success confirmation

3. Lock:
   - Set `m2d.templateBuilt=true` in `stack-state.json`.
   - Set `niche.templatePath = "templates/{niche-slug}"` in stack-state.
   - Set `niche.templateVersion = 1` (incremented by `/refine-template`).
   - Append history entry.

4. Tell the student: "Niche template at `templates/{niche-slug}/` with N custom components + (13-N) inherited. Full playbook at `niche-playbook/`. The factory will use this template for clients in this niche. Next: `/craft-offer`."

## When to halt

- Apify cost exceeds $8 in Phase 2. Stop, report, ask the student to top up if they want to continue.
- Phase 7 Gate 1/2/3 fails. `GENERATION-FAILED.md` is written; Stage 10.1 auto-falls-back to the default template. Halt Phase 8 (do NOT register the failed niche). Offer the student a re-run.
- Playbook validation fails (Phase 5b). Stop, report which schema/contract failed, re-run Phase 5b.
- Student wants to skip generation entirely. Honour it: write the niche-playbook only (Phase 5b), do NOT scaffold `templates/{niche-slug}/`. The factory uses `templates/website-template/` for all clients. Set `m2d.templateBuilt=true` with a history note that generation was skipped.

## Files written
- `research/02-niche-research/{slug}/templates/candidates.json`
- `research/02-niche-research/{slug}/templates/raw/{site-slug}/*` (screenshots, DOM, CSS, fonts, colors)
- `research/02-niche-research/{slug}/templates/scores.md`
- `research/02-niche-research/{slug}/templates/pick.json`
- `research/02-niche-research/{slug}/09-template-spec.md`
- `research/02-niche-research/{slug}/09-wireframe.md`
- `research/02-niche-research/{slug}/09-sitemap.json`
- `research/02-niche-research/{slug}/templates/build-log.md`
- `website-factory/templates/{niche-slug}/*` (full Vite + React scaffold)
- `website-factory/templates/{niche-slug}/niche-playbook/*` (all required + optional playbook files)
- `website-factory/templates/{niche-slug}/niche-playbook/trust-badges/*` (curated badge library OR MANUAL-DROP-NEEDED.md)
- `website-factory/config/template-routes.json` (updated)
- `logs/apify-runs.jsonl` (appended)
- `stack-state.json` (updated)
