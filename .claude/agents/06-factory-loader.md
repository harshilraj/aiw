# Agent: Factory Structure Loader (Module 4)

## Role
Scan the `website-factory/` tree and auto-generate `research/_structure/Website_Factory_Structure.md`. Internal, no student input.

The factory is the bundled `website-factory/` shell. It uses the website template (`templates/website-template/`) as the canonical per-client base. Per-client variance is locked to 6 dimensions: paint, copy, photos, trust badges, theme mode, background SVG pattern. The 13-section page composition is locked.

This means the factory is **best suited to home-services and trades niches** (roofing, painting, HVAC, plumbing, etc.). Module 2A scoring should steer students toward niches that fit the website template composition.

## Prerequisites
- `m3.offerLocked=true`
- `website-factory/` exists in the stack

## Steps

### Step 1, Read the factory's master CLAUDE.md
```bash
sed -n '1,250p' website-factory/CLAUDE.md
```

Pull: pipeline stages, agent registry, command list, architectural decisions, the 13-section locked composition, the 6-dimension variance contract.

### Step 2, Read the brand-dna schema
```bash
cat website-factory/references/schemas/brand-dna.schema.json
```

Identify every field in the brand-dna contract. This is the per-client config contract that overlays onto the website template.

### Step 3, Read the master blueprint and key SOPs
```bash
cat website-factory/.claude/sops/00-master-blueprint.md
ls website-factory/.claude/sops/
```

Identify which SOPs are niche-flexible (brand-dna, copy, trust badges) vs niche-locked (website template composition, locked CTAs, sentinel phrases).

### Step 4, Read the trust badges registry
```bash
cat templates/{niche-slug}/niche-playbook/trust-signals.json
```

The factory's trust badges live here. The brief in Module 5 will need to flag which badges from this registry apply to the chosen niche, and whether any new badges need to be added for the niche.

### Step 5, Read intake mechanism

The factory uses `clients/[Client Name]/Pipeline Data/` rather than a single intake-form.json. The Stage 1 intake agent at `website-factory/.claude/agents/00-intake.md` defines what intake data the pipeline expects.

```bash
cat website-factory/.claude/agents/00-intake.md
```

Identify required intake fields and the client folder structure.

### Step 6, Write Website_Factory_Structure.md

```
# Website Factory, Structure Overview

## What the Factory does
[From CLAUDE.md, 1 to 2 sentences. The factory clones templates/website-template/ per client, overlays brand-dna.json + copy + assets, builds, validates, deploys.]

## Constraint: home-services and trades focus
The cloned factory is built on the website template, which has a locked 13-section composition optimized for home-services and trades niches. Suitable niches: roofing, painting, HVAC, plumbing, landscaping, pest control, cleaning, electrical, garage doors, etc.

Niches that won't fit out of the box: legal, medical, SaaS, ecommerce, content sites. For those, students would need to fork the factory and build an alternative template.

## Pipeline
13 stages from intake to delivery. See `website-factory/CLAUDE.md` for the full table. The student runs `/build-all` from inside the factory to kick off the whole pipeline. Approval gate at Stage 7 (brand-dna confidence).

## Inputs the Factory needs (per client)

Each client lands in `clients/[Client Name]/`. The intake agent populates:
- `Pipeline Data/intake/intake.json`, business name, website URL, phone, email, address, primary city, state, owner name
- (optional) `Pipeline Data/intake/notes.md`, any special instructions

After intake, downstream stages populate the rest:
- `Pipeline Data/research/research.json`
- `Pipeline Data/seo/audit-data.json`
- `Pipeline Data/strategy/strategy.json`
- `Pipeline Data/copy/copy-deck.md`
- `Pipeline Data/brand/brand-dna.json`
- `[Client Name] Assets/`, logo, photos, etc.

## Decisions the brief must make (vs. factory defaults)

The brief MUST decide:
- Niche-specific trust badges to add to `templates/{niche-slug}/niche-playbook/trust-signals.json` (eg. GAF Master Elite for roofers, BPI Building Analyst for HVAC, etc.)
- Niche-specific locked phrases for the SOP QA agent (currently roofing: "__REQUIRED__CTA_PRIMARY__", "__REQUIRED__FORM_HEADER__"). For other niches, replacement phrases.
- Default copy patterns for the 13 sections (Hero, TrustStrip, Reviews, Founder, Services, WhyChooseUs, OurWork, OurProcess, SpecialOffers, Blog, FAQ, ServiceAreas, CTABanner) tuned to the niche's end customer.
- voice_register default for brand-dna (commercial / family / premium).
- Hero image prompt patterns for Stage 9 (Nano Banana).

The Factory defaults handle:
- 13-section page composition (locked, in order, source of truth: `templates/website-template/src/pages/HomePage.jsx`)
- Theme mode logic (light/dark from logo brightness)
- shape_motif selection (13 patterns at `templates/website-template/src/assets/bg-patterns/`)
- Build stack (Vite + React)
- SEO injection, schema markup
- Lighthouse perf gate (LCP < 3s)
- Vercel deploy
- Proposal HTML generation

## SOPs that live in the Factory
See `website-factory/.claude/sops/00-master-blueprint.md` and the 14 per-stage SOPs at `website-factory/.claude/sops/`. The Universal CRO SOPs moved here from the framework live at `website-factory/references/cro-sops/universal-cro-sops.md`.

## Outputs the Factory produces
- `clients/[Client Name]/[Client Name] Website/dist/`, built site
- Vercel deploy URL
- `clients/[Client Name]/[Client Name] Proposal/proposal.html` + live proposal URL
- Delivery report at `clients/[Client Name]/Pipeline Data/delivery/delivery-report.md`

## Handoff format
The Module 5 brief lands at `research/output/website-factory-brief.md`. `/tailor-factory` reads it and rewrites a small set of niche-variable files inside the factory. Per-client intake then lands in `website-factory/clients/[Client Name]/Pipeline Data/intake/intake.json` (separate from the niche tailoring).
```

### Step 7, Lock
- Set `m4.factoryStructureLoaded=true`.
- Tell the student: "Factory structure mapped. The factory is best for home-services and trades niches. Next: `/generate-wf-brief`."

## Files written
- `research/_structure/Website_Factory_Structure.md`
- `stack-state.json` updated
