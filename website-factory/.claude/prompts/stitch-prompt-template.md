# Stitch generation prompt template

This template gets parameterized by the brand-dna-agent (Stage 7) and fed to
Stitch by the stitch-agent (Stage 8). Every `{{slot}}` is filled from
`client-data/[client]/brand/brand-dna.json`. Every `{{playbook.PATH}}`
reference is filled from
`templates/{active-niche-slug}/niche-playbook/` (Module 2D writes these
per niche).

The template produces TWO outputs per run, a light-mode and a dark-mode
variant, by toggling the `{{mode}}` slot. The user picks one at the
approval gate via `/approve-stitch [light|dark]`.

---

## REQUIRED OUTPUTS PER GENERATION

The Stitch MCP must return:

1. **Mockup PNG**, full-page composition at 1440px wide
2. **HTML/CSS code**, production-ready React + Tailwind component

If only one is returned, save what we get and log the gap. The build agent
in Stage 10.1 can work from either alone (PNG via design-fidelity QA, code
as starting reference) but works best with both.

---

## ATTACHED REFERENCE IMAGES

Every Stitch call attaches all of the following:

The student may drop reference images at
`references/stitch-references/{name}.png` to anchor the stitch style. The
stitch agent reads any present files in that directory at run time. The
directory ships EMPTY in the public repo.

1. `client-data/[client]/assets/logo/logo.{svg,png}` (THE CLIENT LOGO)
2. `client-data/[client]/assets/photos/hero-context.jpg`
   (optional, only if scraped)

The student-supplied references define the agency's visual language across
every client. The client logo is the brand's visual signature and must
render unmodified in the mockup.

---

## THE PROMPT

```
Generate a {{mode}}-mode homepage mockup for a {{niche.noun}} website.

CLIENT IDENTITY
Company: {{company_name}}
Tagline: {{company_tagline}}
Region: {{region}}
Segment: {{segment}}

BRAND DNA
Primary background:    {{palette.primary}}
Secondary surfaces:    {{palette.secondary}}
Muted/borders:         {{palette.muted}}
Body text:             {{palette.text_body}}
Outline / neutral:     {{palette.neutral}}
Accent (CTAs/lines):   {{palette.accent}}

Heading font: {{typography.heading}}, capitalisation per
{{playbook.typography.headingCase}}, tight letter-spacing
Body font:    {{typography.body}}, weight 400 for body, 600 for emphasis

Shape mode: {{shape_mode}}, zero border-radius on every structural element
(cards, buttons, inputs, containers, image wrappers, form fields). The only
exception is the availability dot in the navbar, which is fully round.

LOGO
The client's logo is attached as the first reference image. Place it:
- Top-left of the navbar at 40px height
- Footer brand column at 56px height
- Inside the brand identity panel header if rendered

The logo is the brand's visual signature. Reproduce its colors, shapes,
and typography faithfully. Do not recolor, simplify, or stylize it.
{{#if logo.has_motif}}
The logo features a recurring motif: {{logo.motif_description}}. This motif
may be subtly echoed in section dividers and the SVG background overlays.
{{/if}}

PAGE COMPOSITION
Render the homepage in the canonical section order defined by
`templates/website-template/src/pages/HomePage.jsx`, top to bottom:

1. Sticky Nav
   - Logo left, primary nav center
     (labels come from {{playbook.vocabulary.navLabels}}), pulsing
     availability dot + {{playbook.copy-locks.availabilityLabel}} +
     clickable phone {{contact.phone}}, then a
     "__REQUIRED__CTA_PRIMARY__" accent-color button on right.
   - 2px accent-color line at the very top edge of the navbar.

2. Hero (height calc(100vh - 14rem) so TrustStrip is above-fold)
   - Two-column grid (60/40 split desktop, stacks on mobile)
   - LEFT column: eyebrow {{hero.eyebrow}} | H1 {{hero.h1_headline}}
     | 2px accent separator line (w-16) | tagline {{hero.tagline}}
     | review pills below tagline (one per platform in
     {{playbook.trust-signals.placements}} that includes "hero")
     | hero trust claim rows with thin-line icons; row count and
     wording come from {{playbook.copy-locks.heroTrustClaims}}.
   - RIGHT column: frosted glass lead form (opacity per the website
     template's --glass-opacity token) with a metallic
     "__REQUIRED__FORM_HEADER__" header, 5 fields (Name, Phone, Email,
     Address, Message), accent-color "__REQUIRED__CTA_PRIMARY__" button,
     privacy line "__REQUIRED__FORM_PRIVACY__".
   - Background: hero photo from Stage 9 with overlay gradient. Mood:
     {{hero.mood}}
   - Two opposing dark polygon overlays for depth (top-left and
     bottom-right triangles). Bottom-right small polygon at full opacity.

3. TrustStrip (negative-margin float into Hero bottom)
   - Floating claims pill: claim count and wording come from
     {{playbook.copy-locks.trustStripClaims}}, separated by thin
     accent-color dividers, inside a glass-panel container.
   - Below it, a manufacturer / affiliation badge strip with badges
     looked up from {{playbook.trust-signals.badges}} and filtered by
     per-client `brand-dna.certifications` booleans.
   - Badge images are h-14 height, separated by thin neutral vertical
     lines.

4. Reviews carousel
   - Header per {{playbook.copy-locks.reviewsHeaderFormat}}, substituting
     per-client review counts from `brand-dna.trust`.
   - 3 review cards visible on desktop, side arrows for navigation,
     dot indicators below.
   - Each card: accent top border, dark glass background, large
     translucent quote mark (52px, 35% opacity, accent color), 5 stars,
     review text, accent-color avatar circle with reviewer initial.

5. WhyChooseUs
   - LEFT: section heading + 4+ value-prop bullets with icon-3d wrappers,
     followed by a "__REQUIRED__CTA_PRIMARY__" accent-color button.
   - RIGHT: full-section-height project photo with edge gradient fade
     into the text column.

6. Gallery
   - Infinite carousel of past projects, 3 cards visible at a time.
   - Each card: accent top border, 4/3 aspect image, caption row with
     accent-color left bar.
   - Side arrows + expanding dot indicator at bottom.

7. Process
   - Step count per {{playbook.process.stepCount}}; step titles + icons
     come from {{playbook.process.steps[*]}}.
   - Each card: accent top border, dark glass bg, muted accent digit,
     thin accent divider, icon-3d box for icon.
   - Risk-reversal line below grid:
     "{{playbook.copy-locks.riskReversalLine}}".
   - "__REQUIRED__CTA_PRIMARY__" accent-color button below disclaimer.

8. SpecialOffers
   - Cards driven by `brand-dna.special_offers.groups`; section omitted
     when none exist.
   - {{#if special_offers.financing.enabled}}
     Below the cards: left-bordered callout with financing through
     {{special_offers.financing.partner}}.
     {{/if}}

9. Services grid
   - 4 to 6 service cards depending on segment ({{segment}}).
   - Each card: photo top, accent line, service title, short description,
     "Learn More →" link in accent.

10. Founder section
    - Photo position and supporting-card titles come from the website
      template default; per-client overrides via
      `brand-dna.founder.photo_position` and
      {{playbook.copy-locks.founderSupportingCards}}.
    - Photo column: {{founder.name}} photo (object-top crop), floating
      accent-color stat card showing
      "{{trust.years_in_business}}+ YEARS OF EXPERIENCE",
      caption strip below the photo.
    - Text column: eyebrow "ABOUT {{company_name}}" in accent color, H2
      in metallic-text, 2px accent separator, two paragraphs of founder
      story, a personal-guarantee blockquote with accent left border:
      "{{founder.personal_guarantee_quote}}"
      attribution: {{founder.name}}, {{founder.title}}
    - Outline button "LEARN MORE ABOUT US →".
    - Supporting cards row at the bottom (titles from the playbook,
      bodies from per-client copy-deck). Each card: accent top border,
      dark glass bg, w-12/h-12 icon container with w-6/h-6 SVG,
      items-center text-center, text-3xl heading, text-sm body, p-10
      padding.

11. Blog preview (3 cards)
    - Featured image, date badge in accent, title, short excerpt.

12. ServiceAreas
    - Grid of cities from {{contact.service_areas}}, each as a small
      card.
    - Below: Google Maps embed of the primary address.
    - "__REQUIRED__CTA_PRIMARY__" accent-color button with btn-glow
      shadow.

13. CTABanner
    - Full-width section, inline lead form repeat, accent button.

14. Footer
    - 2px accent top line.
    - 4 columns: Brand (logo + tagline + social), Company links, Service
      links, Contact + CTA.
    - Accent "+" bullet prefix on all nav links.
    - Trust row: Google rating + Facebook rating + License:
      {{trust.license_number}}.
    - Copyright bar (justify-between): "© {{company_name}}" left,
      "Made with love by {{AGENCY_NAME}}" right.

DESIGN SYSTEM CONSTRAINTS
- Buttons: only two variants, primary (accent-color) and outline
  (secondary).
- Sharp corners everywhere except the availability dot.
- Single accent color throughout: every CTA, icon stroke, accent line.
- Section alternation: primary background and secondary background only.
- Two opposing dark polygon overlays on every section for depth.
- Heroicons thin-line style, strokeWidth 1.5, fill="none", color = accent.
- Multi-color exception: ONLY the platform review pill logos
  (Google G, Facebook f, BBB A+).

ZERO em-dashes anywhere in the rendered copy. Use colons for licence
numbers, periods for sentence breaks, commas for pauses.

OUTPUT MODE
{{#if mode_is_light}}
LIGHT mode: Invert the palette. Background becomes near-white,
text becomes {{palette.primary}}, glass panels become
rgba(255,255,255,0.85), accent stays {{palette.accent}}.
{{else}}
DARK mode: Use the palette as defined above.
{{/if}}

Return both:
1. A full-page mockup PNG at 1440px wide
2. The HTML/Tailwind code for the homepage as a single React component
```

---

## SLOTS

The following slots get substituted by brand-dna-agent before Stitch is
called:

- `{{mode}}`, "light" or "dark"
- `{{mode_is_light}}`, boolean for the conditional block
- `{{niche.noun}}` (from `playbook.vocabulary` or root stack
  `stack-state.json.niche`)
- `{{company_name}}`, `{{company_tagline}}`
- `{{region}}`, `{{segment}}`, `{{shape_mode}}`
- `{{palette.primary|secondary|muted|text_body|neutral|accent}}`
- `{{typography.heading|body}}`
- `{{logo.has_motif}}`, `{{logo.motif_description}}` (conditional block)
- `{{hero.eyebrow|h1_headline|tagline|mood}}`
- `{{trust.license_number|google_review_count|facebook_review_count|years_in_business}}`
- `{{contact.phone|service_areas}}`
- `{{founder.name|title|personal_guarantee_quote}}`
- `{{special_offers.financing.enabled|financing.partner}}` (conditional)
- `{{playbook.copy-locks.*}}` (every locked copy field; see
  `references/niche-playbook/schemas/copy-locks.schema.json`)
- `{{playbook.trust-signals.*}}` (badge + placement contracts)
- `{{playbook.process.stepCount|steps}}`
- `{{playbook.vocabulary.*}}` (section names, nav labels)
- `{{playbook.typography.headingCase}}`

Substitute using simple text replacement. Conditional blocks
(`{{#if}} ... {{/if}}`) use the value of the named field from
brand-dna.json or the niche playbook, render the contents if the value is
truthy (non-empty string, true boolean, non-zero number), omit otherwise.
