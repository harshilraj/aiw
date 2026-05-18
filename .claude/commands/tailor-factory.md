---
description: Apply the website factory brief plus the niche starter template to the website-factory tree.
---

Gate: `m5.factoryBriefLocked` must be true.

Invoke the `08-factory-tailor` agent at `.claude/agents/08-factory-tailor.md`.

Rewrites only six files inside `website-factory/`:
1. `client-intake/intake-form.json`
2. `client-intake/niche-profile.json` (new)
3. `references/sop/sop-checklist.md`
4. `references/design-dna/active-template.md` (new, primary template)
5. `templates/contractor-hero-image-agent.md` renamed to `niche-hero-image-agent.md`
6. `CLAUDE.md` (project purpose line only)

Verify only those six files changed. Lock with `factory.tailored=true`.
