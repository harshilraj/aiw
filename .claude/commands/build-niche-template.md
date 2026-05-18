---
description: Module 2D. Capture best-of-niche sites, score them, pick a winner, scaffold a niche-specific template inside the factory, and generate the full niche playbook the factory consumes.
---

Gate: `m2c.nicheDecided` must be true.

Invoke the `14-template-builder` agent at `.claude/agents/14-template-builder.md`. Use the `template-capture-and-build` skill for Apify capture and template scaffolding. Reference the niche playbook contract surface at `website-factory/references/niche-playbook/` for schemas and contracts.

Eight phases:
1. Source 8 to 12 best-of-niche URLs from Module 2B outputs plus optional manual picks.
2. Capture via Apify playwright-scraper (desktop + mobile screenshots, DOM, CSS, fonts, colors).
3. Score every capture with Claude Vision against the end-customer conversion rubric.
4. Show student the top 3 with scores and rationales. Student picks one or specifies a mix.
5a. Generate design spec, wireframe, sitemap (`09-template-spec.md`, `09-wireframe.md`, `09-sitemap.json`).
5b. **Generate the niche playbook** at `templates/{niche-slug}/niche-playbook/`, required files (copy-locks, copywriting, hero-composition, hero-mood-mapping, photo-manifest, asset-patterns, trust-signals + curated badge library, motion-preset, theme, process, vocabulary, cro-rules, design-vocabulary) plus optional files (resonance-queries, seo-patterns, quantified-trust-templates, copy-blocklist-additions, sop-overrides). Validate every JSON file against its schema; verify every markdown file follows its contract.
6. Scaffold `website-factory/templates/{niche-slug}/` with full Vite + React structure following the scaffold blueprint (foundation tokens inherited from baseline).
7. Register in `website-factory/config/template-routes.json`, run build, validate playbook + leak grep, lock state.

Estimated cost: $4 to $5 in Apify credits for this phase. Combined with Module 2B, total Apify spend per niche is roughly $5 to $7. Student may need to top up Apify before this command runs.

Lock with `m2d.templateBuilt=true`. Also set `niche.templateVersion = 1` (incremented by `/refine-template`).

Output: niche-specific template + full niche playbook in the factory ready for client builds. The factory uses this template + playbook for clients in this niche.
