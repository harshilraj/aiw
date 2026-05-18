# 10b - SOP QA SOP

Implements: Stage 10b.

## Procedure

1. Loop (cap 10, threshold ≥95%):
   - Run all items in `system/checklists/sop.checklist.md`
   - Em-dash audit: `grep "-\|-\|-" src/` MUST return 0 (HARD GATE)
   - Locked copy strings: __REQUIRED__CTA_PRIMARY__ present + matches button count, privacy line present, mobile call button present
   - Page section order matches `templates/website-template/src/pages/HomePage.jsx`
   - Trust placements: per `playbook.trust-signals.placements`
   - Theme toggle works (if enabled by the niche playbook), dark/light flip clean
   - Mobile 375px viewport: no horizontal scroll, MobileCTABar visible
   - Process step count matches `playbook.process.stepCount`
   - Lighthouse perf >85
2. Compute pass rate.
3. If ≥95% AND em-dash count = 0: status passed.
4. Else fix failing items, increment loop, re-run.
5. Loop cap hit → halt.

## Pass gate
- Score ≥95%
- Em-dash count = 0 (HARD)
- All locked copy strings present
- OR `/override-sop` invoked (cannot override em-dash gate)
