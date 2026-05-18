# 05 - Brand Identity SOP

Implements: Stage 5.

## Procedure

### Phase A - Logo analysis
Invoke logo-analyzer sub-agent. 8 passes: colors, shape language, motif, wordmark, composition, contrast, differentiation, industry signal. Save to `brand/logo-analysis.json`.

### Phase B - Brand voice probes
Generate first-draft brand copy snippets derived from `research.voice_signals` + `research.review_summary.sample_quotes` + `brand-research.md` + Phase A output. Each probe MUST cite which research field(s) it was derived from in a `_source` field. Probes that can't be traced get flagged. Save to `brand/voice-probes.json`. The probes feed the brand board only - Stage 6 produces final website copy from scratch.

### Phase C - Compose two filled prompts
Open `system/prompts/brand-board-chatgpt.prompt.md`. Substitute every variable for BOTH theme variants:
- Dark variant - save to `brand/gpt-image-prompt-dark.md`
- Light variant - save to `brand/gpt-image-prompt-light.md`

The two share all per-client variables (palette, typography, voice probes, regional context). Only theme-driven variables differ (BG_HEX, HEADING_TEXT_HEX, LOGO_TREATMENT, etc.).

### Phase D - HALT
Write MANUAL-DROP-NEEDED.md instructing the user to:
1. Paste `gpt-image-prompt-dark.md` into ChatGPT (with GPT-Image enabled), attach logo, save result as `brand/brand-board-dark.png`
2. Repeat with `gpt-image-prompt-light.md` -> `brand/brand-board-light.png`
3. Run `/resume`

### Phase E - Variables manifest extraction
Sample BOTH brand boards at known coordinate ranges:
- 6 palette swatches (right panel COLOR PALETTE block)
- Typography sample (right panel TYPOGRAPHY block)
- Photography mood thumbnails (right panel VISUAL STYLE block)

The hex values from dark and light boards must match within ΔE 5 (same palette, different theme). If divergence > 5, halt with delta report and ask user to confirm canonical values.

Save to `brand/variables-manifest.json`.

### Phase F - Compose brand-dna.json
Merge Phase A + Phase B + Phase E + research trust block. Set `shape_mode` from Phase A pass 2. Validate against `brand-dna.schema.json`. Halt on validation failure.

## Pass gate
- brand-dna.json validates schema
- 6 palette tokens valid hex AND match between dark + light boards (or user confirmed canonical)
- shape_mode set
- Voice attributes count = 3
- All voice probes have `_source` citations
- Both brand-board PNGs exist on disk

## Why two brand boards

Dark and light themes are not separate brands - they are stylistic variants of the SAME brand. Generating both at Stage 5 forces the design system to actually work in both modes from day one (CSS variables flip cleanly), and gives the Stitch agent (Stage 8) two anchors instead of one. The Stitch dark mockup uses brand-board-dark.png as its primary visual reference; Stitch light uses brand-board-light.png.
