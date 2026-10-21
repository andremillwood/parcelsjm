# Logistics visual direction — 20 October 2026

Reference: [LogiHub](https://logi-hub-react.vercel.app/?storefront=envato-elements). The owner requested a strong aesthetic cue across marketing and signed-in apps. The reference was rendered and inspected; its photography-led composition, contrasting sections, rounded actions and angular panel details informed original Parcels JA styling. No template code, photographs, testimonials, partner marks, addresses or service claims were imported.

## Scope and preservation

Substantial reskin with the existing homepage section order, URLs, metadata, copy and conversion paths preserved. The new shipping shortcut navigation links to existing tracking, process and help pages. Original Parcels JA logo and Jamaican lifestyle assets are unchanged. Original Inter and navy/yellow remain the shared brand. No new runtime dependency, font, animation library, migration, API contract, privilege or approved pricing rule.

Live signup remains disabled; Resend/DMD deferred; policies marked drafts; unscanned files quarantined. Production is not included in this review increment. The signed-in design is shared with the explicitly fictional demo; no customer data or real account changes were required for visual verification.

## Review

| Before                                   | After                                                                            | Purpose                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Navy navigation and split portrait hero  | Light branded navigation, large photographic hero, overlap of shipping shortcuts | A stronger logistics identity with direct routes to useful tasks |
| Quiet editorial feature rows             | Navy feature field and large numbered process steps                              | More contrast and a clearer reading rhythm                       |
| Wide business image followed by copy     | Angular image frame alongside business context on desktop                        | Stronger imagery without inventing operational capabilities      |
| Dark workspace sidebar and quiet heading | Light sidebar, bold navy page header and yellow primary action                   | Carry the same identity into customer/admin work                 |
| Rectangular action controls              | Pill actions, compact status pills and restrained work panels                    | Reference-informed controls with readable dense forms            |
| Older homepage app image                 | Screenshot captured from the revised actual fictional app                        | Marketing proof matches the interface being reviewed             |

## Verification

- Source detector v0.13.0 on the same 13 workspace files: **0 errors / 1 warning before and after**. The existing document-helper heuristic is unchanged; its callers catch errors and the rendered UI has empty/error branches. No suppression was added.
- New browser coverage checks all three shipping shortcut destinations at five viewport widths.
- Preview verification covers marketing, customer/admin overviews, billing, queues, registration, documents and protected-app gates, including narrow layouts, keyboard focus and reduced-motion behavior.
- All existing business/security tests remain required in CI. No shipment receipt, payment, scan or delivery promise is inferred from presentation.

Craft Read: Jamaican shipping platform, photography-led marketing and operational product surfaces, original navy/yellow, variance 6 marketing / 4 product, signature: clipped parcel-label corner. Existing motion stays low; operational density remains functional. Preview review precedes any production release.

Hosted implementation preview `041cf7b` passed HTTP, accessibility, browser-error and overflow checks on seven screens at 390px and 1440px. Additional checks passed summary links, active child navigation, mobile menu, keyboard focus, reduced-motion context, narrow layout, disabled signup API (503) and login gates for customer/admin routes. Lower homepage sections were inspected as individual viewport captures. The refreshed app image is an actual 1280 × 900 capture of the fictional demo. The initial dark-panel contrast issue was corrected before this verification. Final-head CI and deployment status are recorded on the pull request.
