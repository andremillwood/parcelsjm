# Considered design pass — 20 October 2026

Reference: [How to de-slopify your designs — Maya Brennan](https://uxdesign.cc/how-to-de-slopify-your-designs-4c40c57c1dc9). Applied principle: identify specific visual problems, remove redundant framing, make explicit aesthetic decisions and verify the rendered result. The article is guidance, not a component source; no article artwork or another product's design was copied.

## Scope and preservation

Reskin, not rebuild. Preserve Parcels JA's original logo, approved Jamaican lifestyle imagery, navy/yellow palette, Inter, URLs, content hierarchy and conversion paths. Keep backend/API/schema logic, approved commercial rules and security gates unchanged. No production release is included. Signup stays disabled; Resend/DMD remain deferred; policies stay drafts; unscanned documents stay quarantined.

## Audit and design decisions

| Surface             | Observed issue                                                                                     | Change                                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Shared app shell    | Repeated arrow glyphs; large bright active-nav block; detail screens lost their active destination | Consistent local SVG icons, restrained yellow active edge, contextual breadcrumbs and active-location semantics for subsections          |
| Customer overview   | Greeting and three disconnected cards outweighed package actions; repeated fictional-data captions | Clear task heading; compact linked activity summary; one recent-record scope note; existing explicit demo banner retained                |
| Operations overview | Marketing-style headline and equal-weight counters                                                 | Operational heading and direct links from current activity into the relevant documents/intake workflows                                  |
| Work queues         | Every task had the same yellow edge; assignment metadata consumed multiple full-width rows         | Yellow marks urgent/overdue work only; compact metadata columns on desktop, stacked on mobile; all assignment/source controls preserved  |
| Billing             | Multiple equal-weight boxes and long pill backgrounds competed with the balance                    | One grouped invoice summary, prominent outstanding balance, subordinate collections/state, compact status labels and less nested framing |
| Marketing/auth      | Repeated secondary arrows and tracked uppercase context labels                                     | Quieter navigation/secondary actions, readable hero context, clearer registration heading, retained imagery and hero composition         |
| Feedback/states     | Staff failures looked like ordinary success/status feedback                                        | Explicit error feedback and alert semantics; busy/retry and all validation behavior preserved                                            |

## Verification plan

Build, formatting, lint/types, full existing unit/browser/form suite, narrow/desktop screenshots, keyboard/navigation/zoom checks and axe accessibility. Verify summary links, package filtering, child-route navigation context and demo non-persistence. Check the authorized parcelsjm preview with disabled registration and protected real apps. Compare source detector results with the same baseline; document heuristic false positives rather than suppressing them. Confirm original logo/lifestyle asset checksums unchanged. Release only after preview review.

The source detector's document warning points at the shared `post` helper. Existing callers catch failures and the rendered document list provides an empty/error state; inspect those actual branches before treating this heuristic as a regression.
