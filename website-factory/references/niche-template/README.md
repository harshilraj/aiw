# Niche template reference library

Reference material Module 2D's template-builder agent consumes when
generating a per-niche template. Shipped with the factory; not modified by
client runs.

## Contents

```
references/niche-template/
  tokens.schema.json              Schema for niche-design-tokens.json
                                  (output of tools/extract-niche-design-tokens.py).

  section-patterns/               Pattern library Claude reads before
                                  generating each section component.

    README.md                     How the agent selects + adapts patterns
                                  per niche.

    Hero/                         One sub-directory per section in the
    TrustStrip/                   canonical homepage composition.
    Founder/                      Each contains 2-4 JSX patterns +
    Reviews/                      _README.md describing when to pick which.
    ...
```

## What the agent does with this

For each of the 13 sections in `templates/website-template/src/pages/HomePage.jsx`,
the template-builder agent (Module 2D Phase 6c):

1. Reads the section's `_README.md` here for pattern-selection guidance.
2. Reads every `*.jsx` pattern file in the section's directory as inspiration.
3. Reads the niche's `09-template-spec.md`, screenshots, and design tokens.
4. Writes a niche-tailored `<Section>.jsx` into
   `research/02-niche-research/{niche-slug}/generated-components/`.
5. The scaffolder (`tools/scaffold-niche-template.py`) overlays those files
   onto the `templates/website-template/` baseline to produce
   `templates/{niche-slug}/`.

## Required design skills

The agent consults these skills during Phase 6c generation. They live in
`website-factory/.claude/skills/`:

| Skill | What it provides |
|---|---|
| `frontend-design/` | Anthropic's distinctive-frontend skill: anti-AI-aesthetic guardrails, component composition patterns. |
| `impeccable/` | 5-dimension audit framework (a11y, performance, theming, responsive, anti-patterns) that drives generation quality. |
| `ui-ux-pro-max/` | 161 reasoning rules + tailwind config generator + design-system scaffolds. |
| `taste/skills/redesign-skill/` | Generic-AI-pattern detector. Runs at Module 2D Phase 7 (Gate 4 audit). |

## Canonical brand-dna shape contract

Every generated component MUST read from the canonical paths defined in
`templates/website-template/src/config/brand-dna.example.js`. The Phase 1
validator (`scripts/validate-brand-dna.mjs`) halts the build if any
component reads a non-canonical path. See Gate 1 in
`tools/validate-niche-template.py`.

This is the safety net that lets niche templates vary visually without
breaking the runtime contract.
