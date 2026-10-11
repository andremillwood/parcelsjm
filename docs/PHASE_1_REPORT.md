# Phase 1 — marketing and inquiry foundation

Status: marketing preview deployed and verified; **phase exit gate remains open** until a hosted inquiry is stored and delivered to the approved staff inbox. No Phase 2 work or production release is implied.

## Scope and requirement mapping

| Requirement | Implemented behavior                                                                                      | Acceptance status                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| ACQ-01      | Responsive home; registration, rate and tracking entry points                                             | Preview journey verified locally; no live activation                                     |
| ACQ-02      | How it works, FAQs/help, service/about explanations                                                       | Planned capabilities identified; no unverified service promises                          |
| ACQ-03      | Minimal inquiry fields, explicit response consent, server validation, honest blocked/success/error states | Unit and disabled-preview tests pass; hosted enabled flow blocked                        |
| ACQ-05      | Business volume/category/contact/needs, private inquiry and notification record                           | Admin UI remains Phase 3; hosted insertion/delivery unverified                           |
| ACQ-06      | Page titles/descriptions/canonical/Open Graph; local fonts; robots and sitemap routes                     | Preview is deliberately noindex with empty sitemap; public domain and launch SEO pending |
| PRD §4      | Shared tokens/components, original full logo, mobile menu, focus and reduced motion                       | Original logo checksum unchanged; responsive/accessibility verification recorded below   |

Registration is a local-only demonstration; personal/business entry points preserve intent. It creates no account or address and does not accept shipping terms. Login, password reset, tracking and legal pages give truthful unavailable/pending states. Rates, warehouse addresses, statistics, delivery commitments and DMD automation remain absent.

## Architecture and safeguards

The marketing route group owns shared layout/navigation/footer. Server-rendered content uses client components only for navigation and form interaction. See `DESIGN_SYSTEM.md`.

The additive migration creates only `marketing_inquiries`, `marketing_notifications` and server-only RPCs. RLS is enabled and anon/authenticated grants revoked. Atomic deduplication, HMAC identifiers, persistent rate limits and notification leases are tested against PGlite PostgreSQL. Resend uses a stable idempotency key and sends only an opaque inquiry reference to staff. Provider acceptance is distinct from inbox delivery. See `INQUIRY_RUNBOOK.md` for activation and retry limits.

`supabase init` completed. Existing CLI identity cannot link `pftjfzmbqqzzfxgypwkl`; a new user login has been initiated. Supabase service-key REST authentication returned 200 and exposed no application table paths. Direct PostgreSQL inspection failed certificate verification; verification was not disabled. **No hosted migration or schema mutation has been applied.**

The owner-supplied Supabase URL, publishable key, server key and Resend key were configured only on Vercel project **parcelsjm**, **Preview**, branch **codex/phase-1**. Secrets are absent from source and this report. Lead collection stays disabled.

## Verification

- Formatting, ESLint, strict TypeScript and production build: passed (`npm run check`).
- Unit/database/provider tests: 10 passing, including role denial, consent, validation, body limits, origin checks, deduplication, three rate-limit dimensions, notification lease/retry rules and provider failure handling.
- Browser suite: 100 tests passed initially across 360/390/768/1024/1440; three mobile-menu cases needed a locator correction because the accessible button name changes while open. Two desktop cases intentionally skip mobile-only behavior. Corrected rerun: all three mobile cases passed. Total applicable browser cases: 103 passing.
- All 16 pages passed axe checks for WCAG 2 A/AA, 2.1 AA and 2.2 AA with no detected violations; no horizontal overflow or page errors. Automated results are not a full accessibility certification.
- Dependency audit: zero vulnerabilities after dependency cleanup.
- Brand checksum: `f7077fc6689a760db3888f7aa4b179fe36388b9306e7d79366d5deb83f6952b8`, unchanged.
- Supabase live insertion, live Resend delivery, enabled hosted form and hosted database advisor results are **not verified**.

## Outstanding dependencies

1. Complete owner-authorized Supabase CLI access and review/apply/verify the migration against the specified isolated project. If using direct SQL, obtain the project's trusted CA certificate from its dashboard.
2. Provide a verified Resend sender and authorized staff notification inbox. The supplied restricted key cannot list verified domains; no test email has been sent.
3. Approve and publish inquiry privacy/controller/contact/retention information, then configure its version, independent rate-limit/retry secrets and enable flags.
4. Run hosted contact and business submission tests, inspect private records and verify inbox arrival/deduplication. This is the unmet Phase 1 exit criterion.
5. Before public launch: approved legal/company/support details and canonical domain routing. Pricing and operational approvals remain later launch dependencies.

Stay in Phase 1 until its gate passes. No production promotion, payment integration or DMD portal work was performed.

## Preview verification — implementation commit 6892fa3

- Project: `parcelsjm` (`prj_E4gSDv2VM7pf278v27w4EdvcCYWE`), Andre Millwood’s projects team.
- Target: Preview, `codex/phase-1`; deployment `dpl_9uRQt9fZqvmYiUTKqxAbhLFP8KDL`, READY.
- URL: https://parcelsjm-fn2472lz1-andre-millwoods-projects.vercel.app/
- Build: approximately 43 seconds; Next.js 15.5.27, Node 22 package engine.
- GitHub CI: run 38177490881 passed all checks, audit and full browser suite.
- Authenticated hosted Chrome: nine routes returned 200/noindex with no horizontal overflow at 390px. Personal entry, business selection, fictional registration submission and Escape dismissal passed. Disabled contact POST returned 503, unauthorized retry POST returned 401. No page errors. Desktop and mobile screenshots captured.
- Deployment Protection remained enabled. Temporary verification access is intentionally omitted from this report.
- First local Lighthouse 13.5.0 mobile audit: performance 98, accessibility 100, best practices 96; LCP 2.2s, TBT 80ms, CLS 0.006. Its missing favicon request was corrected by referencing the unchanged original logo. SEO 69 reflects the intentional indexing block. Final audit recorded separately below.

Screenshots: `evidence/phase-1/home-390-viewport.png`, `home-1440-viewport.png`, full-page mobile/desktop home and registration images, and hosted home images. The keyboard-test screenshots include a focused skip link; the dedicated evidence images show the normal initial state.

Draft PR: https://github.com/andremillwood/parcelsjm/pull/2, based on Phase 0 branch. Phase 0 PR remains unmerged. The supplied document’s illustrative combined Phase 0/1 prompt was treated as reference; the user’s sequential phase request controls scope.

## Final local verification additions

- Six enabled-form browser tests passed (contact, rates, business at 390/1440px). They use fictional configuration and intercepted 503/202 responses, checking required consent, retry identity, reset/success messages and accessibility. No provider is contacted. They now run in CI via `npm test`.
- Final local Lighthouse 13.5.0: **100 performance, 100 accessibility, 100 best practices**. LCP 1.1s, TBT 80ms, CLS 0.006. No console errors. Meets the PRD's 85/95/95 lab targets. This is a local simulated mobile result, not production field data. SEO remains 69 intentionally while indexing is blocked. Summary: `evidence/phase-1/lighthouse-mobile.json`.
- The original logo now also supplies browser icon metadata, eliminating the missing favicon request without introducing a derivative logo.

## Final tested implementation — 37a6d23

- Commit: `37a6d23e246a903e0f203ce525f0f6a793ec81b7` (implementation starts at `6892fa3`).
- Vercel Preview: https://parcelsjm-95ik6qk9d-andre-millwoods-projects.vercel.app/ — READY in approximately 35 seconds, project `parcelsjm`, deployment `dpl_3nq5oWCmsHaL5TYBZW7KfwnTHJ3V`.
- Repeated authenticated hosted checks on this commit: nine routes 200/noindex, personal and business registration journeys, fictional demo submission, mobile menu, original-logo icon 200, contact API 503 and unauthorized retry API 401. No page errors or tested viewport overflow.
- GitHub CI [run 38177869589](https://github.com/andremillwood/parcelsjm/actions/runs/38177869589): **success**, including clean install, formatting, lint, TypeScript, production build, dependency audit and all tests.
- Test totals: **10 unit/database/provider + 103 marketing browser + 6 mocked enabled-form tests passed**. Two desktop instances of the mobile-only menu test are intentionally skipped.
- The report-only commit following this section does not alter the tested application. The URL above is the immutable verified implementation preview.

The phase gate remains open: no hosted inquiry has yet been stored or communicated. Continue with the owner login, migration and approved sender/inbox/privacy inputs before Phase 2.
