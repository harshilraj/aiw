# /stage10-4a-design-qa

Invokes `design-fidelity-qa-agent` to run a visual diff between the built
site and the approved brand board. Loops up to 5 times targeting >= 0.90
fidelity. Auto-triggered after Stage 10.1 completes.

## Usage

```
/stage10-4a-design-qa
/stage10-4a-design-qa --client=example-roofing
```

## Prerequisites

| Input | Location | Required |
|-------|----------|---------|
| brand-board.png | `clients/[Client Name]/Pipeline Data/design/` | Yes |
| Built site | `clients/[Client Name]/[Client Name] Website/` | Yes |
| Playwright | Local install | Yes |
| pipeline-state stage_10_1: complete | `clients/[Client Name]/Pipeline Data/logs/pipeline-state.json` | Yes |

## What this command does

1. Reads `.claude/agents/design-fidelity-qa-agent.md` end-to-end
2. Reads `.claude/checklists/design-fidelity.md`
3. Takes a Playwright screenshot of the built site at 1440px
4. Diffs the screenshot against brand-board.png section by section
5. Scores fidelity (0.00 to 1.00)
6. If score < 0.90 and loop count < 5:
   - Identifies the lowest-scoring sections
   - Applies targeted fixes to the build
   - Re-runs the diff
7. If score >= 0.90: marks `stage_10_4a: complete`
8. If score < 0.90 after 5 loops: halts, prints gap report, prompts for `/override-design-fidelity`

## Loop cap

Maximum 5 loops. Each loop result is logged to `clients/[Client Name]/Pipeline Data/logs/build-log.md` with
the fidelity score and which sections were fixed.

## Failure modes

| Condition | Response |
|-----------|----------|
| Playwright not installed | Halt: "Run: npx playwright install" |
| Build folder missing | Halt: "Run /stage10-1-build first." |
| brand-board.png missing | Halt: "No brand board found. Run /approve-brand-board first." |
| Loop limit reached without passing | Print gap report. Prompt: "Run /override-design-fidelity to accept current build." |
