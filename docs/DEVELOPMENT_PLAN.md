# Parcels JA development plan — PRD v1.0

Source: `PARCELS_JA_PRD_CODEX.md` (unchanged local reference in `docs/reference/`, excluded from Git because it includes internal commercial context), dated 2026-10-11. This replaces the provisional numbering from the intake audit. The user asked to begin with Phase 0 and verify each phase before continuing. The document's embedded request to implement Phases 0 and 1 together does not override that sequencing.

## Phase gates

| Phase | Scope                                                                                                                                                             | Required exit evidence                                                                                                                                        |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Repository/asset audit; npm and locked dependencies; TypeScript, ESLint, Prettier, browser test runner, CI, environment template, original logo, honest demo copy | Clean build/typecheck/lint/tests; mobile/desktop screenshots and accessibility findings; Vercel preview deployed and verified with demo labels                |
| 1     | Shared brand/component system; marketing routes, approved-copy/stub policies, registration entry, business/contact leads and SEO                                  | Mobile/desktop acquisition flow; consent/anti-abuse; contact inquiry actually stored and communicated, not just a success message                             |
| 2     | Supabase Auth, migrations/RLS, profile, onboarding and validated shipping account assignment                                                                      | Verified sign-up/reset/session flows; customer A/B isolation; server and DB roles; pending-address and activation flows                                       |
| 3     | Pre-alert, packages, documents, manual staff events, unmatched queue and audit                                                                                    | Manual end-to-end shipment workflow without DMD; malicious upload tests; authorization matrix; explicit transitions and append-only corrections               |
| 4     | Resend/outbox/webhooks; approved rate cards, invoices, manually verified payments and contribution                                                                | Verified event produces one logical notification; retry/replay tests; no quote without approved rules; immutable financial records and audited reconciliation |
| 5     | Controlled launch, approved policies/contact, analytics, security/performance and pilot                                                                           | Register-to-operated-shipment pilot; no critical privacy/auth issues; profitability evidence and rollback/runbook checks                                      |
| 6     | Deferred DMD assessment and adapter implementation                                                                                                                | Separate approval and portal review; API/export preferred; shadow reconciliation before verified publication                                                  |

P0 denotes launch priority, not Phase 0. Business-dependent launch requirements remain blocked until their inputs are approved. No phase completion implies the entire MVP is production ready.

## Requirement traceability

All functional IDs are listed below. A planned test is not evidence of acceptance. Phase 0 adds demo safeguards for ACQ-03 and FIN-02, but does not claim either complete for the live product. NTF-02 includes Auth templates configured in Phase 2 and operational templates delivered in Phase 4.

| PRD ID  | Delivery phase             | Status                | Verification method                                              |
| ------- | -------------------------- | --------------------- | ---------------------------------------------------------------- |
| ACQ-01  | 1                          | Planned, not accepted | Browser journey + approved-copy review                           |
| ACQ-02  | 1                          | Planned, not accepted | Browser journey + approved-copy review                           |
| ACQ-03  | 1                          | Planned, not accepted | Browser journey + approved-copy review                           |
| ACQ-04  | 5                          | Planned, not accepted | Browser journey + approved-copy review                           |
| ACQ-05  | 1                          | Planned, not accepted | Browser journey + approved-copy review                           |
| ACQ-06  | 1                          | Planned, not accepted | Browser journey + approved-copy review                           |
| AUTH-01 | 2                          | Planned, not accepted | Auth integration + RLS isolation + browser flow                  |
| AUTH-02 | 2                          | Planned, not accepted | Auth integration + RLS isolation + browser flow                  |
| AUTH-03 | 2                          | Planned, not accepted | Auth integration + RLS isolation + browser flow                  |
| AUTH-04 | 2                          | Planned, not accepted | Auth integration + RLS isolation + browser flow                  |
| AUTH-05 | 2                          | Planned, not accepted | Auth integration + RLS isolation + browser flow                  |
| AUTH-06 | 4                          | Planned, not accepted | Auth integration + RLS isolation + browser flow                  |
| PKG-01  | 3                          | Planned, not accepted | Transition/unit + ownership integration + operational E2E        |
| PKG-02  | 3                          | Planned, not accepted | Transition/unit + ownership integration + operational E2E        |
| PKG-03  | 3                          | Planned, not accepted | Transition/unit + ownership integration + operational E2E        |
| PKG-04  | 3                          | Planned, not accepted | Transition/unit + ownership integration + operational E2E        |
| PKG-05  | 3                          | Planned, not accepted | Transition/unit + ownership integration + operational E2E        |
| PKG-06  | 3                          | Planned, not accepted | Transition/unit + ownership integration + operational E2E        |
| PKG-07  | 3                          | Planned, not accepted | Transition/unit + ownership integration + operational E2E        |
| PKG-08  | 3                          | Planned, not accepted | Transition/unit + ownership integration + operational E2E        |
| PKG-09  | 6 (deferred)               | Planned, not accepted | Transition/unit + ownership integration + operational E2E        |
| DOC-01  | 3                          | Planned, not accepted | Upload abuse + storage isolation + review E2E                    |
| DOC-02  | 3                          | Planned, not accepted | Upload abuse + storage isolation + review E2E                    |
| DOC-03  | 3                          | Planned, not accepted | Upload abuse + storage isolation + review E2E                    |
| DOC-04  | 3                          | Planned, not accepted | Upload abuse + storage isolation + review E2E                    |
| DOC-05  | 3                          | Planned, not accepted | Upload abuse + storage isolation + review E2E                    |
| DOC-06  | 3                          | Planned, not accepted | Upload abuse + storage isolation + review E2E                    |
| DOC-07  | 3                          | Planned, not accepted | Upload abuse + storage isolation + review E2E                    |
| DOC-08  | 5                          | Planned, not accepted | Upload abuse + storage isolation + review E2E                    |
| FIN-01  | 4                          | Planned, not accepted | Approved reference-case unit tests + immutable/audit integration |
| FIN-02  | 4                          | Planned, not accepted | Approved reference-case unit tests + immutable/audit integration |
| FIN-03  | 4                          | Planned, not accepted | Approved reference-case unit tests + immutable/audit integration |
| FIN-04  | 4                          | Planned, not accepted | Approved reference-case unit tests + immutable/audit integration |
| FIN-05  | 4                          | Planned, not accepted | Approved reference-case unit tests + immutable/audit integration |
| FIN-06  | Later, separately approved | Planned, not accepted | Approved reference-case unit tests + immutable/audit integration |
| FIN-07  | 4                          | Planned, not accepted | Approved reference-case unit tests + immutable/audit integration |
| FIN-08  | 4                          | Planned, not accepted | Approved reference-case unit tests + immutable/audit integration |
| NTF-01  | 4                          | Planned, not accepted | Outbox/replay/signature integration + authorized delivery        |
| NTF-02  | 4                          | Planned, not accepted | Outbox/replay/signature integration + authorized delivery        |
| NTF-03  | 4                          | Planned, not accepted | Outbox/replay/signature integration + authorized delivery        |
| NTF-04  | 4                          | Planned, not accepted | Outbox/replay/signature integration + authorized delivery        |
| NTF-05  | 4                          | Planned, not accepted | Outbox/replay/signature integration + authorized delivery        |
| NTF-06  | 4                          | Planned, not accepted | Outbox/replay/signature integration + authorized delivery        |
| NTF-07  | 4                          | Planned, not accepted | Outbox/replay/signature integration + authorized delivery        |
| NTF-08  | Later, separately approved | Planned, not accepted | Outbox/replay/signature integration + authorized delivery        |
| OPS-01  | 3                          | Planned, not accepted | Role matrix + audit integrity + staff E2E                        |
| OPS-02  | 3                          | Planned, not accepted | Role matrix + audit integrity + staff E2E                        |
| OPS-03  | 3                          | Planned, not accepted | Role matrix + audit integrity + staff E2E                        |
| OPS-04  | 3                          | Planned, not accepted | Role matrix + audit integrity + staff E2E                        |
| OPS-05  | 3                          | Planned, not accepted | Role matrix + audit integrity + staff E2E                        |
| OPS-06  | 5                          | Planned, not accepted | Role matrix + audit integrity + staff E2E                        |
| DMD-01  | 6 (deferred)               | Planned, not accepted | Adapter/reconciliation contract; no portal access in MVP         |
| DMD-02  | 6 (deferred)               | Planned, not accepted | Adapter/reconciliation contract; no portal access in MVP         |
| DMD-03  | 6 (deferred)               | Planned, not accepted | Adapter/reconciliation contract; no portal access in MVP         |
| DMD-04  | 6 (deferred)               | Planned, not accepted | Adapter/reconciliation contract; no portal access in MVP         |
| DMD-05  | 6 (deferred)               | Planned, not accepted | Adapter/reconciliation contract; no portal access in MVP         |
| DMD-06  | 6 (deferred)               | Planned, not accepted | Adapter/reconciliation contract; no portal access in MVP         |

## Cross-cutting acceptance

- PRD §3: explicitly enumerate URLs; reserve `/app` for authenticated customers and `/admin` for staff. Existing `/dashboard` stays clearly a demo until replaced/redirected deliberately.
- §4: preserve the original full logo. Phase 1 establishes tokens, accessible components, consistent font, touch sizing and reduced-motion behavior.
- §6–8: migrations reproducible; server and RLS authorization; transactional event/state/outbox writes; journeys A–F exercised end to end.
- §9–10: no historical tariff promoted to approved rates, no fabricated social proof, no implicit freight/coverage commitments.
- §11–12: structured redacted errors, private files, quarantine policy, anti-abuse, retention/counsel review, recovery plan, tests at 360/390/768/1024/1440 and Lighthouse targets. Phase 0 accessibility checks do not certify later flows.
- §14: funnel through profitable repeat shipments; consent/retention before analytics; no sensitive item/customer data in third-party events.
- §15 / D-01–D-10: maintain the open decisions from the PRD. The supplied logo resolves asset availability only. Historical tariff and flyer are not current commercial approval. Vercel access is verified for preview; Supabase/Resend production access is not yet assessed.

## Architecture decisions

Retain one Next.js App Router app. Use npm with exact direct dependencies and committed lockfile. Keep client components limited to interactive forms/demo controls; authorization belongs on the server and database.

Use separate unmatched observations rather than customer-visible packages with uncertain ownership in Phase 3. Reconciliation explicitly associates a verified observation with a customer package. Customer pre-alert fields cannot set warehouse-received, verified, paid or delivered states. Fulfillment, document and payment states remain separate.

Use DB-validated staff role assignments, not customer-editable JWT metadata. Supabase service credentials stay server-only. Private storage authorizes both intent and completed object, with MIME/size verification and quarantine before review/download.

Use a durable event outbox; append verified shipment events and enqueue notification atomically. Provider acceptance and delivery are distinct. Retry/replay must preserve logical message identity.

Keep approved pricing snapshots separate from experimental cost assumptions. Missing/unallocated costs remain visible rather than silently zero. Payment capture is excluded until a provider is approved.

Reserve an external-provider boundary for `listPackagesSince`, `getPackage`, `normalizeExternalEvent`, `reconcile`, and `health`. Future observations include source, raw ID, capture time, checksum and validation result. No executable DMD adapter, credential collection, fake sync or portal automation in Phase 0.

## Phase reporting

Each report records requirement IDs, files/behavior, migrations, actual check results, commit, preview URL/status, screenshots, accessibility findings and blockers. Stop at a failed phase gate; do not label scaffolding as a completed external integration.
