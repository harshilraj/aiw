# /stage-10-1-build

Invokes `09-build.md` (Stage 10.1) to scaffold the live React + Vite + Tailwind
site by composing the Component Library against brand DNA, the approved brand
board, and the generated hero image.

## Usage

```
/stage-10-1-build
/stage-10-1-build --client="Client Name"
/stage-10-1-build --skip-install
```

`--skip-install` skips `npm install`, useful for re-runs where dependencies
are already present.

## Prerequisites

Stage 10.1 cannot run unless ALL of these are true:

| Stage | State |
|-------|-------|
| Stage 7 (Brand DNA) | `complete` |
| Stage 8 (Brand board) | `complete` |
| Stage 9 (Hero image) | `complete` |

Stage 10.1 reads `pipeline-state.json` and refuses to start if any
prerequisite is missing.

## What this command does

1. Reads `.claude/agents/09-build.md` end-to-end
2. Verifies all prerequisite stages are complete
3. Confirms required input files exist:
   - `clients/[Client Name]/Pipeline Data/brand/brand-dna.json`
   - `clients/[Client Name]/Pipeline Data/design/brand-board.png`
   - `clients/[Client Name]/Pipeline Data/hero-image/hero-final.png`
   - `clients/[Client Name]/Pipeline Data/copy/copy-deck.md`
   - `clients/[Client Name]/Pipeline Data/strategy/sitemap.json`
   - `clients/[Client Name]/[Client Name] Assets/logo/`
   - `clients/[Client Name]/[Client Name] Assets/founder-photos/` (at least one photo)

4. If any required input is missing, halts with `MANUAL-DROP-NEEDED.md` listing
   exactly what's needed and where it goes.

5. Otherwise, executes the 9-step process from `09-build.md`:
   1. Read all upstream artifacts
   2. Run design intelligence queries (ui-ux-pro-max)
   3. Scaffold Vite project + copy assets to public/
   4. Generate brand-override.css
   5. Generate data files (brand-dna.ts + site-data.ts)
   6. Copy and wire canonical sections
   7. Apply conditional rendering rules
   8. Build all inner pages
   9. Visual quality check + /impeccable audit

6. Auto-triggers Stage 10.2 (Personalise) on completion.

## Output

```
clients/[Client Name]/[Client Name] Website/
├── package.json
├── src/
│   ├── components/    Component Library copy
│   ├── sections/      14 canonical sections
│   ├── data/          brand-dna.ts + site-data.ts
│   └── styles/        tokens.css + brand-override.css
└── public/
    ├── logo.*
    ├── hero-final.png
    ├── badges/        matched trust badge files
    └── [founder photos]
```

## Failure handling

| Condition | Response |
|-----------|----------|
| Prerequisite stage incomplete | Halt, point to missing stage's command |
| Required asset missing | Halt, write MANUAL-DROP-NEEDED.md |
| `npm install` fails | Halt with the exact error, do not retry |
| `npm run build` fails | Halt with the exact error |
| Bundle size > 1MB gzip | Continue but log warning |

## After build completes

Stage 10.2 (Personalise) auto-fires. Invoke manually with `/stage10-4a-design-qa`
to inspect output before personalisation if needed.