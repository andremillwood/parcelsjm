# Phase 1 — marketing and inquiry foundation

Status: implementation prepared; **phase exit gate remains open** until a hosted inquiry is stored and delivered to the approved staff inbox. No Phase 2 work or production release is implied.

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
