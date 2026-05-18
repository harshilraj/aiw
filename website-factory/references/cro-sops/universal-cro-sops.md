# Universal CRO SOPs

Source: AIW course material. Moved here from the Research System framework where it lived in Appendix B. These SOPs are universal across niches. Niche-specific overrides come from the brief generated in Module 5 of the research stage.

The factory reads this file to enforce baseline CRO patterns on every build. Niche tailoring layers on top.

---

## Trust SOP (B1)

**Principle:** Every section earns its place by answering "what is this for?" Trust, conversion, or SEO. Trust loads earliest and heaviest in high-research, high-ticket niches.

**Trust stack:**
1. Hero with social proof inline (review count + stars + transformation image)
2. Reviews immediately after hero
3. Case studies and before-and-after, structured as situation, solution, result. Lead with the result.
4. Trust badges (certs, years, number of jobs, awards)
5. Press or "as seen in"
6. Team showcase and owner introduction (face on the page)
7. Reasons to choose, results-led not feature-led
8. FAQ that addresses actual buyer objections

**Niche overrides:**
- Medical and surgical: doctor credentials, compliance badges, patient guides
- Home services: licensed, bonded, insured. Service area map. Financing.
- Legal: bar associations, case results (where allowed), confidentiality
- High-aesthetics: photo-heavy, video testimonials, IG embed

**SOP checklist:**
- [ ] Hero: stars, review count, transformation image, primary + secondary CTA
- [ ] Reviews within first 1 to 1.5 scrolls
- [ ] 3+ case studies with measurable results
- [ ] Trust badges above the fold or in hero
- [ ] Team / owner photo on homepage
- [ ] Reasons to choose sells results, not features
- [ ] FAQ addresses 6 to 10 actual buyer objections

---

## Traffic SOP (B2)

**Principle:** Traffic is one of three legs. Built on SEO + GBP. Paid layers on separately.

**Workflow:**
1. **Keyword research before content.** Google Keyword Planner + SEMrush. 3 keywords per page, exact match, around 10 mentions per 1,000 words.
2. **Sitemap from keywords.** Homepage broad. Service pages "[service] in [city]". Service-area pages only where volume exists. About, Past Work, Contact brand-focused. Blog for long-tail.
3. **On-page mechanics.** H1 with primary keyword early in HTML. No cannibalization. Cluster related keywords. Alt text. Internal linking.
4. **GBP early.** Roughly a week of focused setup work. Traffic in weeks not months. Run parallel to SEO build.
5. **Technical.** Speed 1 to 3s desktop, under 5s mobile. 301 redirects for rebuilds. Schema markup.
6. **Reporting.** Results, then deliverables, then rankings.

**Stack:** Google Keyword Planner (free), SEMrush, Search Atlas (about $300 per month), NitroPack or WPMU Dev, CallRail, Agency Analytics or Agency Dashboard.

**SOP checklist:**
- [ ] Keyword research doc before any content
- [ ] Sitemap from research, not guessed
- [ ] H1, title, meta optimized per page
- [ ] GBP fully optimized and verified
- [ ] Speed: desktop above 85, mobile above 70
- [ ] 301 redirect map if rebuild
- [ ] CallRail tracking calls from every source
- [ ] Monthly report: results before deliverables before rankings

---

## Conversion SOP (B3)

**Principle:** 6 to 10% of organic visitors should convert (industry benchmark for high-intent local services).

**Conversion stack:**
1. Hero CTAs, primary (form) plus secondary (download)
2. Frictionless contact form, 3 to 4 fields max
3. Sticky or persistent CTA. Phone in navbar, click to call, sticky bottom bar.
4. Email magnets: ebooks, brochures, patient guides, price guides
5. Footer plus final contact form
6. Process or "what happens next" section
7. Multiple commitment levels: phone, form, magnet, calendar

**Universal converting wireframe:**
```
1.  Navbar (phone prominent)
2.  Hero (transformation + 2 CTAs + review badge)
3.  Reviews
4.  Case studies / before-and-after
5.  Trust badges + press strip
6.  About / why-us (results-led)
7.  Team / owner showcase
8.  Our process
9.  Email magnet CTA
10. FAQ
11. Services overview
12. Blog teaser
13. Footer (contact form + details)
```

**Measurement:** CallRail tags every call source. Forms tagged in GA4. Conversion rate per channel. Hotjar for the first 60 days.

**SOP checklist:**
- [ ] Two CTAs above the fold
- [ ] Form at 4 fields or fewer on first ask
- [ ] Phone in navbar, click to call on mobile
- [ ] At least one email magnet per key page
- [ ] Footer contact form on every page
- [ ] Conversion events tagged in GA4
- [ ] CallRail installed
- [ ] Hotjar installed for first 60 days post-launch

---

## How these get used in the factory

The `/tailor-factory` command reads these universal SOPs and merges them with niche-specific overrides from the website factory brief. The merged result lands in `website-factory/references/sop/sop-checklist.md`.

Every checklist item must answer: "Does this win the **end customer** of the niche business?" If a niche-specific override would weaken end-customer conversion, the universal SOP wins.
