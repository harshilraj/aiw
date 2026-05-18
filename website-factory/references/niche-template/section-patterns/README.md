# Section pattern library

Reference patterns the template-builder agent reads when generating per-niche
section components. Patterns are inspiration, not boilerplate; the agent
adapts each one to the niche's tokens, voice, and composition needs before
writing the final JSX.

## Selection guidance

Each section sub-directory contains a `_README.md` describing when to pick
which pattern. The agent decides by comparing the niche's
`09-template-spec.md` (winner analysis) and `niche-design-tokens.json`
against the pattern descriptors.

The decision is per-section, not per-template. A niche may end up with a
"split-form-right" Hero, a "marquee-rotating" TrustStrip, and a
"portrait-grid-team" Founder. The validator (Gate 1) ensures every
combination still satisfies the canonical brand-dna shape.

## Adding new patterns

When a niche generation surfaces a composition the library doesn't
cover well, add a new file under the relevant section directory:

1. Write the pattern as a standalone `.jsx` component reading the canonical
   brand-dna paths.
2. Add a one-paragraph entry to the section's `_README.md` describing the
   niche signal that picks this pattern.
3. Add the pattern to the validator's known set if the file requires special
   assets (the niche-playbook trust-badges, owner photos, etc.).

## Bare-minimum starter set

The library ships with a starter set sufficient for the first few niches.
Module 2D agent runs add new patterns as the library matures.

| Section | Starter patterns |
|---|---|
| Hero | `split-form-right` (default, contractor), `asymmetric-luxe` (hospitality/editorial), `centered-minimal` (editorial/SaaS) |
| TrustStrip | `pill-floating-4` (default), `marquee-rotating` (luxe), `none` (editorial) |
| Founder | `photo-left-text-right` (default), `portrait-grid-team` (when multiple founders), `none` (faceless brands) |
| WhyChooseUs | `bullets-with-icons` (default), `alternating-rows` (editorial) |
| OurProcess | `numbered-grid` (default), `timeline-vertical` (editorial), `minimal-list` (luxe) |

Every other canonical section starts with one default pattern; the agent
generates new ones on demand.

## Canonical brand-dna paths required

Every pattern MUST read from these paths. The validator's Gate 1 enforces.
See `templates/website-template/src/config/brand-dna.example.js` for the
authoritative shape and `templates/website-template/src/components/*.jsx`
for the reference implementation of each path.
