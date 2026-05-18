# CLAUDE.md, {{AGENCY_NAME}} Pipeline (template-approach branch)

This file is the master configuration for the automated niche-aware website
production pipeline. Claude Code reads this file when invoked in the
project directory to understand the pipeline architecture, available
agents, commands, skills, and gates.

The website-template baked into this factory is a contractor / home-services
default. Per-niche overrides come from `templates/{niche-slug}/niche-playbook/`,
which Module 2D (`/build-niche-template` in the parent stack) generates per
niche. For non-contractor niches, the playbook supplies the niche-specific
trust signals, copy locks, process steps, hero composition, and segment
vocabulary that the SOPs and checklists below reference.

This branch is `template-approach`. The prior approach ("design-human-in-the-loop")
branch generated a fresh Next.js project per client with a Claude-designed
component library at Stage 8. That approach is gone. Per-client builds now
clone `templates/website-template/` (a refactored fork of `{{REFERENCE_TEMPLATE_REPO}}`)
and overlay a per-client `brand-dna.js` + asset swap.

---

## Pipeline overview

13-stage deterministic pipeline that produces a complete client website
(tuned to the active niche template) from intake through delivery. Each
stage has gate-locked entry/exit criteria; no stage proceeds until the
prior one passes its gate.

```
Stage 1,  Intake          → clients/[Client Name]/Pipeline Data/intake/
Stage 2,  Research        → clients/[Client Name]/Pipeline Data/research/research.json
Stage 3,  SEO planning    → clients/[Client Name]/Pipeline Data/seo/audit-data.json
Stage 4,  Asset harvest   → clients/[Client Name]/[Client Name] Assets/
Stage 5,  Strategy        → clients/[Client Name]/Pipeline Data/strategy/strategy.json
Stage 6,  Copywriting     → clients/[Client Name]/Pipeline Data/copy/copy-deck.md
Stage 7,  Brand DNA       → clients/[Client Name]/Pipeline Data/brand/brand-dna.json
                             [APPROVAL GATE: /approve-brand-dna if confidence < 0.70]
Stage 7.5,Brand resonance → clients/[Client Name]/Pipeline Data/brand-resonance/resonance.json
                             [OPTIONAL but ACTIVE, Apify (GBP + Facebook + website) +
                              Playwright (screenshots + fonts + DOM vocab) + Pillow
                              (color quantization) + Claude Vision (voice + photo style
                              + theme_mode_recommendation). Skipped gracefully if intake
                              has no website URL or ANTHROPIC_API_KEY is unset.]
Stage 9,  Hero image      → clients/[Client Name]/Pipeline Data/hero-image/
                             hero-final-desktop.png + hero-final-mobile.png
                             (BOTH variants required; runs BEFORE Stage 10.1)
Stage 10, Build + QA
  10.1,   Build           → clients/[Client Name]/[Client Name] Website/dist/
                             (clone templates/website-template + overlay brand-dna.js
                              + copy + optimise assets + npm run build + validate)
  10.2,   Personalise     → SEO injection, schema markup, sitemap.xml
  10.3,   Uplift          → Optional extras not already in the website template (scoped down)
  10.4a,  Design fidelity → SSIM vs templated reference (structure-only, 100%)
  10.4b,  SOP QA          → BOTH website template composition AND universal SOP, 100%
  10.4c,  Build fidelity  → DOM structural diff vs templates/website-template, 100%
  10.4d,  Perf            → Lighthouse LCP < 3s on desktop AND mobile
Stage 11, Deploy          → clients/[Client Name]/Pipeline Data/deploy/vercel-url.txt
Stage 12, Delivery        → clients/[Client Name]/Pipeline Data/delivery/delivery-report.md
Stage 13, Proposal        → clients/[Client Name]/[Client Name] Proposal/proposal.html
                             + Vercel production deploy to
                             https://[client-slug]-proposal.vercel.app
                             [LAST STAGE, runs after deploy]
```

---

## Architecture decisions

### `templates/website-template/` is the canonical per-client base

After Stages 1-7 + 9 complete, Stage 10.1 (`tools/build-from-template.py`)
clones `templates/website-template/` into `clients/[X]/[X] Website/`, composes
`src/config/brand-dna.js` from upstream pipeline data, copies + optimises
per-client assets via `tools/optimise-image.py`, runs `npm install + npm run build`
(the vite `prebuild` hook `scripts/inject-theme.mjs` rewrites `:root` palette
+ Google Fonts imports + `<html data-theme-mode="...">` from `brand-dna.js`),
then validates `dist/` for `__REQUIRED__` sentinels and forbidden strings.

The website template was derived from `{{REFERENCE_TEMPLATE_REPO_URL}}`
on 2026-05-11. The original {{TEMPLATE_REFERENCE_CLIENT}} site continues to be deployed
at `{{REFERENCE_TEMPLATE_DEPLOY_URL}}` independently.

Per-client variance is locked to:
- **paint**, palette CSS variables (rewritten by `inject-theme.mjs` at prebuild)
- **copy**, every visible string (sourced from `Pipeline Data/copy/copy-deck.md`)
- **photos**, logo, hero (desktop + mobile), owner, projects, team, per-section
- **trust badges**, looked up from `templates/{niche-slug}/niche-playbook/trust-signals.json` against `brand-dna.certifications`
- **theme mode**, `brand-dna.theme_mode` ("light" | "dark", single mode, no toggle)
- **background SVG pattern**, `brand-dna.shape_motif` selects from 13 patterns in `templates/website-template/src/assets/bg-patterns/`

NOTHING ELSE varies. Layout, composition, components LOCKED. Every client
renders the same 13 sections in the same order: Hero, TrustStrip, Reviews,
Founder, Services, WhyChooseUs, OurWork, OurProcess, SpecialOffers, Blog,
FAQ, ServiceAreas, CTABanner.

### No canonical React component library, no per-client React generation

There is NO pre-built React component library beyond `templates/website-template/`.
Stage 10.1 doesn't generate fresh JSX, it CLONES the website template codebase as-is
and overlays brand-dna + assets. Source of truth files at build time:

- `templates/website-template/src/components/*.jsx` and `templates/website-template/src/pages/*.jsx`
 , locked component shapes (do not vary per client)
- `templates/website-template/src/config/brand-dna.js`, per-client config contract
  (sentinel placeholders by default; Stage 10.1 fills it from pipeline data)
- `templates/website-template/PHOTO-MANIFEST.md`, asset path contract
- `clients/[X]/Pipeline Data/copy/copy-deck.md`, every visible string
- `clients/[X]/Pipeline Data/brand/brand-dna.json`, palette + typography + theme_mode + voice_register + shape_motif

### SOPs

Stage SOPs live at `.claude/sops/`. The master blueprint is at
`.claude/sops/00-master-blueprint.md`. Each stage has a corresponding
`NN-[name].sop.md` file. The sop-qa-agent reads them during Stage 10.4b scoring.

The universal SOP locks the sentinel placeholders (`__REQUIRED__CTA_PRIMARY__`,
`__REQUIRED__FORM_HEADER__`, `__REQUIRED__FORM_PRIVACY__`) plus three
niche-driven copy locks supplied by the active niche playbook's
`copy-locks.json`:

- `playbook.copy-locks.formMicroCopy`, the sticky-form micro-copy line
- `playbook.copy-locks.riskReversalLine`, the Process risk-reversal sentence
- `playbook.copy-locks.availabilityLabel`, the nav-phone availability text

The niche playbook supplies the per-niche values; sop-qa-agent verifies them
at 100% on every per-client build.

### Logo is single source, three downstream uses

- **Stage 4** harvests the client logo into `[Client Name] Assets/logo/`
- **Stage 7** reads the logo for color extraction, motif detection (drives `shape_motif`), and theme_mode decision (light/dark from logo brightness)
- **Stage 9** (hero image generation) uploads the logo as a subject consistency reference for the anchor object's branded area
- **Stage 10.1** copies the logo to `public/logo.svg` (or `.png`) in the per-client build

The logo file path lives in `brand-dna.json` and is shared across all four.

### Page section order (website template composition, locked, 13 sections)

```
Nav (Layout) → TopBar → Hero → TrustStrip → Reviews → Founder → Services →
  WhyChooseUs → OurWork → OurProcess → SpecialOffers → Blog → FAQ →
  ServiceAreas → CTABanner → Footer (Layout)
```

Source of truth: `templates/website-template/src/pages/HomePage.jsx`. The 13 main
sections live there in this order; Layout.jsx wraps them with the persistent
TopBar + Navbar header and the persistent Footer + MobileCtaBar.

---

## Agents

Located in `.claude/agents/`:

| Agent | Stage | Purpose |
|-------|-------|---------|
| `00-intake.md` | 1 | Client intake and folder scaffold |
| `01-research.md` | 2 | GBP + social + competitor research, Apify-first via `tools/apify-scrape.py` (google-places, facebook, website, BBB actors) |
| `02-seo-audit.md` | 3 | Local SEO audit and keyword strategy |
| `03-asset-scraper.md` | 4 | Logo + photo + previous-projects + team-photo harvesting |
| `04-strategy.md` | 5 | Business strategy + sitemap.json |
| `05-copy-deck.md` | 6 | Full site copy generation (UNIQUE per client; Stage 10.1 validator fails closed on any the website template string leakage) |
| `brand-dna-agent.md` | 7 | Extract brand DNA. Drops `archetype`. Adds `theme_mode` (light/dark, single mode), `voice_register` (commercial/family/premium), keeps `shape_motif` (drives BackgroundPattern selection). |
| `07-5-brand-resonance.md` | 7.5 | OPTIONAL but ACTIVE old-site visual analysis (Apify + Playwright + Pillow + Claude Vision). Feeds `theme_mode_recommendation` + voice/photo style hints into Stage 7. Graceful skip when no website URL or no `ANTHROPIC_API_KEY`. |
| `08-hero-image.md` | 9 | Nano Banana hero image generation. BOTH desktop AND mobile variants required. |
| `09-build.md` | 10.1 | Clone templates/website-template + overlay brand-dna + asset copy + npm build + validate. |
| `10-personalize.md` | 10.2 | SEO injection + schema markup |
| `11-uplift.md` | 10.3 | Optional extras not already baked into the website template (scoped down vs the prior approach) |
| `design-fidelity-qa-agent.md` | 10.4a | Visual SSIM vs templated reference (structure-only, 100%) |
| `sop-qa-agent.md` | 10.4b | BOTH website template composition AND universal SOP, 100% on each |
| `10-4c-build-fidelity.md` | 10.4c | DOM structural diff via tools/build-fidelity-diff.py |
| `10-4d-perf.md` | 10.4d | Lighthouse LCP < 3s gate |
| `13-deploy.md` | 11 | Vercel production deploy |
| `12-delivery.md` | 12 | Delivery report |
| `14-proposal.md` | 13 | Final HTML proposal generation (last stage) |

---

## Commands

Located in `.claude/commands/`:

| Command | Purpose |
|---------|---------|
| `/build-all` | Run the entire pipeline end-to-end (halts at approval gates) |
| `/stage7` | Brand DNA extraction |
| `/approve-brand-dna` | **APPROVAL GATE**, approve brand DNA after low-confidence extraction |
| `/stage9` | Nano Banana hero image generation (desktop + mobile) |
| `/stage-10-1-build` | Run Stage 10.1 via tools/build-from-template.py |
| `/stage10-4a-design-qa` | Design fidelity QA loop |
| `/stage10-4b-sop-qa` | SOP compliance QA loop (website template composition + universal SOP) |
| `/diagnose-brand-dna` | Inspect brand-dna extraction confidence |
| `/override-design-fidelity` | Accept current build despite QA gap |
| `/override-sop` | Accept current build despite SOP gap |
| `/lesson "<correction>"` | **LEARNING LOOP**, capture a correction into the lessons ledger |
| `/lessons` | Print accumulated rules per agent + pending review queue |

---

## Self-improvement system (lessons ledger)

The pipeline learns from corrections. When the student corrects an output or
direction, he runs `/lesson "<correction>"`. The lesson is parsed into a
structured entry, appended to `.claude/lessons/ledger.jsonl`, and queued
in `.claude/lessons/pending-review.md` until distilled.

**Auto-load mechanism.** Every agent's first step is `Step 0, Read accumulated lessons`. It reads:

1. `.claude/lessons/by-agent/<agent-name>.md`, universal rules from past corrections that apply to every run of this agent
2. `clients/[Client Name]/Pipeline Data/lessons/notes.md`, corrections specific to this client only

Lessons take precedence over the agent spec. If universal and client-specific
rules conflict, client-specific wins.

**Template-approach slim-down.** The 68 build-agent lessons from the prior
approach (per-client visual decisions: SectionDivider archetype mapping,
PlatformLogos centralisation, mix-blend-mode badge wrappers, mascot rules,
etc.) were archived to `.claude/_archive/lessons-superseded/09-build-pre-template-approach.md`.
The current `.claude/lessons/by-agent/09-build.md` contains only 7 universal
rules: available-now dot, review pill no-filler, hero desktop+mobile, image
quality + LCP, forbidden-string validator, sentinel validator, static rendering
for SEO.

**Distillation cycle.** When 3+ entries accumulate in pending-review.md, run
`/distill-lessons` (future v1) to propose diffs to the relevant agent or
skill specs. The student reviews, accepts, and the rule lands in the per-agent file.

See `.claude/lessons/README.md` for full architecture.

---

## Skills

Located in `.claude/skills/`:

| Skill | Purpose | Read by |
|-------|---------|---------|
| `design-synthesis/SKILL.md` | Brand DNA five-pass extraction process | brand-dna-agent |
| `frontend-design/SKILL.md` | Frontend design best practices + taste calibration | (legacy reference) |
| `nano-banana/SKILL.md` | Hero image prompt construction | hero-image-agent |
| `seo/SKILL.md` | Local SEO + schema + audit framework | seo-audit-agent, strategy-agent |
| `copywriting/SKILL.md` | CRO copy patterns (niche-tunable via playbook) + impeccable prose filter | copy-deck-agent |
| `research/SKILL.md` | GBP + social research | research-agent |
| `asset-scraping/SKILL.md` | Logo + photo + project + team harvesting | asset-agent |
| `proposal-writing/SKILL.md` | Proposal voice, structure, and delivery standards | proposal-agent |
| `vercel-deploy/SKILL.md` | Vercel CLI deploy procedure | deploy-agent |
| `impeccable/` | Full design intelligence system | sop-qa-agent, design-fidelity-qa, copy-deck-agent, proposal-agent |
| `taste/skills/imagegen-frontend-web/SKILL.md` | Elite image direction for hero generation | hero-image-agent |

---

## Inherited code (the only files reused across clients)

The template-approach pivot eliminated the prior `.claude/types/*.ts`
TypeScript types and the canonical React component library. The ONLY
reused code now lives in `templates/website-template/`:

- `templates/website-template/src/components/*.jsx` (19 components)
- `templates/website-template/src/pages/*.jsx` (11 pages)
- `templates/website-template/src/config/brand-dna.schema.json` (per-client config schema)
- `templates/website-template/src/assets/bg-patterns/*.svg` (13 background patterns)
- `templates/website-template/src/assets/platforms/*.svg` (Google/Facebook/BBB pill logos)
- `templates/website-template/scripts/inject-theme.mjs` (vite prebuild hook)
- `templates/{niche-slug}/niche-playbook/trust-signals.json` (cert -> badge file lookup)
- `references/assets/platforms/*.svg` (master copy of platform logos)

**Locked phrases** (verbatim across every client, sourced from `templates/website-template/src/config/brand-dna.example.js` defaults):

- `__REQUIRED__CTA_PRIMARY__`, every CTA, sitewide (resolved from
  `playbook.copy-locks.ctaPrimary`)
- `__REQUIRED__FORM_HEADER__`, form header above every contact form
  (resolved from `playbook.copy-locks.formHeader`)
- `__REQUIRED__FORM_PRIVACY__`, privacy line below every form
  (resolved from `playbook.copy-locks.formPrivacy`)
- Sticky-form micro-copy, from `playbook.copy-locks.formMicroCopy`
- Process risk-reversal sentence, from
  `playbook.copy-locks.riskReversalLine`
- Nav-phone availability label, from
  `playbook.copy-locks.availabilityLabel`

---

## MCPs required

These must be installed and connected before the pipeline runs:

- **Nano Banana MCP**, Stage 9 hero image generation
- **Playwright MCP** (or local Playwright), Stages 10.4a + 10.4c + 10.4d screenshots / DOM walks

Optional:
- **Apify MCP** or Apify CLI, Stage 2 reliable GBP / Facebook / web scraping (Stage 7.5 brand resonance also uses Apify when implemented)

---

## Locked design values (do not regress)

These values are sourced from the SOP and the agency's blueprint reference (configured via `/setup-agency`):
Blueprint reference document (delivered to the agency) and from the template's baked-in design.

| Value | Locked at | Why |
|-------|-----------|-----|
| MobileCtaBar | Always sticky, dual-action | website template has it; sop-qa-agent verifies |
| Available-now green pulsing dot | TopBar + Navbar + MobileCtaBar | Lessons Rule 1 (universal) |
| Hero contact form | Visible above the fold + sticky | website template; sop-qa-agent verifies |
| Footer {{AGENCY_NAME}} byline | "{{AGENCY_NAME}}" credit at bottom | website template Footer.jsx |
| Process steps count | Whatever brand-dna.process_steps holds (typically 4) | Per-client; iteration handles 4-6 |
| Em-dashes anywhere | ZERO | Global rule, audited Stage 10.4b |
| Theme mode | Single mode per client (light by default), NO TOGGLE | brand-dna.theme_mode |
| Hero image | Desktop AND mobile variants required | Lesson Rule 3 (universal) |
| Image quality | q=92 visible photos, q=88 portraits, never below 80 | Lesson Rule 4 (universal) |
| Forbidden strings in dist | any FORBIDDEN_STRINGS entry (__REQUIRED__ sentinel + niche-playbook extensions), fail closed | Lesson Rule 5 (universal) |
| `__REQUIRED__` sentinels in brand-dna.js | Fail closed if any survive | Lesson Rule 6 (universal) |

Background SVG pattern (the ONE per-client visual variance): `brand-dna.shape_motif`
selects from `polygon | triangle | wave | arc | dot-grid | hexagon | chevron |
diamond | cross-hatch | mountain | shingle | blueprint-grid | topographic`.
Default `polygon` if extraction is ambiguous.
