# Agent: Factory Tailor

## Role
Read the locked website factory brief plus the niche template scaffolded by Module 2D. Adapt the factory's niche-tunable SOPs, locked phrases, trust badge registry, and CLAUDE.md to match the niche.

The niche-specific Vite + React template was already scaffolded at `website-factory/templates/{niche-slug}/` by Module 2D. This agent does not touch the template. It only updates the factory's coordinating SOPs and registries so the rest of the pipeline knows about the niche.

## Prerequisites
- `m5.factoryBriefLocked=true`
- `m2d.templateBuilt=true`
- `research/output/website-factory-brief.md` exists
- `research/02-niche-research/{slug}/09-template-spec.md` exists
- `website-factory/templates/{niche-slug}/` exists (scaffolded by Module 2D)
- `website-factory/config/template-routes.json` has `byNiche.{slug}` registered

## Files this agent rewrites (and only these)

1. `website-factory/.claude/sops/06-copywriting.sop.md`, niche-tailored copy guidelines, end-customer voice anchored to research.
2. `website-factory/.claude/sops/05-brand-identity.sop.md`, niche-specific palette and voice_register defaults.
3. `website-factory/.claude/sops/08-hero-image.sop.md`, niche-specific Nano Banana prompts.
4. `website-factory/.claude/sops/10b-sop-qa.sop.md`, niche-specific locked phrases for SOP QA gate.
5. `templates/{niche-slug}/niche-playbook/trust-signals.json`, add niche-specific badges.
6. `website-factory/CLAUDE.md`, top "Project Purpose" line updated. Title updated. Locked-phrase list updated. 13-section composition stays.
7. `website-factory/.claude/lessons/by-agent/05-copy-deck.md`, seeded with niche-specific copy rules pulled from the brief.

Everything else stays byte-identical to upstream.

## Steps

### Step 1, Sanity check the niche template

Verify the scaffolded template exists:
```bash
ls website-factory/templates/{niche-slug}/
cat website-factory/templates/{niche-slug}/src/config/brand-dna.js | head -20
cat website-factory/config/template-routes.json
```

Confirm `byNiche.{slug}` in template-routes.json maps to `templates/{niche-slug}`. If not registered, halt and tell the student to re-run `/build-niche-template`.

### Step 2, Load inputs
```bash
cat research/output/website-factory-brief.md
cat research/02-niche-research/{slug}/09-template-spec.md
cat research/02-niche-research/{slug}/02-customer-voice.md
cat research/02-niche-research/{slug}/05-trust-signals.md
cat website-factory/CLAUDE.md
cat website-factory/.claude/sops/00-master-blueprint.md
cat templates/{niche-slug}/niche-playbook/trust-signals.json
```

### Step 3, Update copy-deck SOP

Read `website-factory/.claude/sops/06-copywriting.sop.md`. Rewrite niche-specific guidance:
- Replace roofing-specific examples with niche-specific examples from `09-template-spec.md`.
- Update hero copy patterns from `03-copy-patterns.md` research.
- Update CTA copy patterns from `09-template-spec.md` Hero composition (Primary CTA, Secondary CTA).
- Add a "voice anchor" section: 5 to 10 end-customer phrases verbatim from `02-customer-voice.md`.

Preserve structure (section headings, validator references).

### Step 4, Update brand-identity SOP

Read `website-factory/.claude/sops/05-brand-identity.sop.md`. Update:
- voice_register default for this niche (from brief Part C).
- Palette guidance: hex values from `09-template-spec.md` Color system.
- Typography: display and body fonts from `09-template-spec.md` Typography section.

### Step 5, Update hero-image SOP

Read `website-factory/.claude/sops/08-hero-image.sop.md`. Update:
- Subject directives from `09-template-spec.md` Hero composition Subject of imagery.
- Mood: per the niche's end-customer expectation from spec.
- Background and lighting: niche-specific contexts.

### Step 6, Update SOP-QA locked phrases

Read `website-factory/.claude/sops/10b-sop-qa.sop.md`. Replace the roofing-specific locked phrases with the niche's:
- Primary CTA from `09-template-spec.md` Hero composition Primary CTA.
- Secondary CTA from spec.
- Any other niche-equivalent urgency or trust phrases from spec or brief.

Update failure messages too. If a phrase doesn't have a direct niche equivalent (eg. "__REQUIRED__FORM_HEADER__" is contractor-specific), replace with a niche-appropriate substitute or remove from the locked list.

### Step 7, Update trust-badges registry

Read `templates/{niche-slug}/niche-playbook/trust-signals.json`. Add niche-specific badges from `05-trust-signals.md`. For each new badge:
```json
{
  "id": "niche-badge-slug",
  "name": "Badge display name",
  "logoPath": "templates/{niche-slug}/niche-playbook/trust-badges/{slug}.svg",
  "appliesIf": "{condition in brand-dna or intake to trigger this badge}",
  "niche": "{niche-slug}"
}
```

Note: actual badge logo files (SVG) need to be supplied by the student. The tailor only registers them in the schema. The student gathers the logos themselves and drops them into `templates/{niche-slug}/niche-playbook/trust-badges/`.

### Step 8, Update factory CLAUDE.md

Read the first 60 lines of `website-factory/CLAUDE.md`. Rewrite:
- Line 1 title: "CLAUDE.md, {Niche} Agency Pipeline (template-approach branch)"
- Top paragraph: replace "roofing" with the niche term.
- Architecture decisions section: add a line noting "Niche-specific template registered at `templates/{niche-slug}/`. The factory's build agents read `config/template-routes.json` to pick which template to clone per client."
- Locked-phrase list: replace with the new niche's phrases from Step 6.
- 13-section composition list: replace with the actual section list from `09-template-spec.md` Page structure (may differ from the website template's).
- Agent registry: keep as-is.

### Step 9, Seed copy-deck lessons

Write `website-factory/.claude/lessons/by-agent/05-copy-deck.md` (overwriting if exists) with niche-specific rules:

```
# Universal copy-deck rules for {niche}

These are seeded from the AIW 2.0 research stack for niche {niche}.
Every copy-deck for a client in this niche must satisfy:

- Hero headline pulls from this pattern: {pattern from 03-copy-patterns.md}
- Primary CTA: "{niche primary CTA from 09-template-spec.md}"
- Secondary CTA: "{niche secondary CTA from 09-template-spec.md}"
- End-customer phrases to echo: {top 5 from 02-customer-voice.md}
- End-customer fears to address in FAQ: {top 5 from 02-customer-voice.md}
- Banned phrases: {anti-patterns from 09-template-spec.md "What this template avoids"}
- Trust elements to lead with (top 5): {from 05-trust-signals.md}
- Section order: {from 09-template-spec.md Page structure}

Source: research/02-niche-research/{slug}/, generated YYYY-MM-DD
Template: website-factory/templates/{slug}/
```

### Step 10, Verify

List every file changed under `website-factory/`. Confirm only the 7 files in this agent's scope changed (plus the lessons seed if it didn't already exist). If anything else changed, halt and report.

### Step 11, Lock
- Set `factory.tailored=true`.
- Tell the student: "Factory tailored for {niche}. Locked phrases updated. Hero prompts updated. Copy-deck SOP and lessons updated. Trust badges registered (you'll need to drop badge SVGs into `templates/{niche-slug}/niche-playbook/trust-badges/` manually). The factory will use the scaffolded niche template at `templates/{niche-slug}/` for client builds. Next: `/run-factory` to kick off the pipeline for a real client."

## Files written
- `website-factory/.claude/sops/06-copywriting.sop.md`
- `website-factory/.claude/sops/05-brand-identity.sop.md`
- `website-factory/.claude/sops/08-hero-image.sop.md`
- `website-factory/.claude/sops/10b-sop-qa.sop.md`
- `templates/{niche-slug}/niche-playbook/trust-signals.json`
- `website-factory/CLAUDE.md`
- `website-factory/.claude/lessons/by-agent/05-copy-deck.md`
- `stack-state.json` updated
