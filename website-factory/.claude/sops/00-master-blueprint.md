# 00 - Master Pipeline Blueprint

## The 13 stages + 2 approval gates

| # | Stage | Output | Gate Threshold |
|---|---|---|---|
| 1 | Intake | intake.json + WEBSITE-SNAPSHOT.html | 4 fields validated |
| 2 | Research | research.json + brand-research.md | 11 sections present |
| 3 | SEO | seo-strategy.json + audit + revenue calc | 7 audit sections, ≥5 keyword gaps, $-figure |
| 4 | Asset Scraping | assets/{logo,photos,badges,owner}/* | logo found OR halt |
| 5 | Brand Identity | brand-dna.json (8-pass + GPT-Image extraction) | schema valid |
| 6 | Copywriting | copy-deck.json + per-page .md | every sitemap page covered, zero placeholders |
| 7 | Brand Guide | brand-guide.pdf (10 sections) | 10 sections rendered, schema valid |
| **GATE 1** | Brand Guide Approval | `/approve-brand-guide` | user issues command |
| 8 | Stitch Mockups | design/{light,dark}/mockup.png | both ≥1280×800 |
| **GATE 2** | Stitch Approval | `/approve-stitch [light\|dark]` + APPROVED symlink | user issues command |
| 9 | Build | build/dist/ + homepage with every section populated | Vite builds, all sections in the canonical order defined by `templates/website-template/src/pages/HomePage.jsx` |
| 10a | Design Fidelity QA | qa/fidelity-runs/run-N/* | SSIM ≥0.90, ΔE ≤3 per section |
| 10b | SOP QA | qa/sop-runs/run-N/* | ≥95% pass, em-dash count = 0 |
| 10c | UI Uplift | qa/uplift-runs/run-N/* | uplift checklist passed, no default Lucide icons |
| 11 | Proposal | proposal/proposal.html | zero `[BRACKET]` placeholders, iframe URL valid |

## Failure protocol

Any gate failure or loop cap breach:
1. Write `clients/[slug]/MANUAL-INTERVENTION-NEEDED.md` listing exact failures + fix instructions
2. Update `pipeline-state.json` with `status: "halted"`
3. Append to `build-log.md`
4. Halt. NO downstream stages.

## Two-zone discipline

- `system/` is FROZEN during client runs. The `pre-tool-use.sh` hook blocks writes to system/ when an active client is set.
- Per-client work goes ONLY to `clients/[active-client]/`.

## Cross-cutting requirements (every stage)

These are the **universal** invariants. The **niche-specific** locked phrases, counts,
and section order come from the niche playbook at
`templates/{active-niche-slug}/niche-playbook/`. Module 2D writes that playbook from
the top-of-niche research the student ran in Module 2D.

**Universal (apply to every niche):**

- ZERO em-dashes anywhere
- Smart-quote enforcement (curly quotes, real en-dashes, real ellipsis)
- AI-vocab blocklist enforcement (loaded from `references/copy/ai-vocab-blocklist.md`)
- `prefers-reduced-motion: reduce` honoured by every animation
- Schema validity at every gate that writes JSON
- Logo present (HALT on missing)

**Niche-specific (read from `niche-playbook/`):**

- LOCKED CTA: from `niche-playbook/copy-locks.json` → `ctaPrimary`
- LOCKED form header: from `niche-playbook/copy-locks.json` → `formHeader`
- LOCKED privacy line: from `niche-playbook/copy-locks.json` → `formPrivacy`
- LOCKED mobile call button: from `niche-playbook/copy-locks.json` → `mobileCallLabel`
- TrustStrip claim count + badge count: from `niche-playbook/trust-signals.json` → `trustStripCount`
- Trust badge placements: from `niche-playbook/trust-signals.json` → `placements[]`
- Theme support (light/dark/both): from `niche-playbook/theme.json` (typical default: both)
- Process section step count: from `niche-playbook/process.json` → `stepCount`
- Home page section order: from the niche template's `HomePage.jsx` (Module 2D scaffolds
  it from the niche-specific spec)
