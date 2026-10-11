# Customer and operations continuation — 2026-10-11

The owner authorized hosted migrations and continued customer/admin implementation with Resend deferred. This is a preview implementation, not phase acceptance or a production release.

## Delivered scope

- Identity: Supabase SSR cookies, verified user lookup, protected `/app` and `/admin`, database-backed staff roles, profile/onboarding and pending shipping-address handling. Public registration remains gated by approved policies. Existing verified accounts can sign in independently of that gate.
- Customer: responsive overview, searchable packages, pre-alert validation/persistence, verified event timeline, support requests and team replies, profile and security pages. Requests cannot set operational shipment, payment or document approval states.
- Operations: customer directory, verified warehouse assignment, package state transitions, private unmatched intake and explicit exact-reference reconciliation, support resolution and append-only audit history. Every staff write is checked again by the database.
- Financial and integration boundaries: no price calculations, invoices, payments or warehouse seeds. DMD is untouched. Shipment events create deferred outbox records; no worker sends them.
- Design: existing navy/yellow brand and unchanged original logo; separate fictional `/preview/app` and `/preview/admin` routes for review without credentials.

## Database

Target: `pftjfzmbqqzzfxgypwkl`. Initial inspection found zero auth users and zero public tables. The inquiry and identity migrations were applied; security advisors returned no issues. The package operations migration is also applied. All three versions match remote migration history; all 12 public tables have RLS, and a second hosted security advisory check returned no issues. No reset or production app release is authorized.

## Local checks

14 unit/integration tests passed, including migration execution in PostgreSQL-compatible PGlite, ownership isolation, privilege escalation denial, invalid/stale transitions, replay handling, intake matching, immutable audit and deferred outbox. Lint and TypeScript passed. The production build passed. Browser testing passed 118 checks across 360/390/768/1024/1440 pixels, with two intentionally skipped desktop mobile-menu checks; six additional inquiry-form tests passed. Production dependency audit reported zero vulnerabilities.

On the immutable Vercel preview, customer/admin design pages passed accessibility and overflow checks at 390 and 1440 pixels. Real Supabase sign-in, SSR profile loading, private no-store headers, non-staff admin denial, sign-out and protected redirects passed using an unprivileged temporary QA account. Public registration returned 503 without approved policies. Provider settings confirm signup disabled and email auto-confirmation false; the reviewed Auth config also raised minimum password length from 6 to 12 without changing undeclared settings.

Full hosted customer-to-staff write verification is pending: automatic approval review rejected activating the synthetic QA accounts and granting a temporary QA owner role without explicit authorization for that privileged assignment. The owner has been asked to approve that exact setup. Local transactional tests cover those write paths; they are not a substitute for the pending hosted browser flow.

Initial implementation commit: `206a30fbad97349b363a1f32a660aa3c47e2ffed`. Draft PR: https://github.com/andremillwood/parcelsjm/pull/3. Verified preview: https://parcelsjm-mcxnikfh8-andre-millwoods-projects.vercel.app (existing project parcelsjm, Preview environment). Screenshots: `docs/evidence/customer-operations/`.

## Remaining acceptance gates

- Approved account/privacy policies, Auth redirect configuration and actual registration/reset email delivery. Resend remains explicitly deferred.
- A real staff account and owner-authorized role assignment; no arbitrary account is promoted automatically.
- Verified warehouse details and unique customer assignment rules.
- Document storage, upload quarantine/scanning, review/download authorization and malicious-file verification. Upload UI is disabled; no file is accepted or presented as scanned.
- Approved prices, landed costs, payment/release rules. Shipment transitions stop at arrival; release/delivery is not implemented until those controls exist.
- Staff corrections, richer assignment/priority controls, pagination beyond the initial 100 records, production monitoring/recovery and final PRD acceptance remain follow-up work.

## Operating notes

Use `supabase migration list --linked` and `supabase db advisors --linked --type security` to inspect hosted state. Never reset the hosted database. Add corrections as new migrations.

Bootstrap a real staff role only after verifying the intended account identity with the owner. Roles are stored in `admin_role_assignments`, never user metadata. Keep service-role credentials out of the application browser; workspace operations use the user's own session and RLS.

Public registration is controlled by `AUTH_ENABLED`, `ACCOUNT_POLICIES_APPROVED`, and `ACCOUNT_POLICY_VERSION`. Keep policy approval false until approved text exists. `AUTH_ENABLED` alone permits existing verified accounts to sign in. The Preview environment is branch-scoped to `codex/customer-operations` in the existing `parcelsjm` project. Marketing inquiries stay disabled while Resend is deferred.

## PRD acceptance mapping

| Requirements             | Status in this increment                                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-01                  | SSR sign-in/session/sign-out verified; signup/reset delivery and anti-abuse launch acceptance pending                                                    |
| AUTH-02, AUTH-03, OPS-01 | Protected routes, profiles and role boundaries implemented; hosted privileged workflow test pending approval                                             |
| AUTH-04, AUTH-05         | Verified assignment schema and uniqueness tested locally; no real warehouse seeded                                                                       |
| PKG-01–PKG-06            | Pre-alerts, customer list, verified timeline, sequential staff events, separate states and private matching implemented; hosted write acceptance pending |
| OPS-02–OPS-04            | Intake/support/audit foundations implemented; assignment/priority, corrections, and full document workflows remain incomplete                            |
| DOC-01–DOC-08            | UI only; file processing disabled, not accepted                                                                                                          |
| FIN / NTF / DMD          | Commercial implementation gated; Resend and DMD explicitly deferred                                                                                      |

Phase 2 and Phase 3 are **not marked complete** while the listed hosted acceptance and operational dependencies remain open.
