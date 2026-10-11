# Parcels JA provisional development plan

This plan maps only to the ten numbered objectives in the user's request. It must be reconciled with `PARCELS_JA_PRD_CODEX.md` before Phase 0 can be completed. The gates below are proposed verification criteria, not invented PRD acceptance criteria. Do not advance phases until the preceding gate passes.

| Phase | User objectives | Deliverables | Proposed completion evidence |
| --- | --- | --- | --- |
| 0: Audit and foundation | 1, 9, 10 | PRD traceability, architecture decisions, approved-input register, reproducible dependencies, validation commands and CI, environment separation and preview policy | Every PRD criterion mapped; baseline build/typecheck/security review recorded; no unresolved Phase 0 blockers |
| 1: Brand and acquisition | 2, 3 | Preserve approved logo; shared tokens/components; responsive marketing and personal/business registration interfaces using approved copy | Keyboard/mobile/desktop checks; accessible forms; business journey retained; no invented claims; incomplete registration clearly disclosed |
| 2: Identity and data security | 3, 4 | Supabase migrations, customer identity/profile lifecycle, staff authorization, private storage policy foundations | Auth and recovery flows tested; anonymous/customer-A/customer-B/staff access matrix passes; migration reset verified; privileged keys remain server-only |
| 3: Customer shipment processing | 5 | Packages, pre-alerts, document validation/upload, history and required actions | Cross-customer isolation and invalid-upload tests; real persistence verified; loading/empty/error states; private downloads authorized |
| 4: Administrative operations | 6 | PRD-defined intake, reconciliation, document review, status transitions and audit history | Authorized staff complete operational journeys; invalid transitions rejected; retries/concurrency do not duplicate actions; actor attribution retained |
| 5: Transactional communication | 7 | Resend templates, durable event delivery, retry/idempotency and delivery status | Authorized test-recipient delivery; duplicate-event and provider-failure tests; no secrets or documents leaked; approved sender configured |
| 6: Financial operations | 8 | Versioned approved pricing/cost rules; PRD-defined calculations and reporting | Business-approved reference cases, rounding/currency rules and margin checks pass; no calculation enabled without approved rule set |
| 7: Release readiness | 9, 10 | Full regression, operational docs, privacy/security review, Vercel preview and rollback verification | Preview smoke/end-to-end tests pass against isolated data; critical blockers closed; release evidence captured before any production action |

## Proposed architecture boundaries

- Retain Next.js App Router and TypeScript. Separate marketing, authenticated customer and staff route groups, with shared accessible UI components and design tokens.
- Use Supabase Auth and Postgres with migrations and explicit ownership/staff policies. Authorize at the server and database boundary, not only in navigation. Never derive staff access from user-editable metadata.
- Keep document objects private. Define allowed types, limits, ownership, retention and scanning requirements from the PRD before implementation. Downloads require authorization and limited-lived access.
- Validate mutations on the server. Keep shipment events and operational transitions distinct from customer-entered pre-alert data. Audit privileged changes.
- Isolate transactional email behind a server-only service and durable event/outbox boundary. Provider retry must not duplicate customer notifications.
- Keep finance rules versioned with approval and effective dates. Do not supply default rates, tax assumptions, exchange rates or cost formulas.
- Preserve an external-provider adapter boundary and a place for provider references/idempotent reconciliation. DMD automation, credentials, scraping and portal access remain out of scope.
- Separate local, preview and production configuration/data. Preview must not email real customers or mutate production records.

## Approved-input register

| Input | Current status | Work gated |
| --- | --- | --- |
| Complete PRD and acceptance criteria | Missing | Definitive scope and Phase 0 completion |
| Original logo/brand assets | Not present in repository | Brand fidelity sign-off |
| Warehouse addresses and assignment rules | Unverified | Address display and customer activation |
| Service capabilities, transit promises and support details | Unverified | Live marketing claims and operational workflows |
| Pricing, costs, currency/rounding/tax rules and approvals | Unverified | All financial calculations |
| Supabase environment and staff-role model | Not assessed | Database/auth deployment |
| Resend verified sender and authorized test recipients | Not assessed | Email verification |
| Vercel project/environment configuration | Not assessed | Preview deployment |

## Per-phase report

Record delivered requirements and acceptance IDs, changed behavior, commands/tests and their actual results, browser/database/preview evidence where relevant, commit SHA, remaining blockers and whether the phase gate passed. Never report planned checks as completed tests.
