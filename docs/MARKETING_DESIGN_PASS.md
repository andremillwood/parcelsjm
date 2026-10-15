# Marketing design pass — client review

## Intent

Apply benefit-led advertising to the homepage and business journey: make the pleasure of a purchase tangible, explain the useful account features, reduce uncertainty, and offer a clear next action. This is an application of the approach described in [Drew Eric Whitman’s Cashvertising overview](https://drewericwhitman.com/products/), not a claim of measured conversion improvement.

The art direction uses contemporary Jamaican home and small-business settings, warm cream, original navy/yellow, human-scale scenes and restrained typography. The original Parcels JA logo is unchanged. Real signup, address activation, rates, contact sending and other operational gates remain unchanged. Resend remains deferred. No fabricated statistics, testimonials, warehouse photography, delivery promises or rates were introduced.

The homepage offers registration exploration, a how-it-works journey and a clearly identified customer demo with fictional packages. Business imagery continues into the business account journey. AI-generated scenes retain illustrative alt text and internal provenance. At the owner’s request, the public-facing AI captions were removed; the scenes do not carry customer names, testimonials or claims of actual facilities.

## Assets and provenance

Generated with the built-in image_gen tool on 12 October 2026; converted to WebP for delivery. Next Image supplies responsive variants, a reserved aspect ratio, eager hero loading and lazy loading below the fold. No additional client JavaScript or dependencies.

- `public/marketing/unpack-at-home.webp`: 1120 × 1400, approximately 121 KiB.
- `public/marketing/small-business-jamaica.webp`: 1280 × 853, approximately 112 KiB.

### Hero generation prompt

Create a premium editorial lifestyle photograph for a Jamaican parcel company's marketing website, portrait 4:5 composition. An adult Black Jamaican woman with natural hair, wearing a simple warm golden yellow blouse, sitting at a wooden table in a tasteful lived-in contemporary Kingston home, genuinely delighted while lifting a pair of simple unbranded white canvas sneakers from an open plain kraft cardboard shipping box. Natural candid expression, eyes toward purchase, anatomically correct hands. Modern Caribbean interior: warm cream plaster, louvered windows, subtle greenery and soft hillside view outside, no tourist cliches. Natural morning side light, tactile film-like texture, understated art direction, navy and warm ochre accents. Frame medium wide to include her face, both hands, open parcel and some room context. The box occupies lower third, face upper middle. This is an illustrative aspirational shopping scene, not documentary evidence of a real customer. No text, no logos, no shipping labels, no watermarks, no flags, no courier uniforms, no aircraft. Photorealistic natural photography, beautiful but believable, not glossy stock-photo pose.

### Business generation prompt

Use case photorealistic-natural. A premium editorial lifestyle photograph for a Jamaican small-business shipping website. Landscape 3:2. One adult Black Jamaican male small-business owner in a relaxed navy overshirt working at a sunlit wooden studio table, checking a plain open cardboard parcel containing neatly folded unbranded terracotta and cream textiles, notebook and laptop beside him. Contemporary modest creative studio in Kingston, cream walls, louvered windows, leafy courtyard softly visible, thoughtful focused expression rather than looking at camera. Rich natural afternoon light, warm tactile honest texture, beautifully composed documentary-style campaign image, palette warm cream terracotta navy and natural green. Medium wide composition, person and parcel central with breathing space. Fictional illustrative business scenario, not a real customer or logistics facility. No logos, legible text, uniforms, flags, shipping labels, warehouse shelves, or unrealistic luxury. Hands anatomically correct. No testimonial or text overlay.

## Release scope

Branch `codex/marketing-imagery`, Vercel project `parcelsjm`, preview only. The user approved merging and releasing this design on 15 October 2026, with the public-facing AI captions removed. No database migrations or environment changes are required by this visual pass.
