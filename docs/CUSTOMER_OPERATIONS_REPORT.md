# Customer and operations continuation — 2026-10-11

The owner authorized hosted migrations and continued customer/admin implementation with Resend deferred. This is a preview implementation, not phase acceptance or a production release.

## Delivered scope

- Identity: Supabase SSR cookies, verified user lookup, protected `/app` and `/admin`, database-backed staff roles, profile/onboarding and pending shipping-address handling. Public registration remains gated by approved policies. Existing verified accounts can sign in independently of that gate.
- Customer: responsive overview, searchable packages, pre-alert validation/persistence, verified event timeline, support requests and team replies, profile and security pages. Requests cannot set operational shipment, payment or document approval states.
- Operations: customer directory, verified warehouse assignment, package state transitions, private unmatched intake and explicit exact-reference reconciliation, support resolution and append-only audit history. Every staff write is checked again by the database.
- Financial and integration boundaries: no price calculations, invoices, payments or warehouse seeds. DMD is untouched. Shipment events create deferred outbox records; no worker sends them.
- Design: existing navy/yellow brand and unchanged original logo; separate fictional `/preview/app` and `/preview/admin` routes for review without credentials.

## Database

Target: `pftjfzmbqqzzfxgypwkl`. Initial inspection found zero auth users and zero public tables. The inquiry and identity migrations were applied; security advisors returned no issues. Package operations migration is separately tested and applied during verification. No reset or production app release is authorized.

## Local checks

14 unit/integration tests passed, including migration execution in PostgreSQL-compatible PGlite, ownership isolation, privilege escalation denial, invalid/stale transitions, replay handling, intake matching, immutable audit and deferred outbox. Lint and TypeScript passed. Build/browser/hosted results are recorded after execution.

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
