# 10c - UI Uplift SOP

Implements: Stage 10c.

Loop cap: 3. Pass threshold: all 7 checklist items confirmed.

## Prerequisites

Read all 3 skills in order before starting:
1. `system/.claude/skills/ui-ux-pro-max/SKILL.md`
2. `system/.claude/skills/framer-motion/SKILL.md`
3. `system/.claude/skills/frontend-design/SKILL.md`

Optional: query 21st.dev MCP and React Bits MCP for component sourcing in Step 7.

## Procedure

### Step 1 - Rebuild icons as 3D
Replace any remaining Lucide line icons in `clients/[slug]/build/src/` with 3D-style or custom illustrated equivalents per the brand-dna.json motif and shape_mode. The `icon-3d` CSS class in `tokens.css` defines the gold-gradient base treatment. No default Lucide stroke icons should remain visible in production sections (nav utility icons and close/chevron controls are exempt).

### Step 2 - Animated SVG backgrounds
Add floating geometry (triangles, diagonal lines, or geometric shapes) to alternating sections using the existing `TrianglePolygons` component as a reference pattern. Apply surgically: not every section. Hero already has HeroPolygons - do not add a second layer there.

### Step 3 - Framer Motion animations
- Scroll reveals: `fade-up` at 200ms ease-out on all major section headings and card grids. Use the existing `anim-in` / `visible` CSS classes as a fallback if the skill prescribes CSS-only reveals.
- Hero entrance: 60ms stagger between eyebrow, H1, body, review pills, and form.
- Hover states: 4-6px lift at 150ms on cards (ServiceCard, ReviewCard, BlogCard).
- Marquee strips: horizontal scrolling ticker between 2-3 section breaks (e.g., between TrustStrip and Reviews, and between CTABanner and Footer). Content: rotate through the 4 TrustStrip claims.

### Step 4 - Polish trust badges
Apply to FloatingTrustStrip badges:
- Shimmer animation on load (CSS `@keyframes shimmer`, sweeps left to right once).
- Stagger entrance: each of the 4 badges fades in with a 100ms offset.
- Hover: slight scale(1.04) + drop-shadow at 150ms.

### Step 5 - Mobile sticky CTA bar
Enhance the existing `MobileCTABar.tsx` component (do not rebuild from scratch). Verify time-of-day logic is operational:
- 9 AM to 5 PM local: renders click-to-call button with the client phone number.
- Outside those hours: renders "__REQUIRED__CTA_PRIMARY__" form anchor.
Confirm the locked label "Give us a call!" is used for the call button.

### Step 6 - Animated counters on stats
Add scroll-triggered count-up animation to any numeric stats visible on the homepage (years experience badge, project count badge, review count in FloatingTrustStrip, revenue figures if present in SpecialOffers). Counter animates from 0 to the real value over 1.2s ease-out on first scroll into view.

### Step 7 - Component sourcing (if MCPs available)
For any component need not covered by the existing library, query 21st.dev MCP and React Bits MCP. Source components that fit the brand-dna shape_mode and palette. Adapt all props to use CSS var tokens - no hard-coded hex values.

## Output location
All changes write directly to `clients/[slug]/build/src/`. The build must still compile after uplift. Run `npm run build` in `clients/[slug]/build/` to verify.

Log results to `clients/[slug]/qa/uplift-runs/run-N/report.md`.

## Pass gate
All 7 items in `system/checklists/uplift.checklist.md` must be confirmed.

## Failure handling
- Loop cap 3 reached with failing items: write `MANUAL-INTERVENTION-NEEDED.md` listing exact failures.
- `npm run build` fails after uplift changes: revert the last edit that introduced the error, log it, continue with remaining checklist items.

## What this agent never does
- Rebuild MobileCTABar from scratch - enhance the existing component
- Add animations to every section - surgical application only
- Vary the locked CTA copy or trust strip claims during uplift
- Hard-code hex values - all colors use CSS var tokens
- Add or remove any of the 14 sections - uplift is polish only, not restructure
