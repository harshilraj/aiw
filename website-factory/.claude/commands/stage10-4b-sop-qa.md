# /stage10-4b-sop-qa

Invokes `sop-qa-agent` to score the built site against the SOP compliance
checklist. Loops up to 10 times targeting >= 95% compliance. Auto-triggered
after Stage 10.4a passes.

## Usage

```
/stage10-4b-sop-qa
/stage10-4b-sop-qa --client=example-roofing
```

## Prerequisites

| Input | Location | Required |
|-------|----------|---------|
| Built site | `clients/[Client Name]/Pipeline Data/build/` | Yes |
| copy-deck.md | `clients/[Client Name]/Pipeline Data/copy/` | Yes |
| sop-compliance.md checklist | `.claude/checklists/` | Yes |
| pipeline-state stage_10_4a: complete | `logs/pipeline-state.json` | Yes |

## What this command does

1. Reads `.claude/agents/sop-qa-agent.md` end-to-end
2. Reads `.claude/checklists/sop-compliance.md`
3. Runs each checklist item against the build source
4. Scores compliance as a percentage
5. If score < 95% and loop count < 10:
   - Lists failing checklist items
   - Applies targeted fixes
   - Re-scores
6. If score >= 95%: marks `stage_10_4b: complete`
7. If score < 95% after 10 loops: halts, prints compliance report,
   prompts for `/override-sop`

## Critical SOP checks (automatic fail if any are present)

- Em-dash anywhere in visible copy, alt text, comments, or JSX attributes
- CTA label other than "__REQUIRED__CTA_PRIMARY__" on any primary button
- Lead form header other than "__REQUIRED__FORM_HEADER__"
- Lead form missing "__REQUIRED__FORM_PRIVACY__"
- Process section with fewer or more than 6 steps
- Fabricated Google review count or rating
- TrustStrip badge count other than 4

## Loop cap

Maximum 10 loops. Each loop result is logged to `logs/build-log.md`.

## Failure modes

| Condition | Response |
|-----------|----------|
| sop-compliance.md missing | Halt: "Checklist file missing at .claude/checklists/sop-compliance.md" |
| Build folder missing | Halt: "Run /stage10-1-build first." |
| Loop limit reached | Print full compliance report. Prompt: "Run /override-sop to accept." |
