# Signup identity Auth provisioning fix — 2026-10-20

Scope: fix TRN/home-address Auth provisioning without enabling public signup, changing email setup, publishing pricing or deploying the production frontend. The existing Parcels Supabase backend is shared by production and previews; the forward migration is explicitly a hosted backend fix. No database reset or policy/authentication bypass is used.

## Reproduction and cause

Hosted `auth.admin.createUser` with valid identity metadata and `email_confirm:true` returned HTTP 500. The same input with `email_confirm:false` succeeded. This narrows the observed failure to confirmed administrative provisioning; it is not evidence that the ordinary verification-required public signup endpoint failed, which remains disabled.

Supabase Auth's confirmed-create path inserts the user, then calls `Confirm()` in that transaction. Confirmation updates metadata using the original in-memory user object. The prior database trigger had already captured/removed identity fields on INSERT, so the unconditional sensitive-metadata UPDATE guard rejected that legitimate provider replay and rolled the transaction back. Local regression tests reproduce this exact insert/rewrite/rollback before applying the fix.

References: [official Auth admin source](https://github.com/supabase/auth/blob/master/internal/api/admin.go), [confirmation model](https://github.com/supabase/auth/blob/master/internal/models/user.go), [signup source](https://github.com/supabase/auth/blob/master/internal/api/signup.go), [Supabase user-data guidance](https://supabase.com/docs/guides/auth/managing-user-data). The changelog was checked; no SDK/package upgrade is required for this fix.

## Forward migration

`20261020151025_fix_signup_identity_provisioning.sql` adds a private `xid8` provisioning marker. A metadata rewrite is permitted only when its complete normalized identity matches the original private record, the transaction ID matches the original insertion transaction, and the private record creation timestamp matches that transaction. The provider can update safe verification claims; identity values are stripped again before persistence. Existing identity rows receive no marker. Changed/partial data during insertion and all sensitive metadata edits in later transactions remain rejected, including identical values. No marker or identity-table grant is added to customers, anonymous callers or the service role.

The migration also strips TRN/address from `auth.identities.identity_data` on INSERT/UPDATE and removes only those keys from any existing provider identity copies. The public signup source can copy input into this separate provider-managed record; sanitizing user metadata alone is insufficient. Other provider claims remain intact. The redaction trigger needs no privileged table access and uses security invoker with a fixed empty search path.

The application still returns only a safe message from registration. Immediate administrative create responses may echo input from the provider's in-memory object; they are server-only test responses and are never forwarded to browsers. Persisted records, retrieved users, sessions and JWTs must remain clean. Do not weaken email verification or enable public signup to test this change.

## Verification contract

- Local tests: reproduce old rollback; exact same-transaction replay/normalization; mismatched/partial/type-invalid replay; denial after commit, including identical data; safe ordinary metadata updates; existing-record guard preservation; provider identity insert/update/backfill redaction; private-table denial; onboarding and deletion cascade.
- Hosted tests: personal/business confirmed administrative creation, actual sign-in and refresh, retrieved user/JWT privacy, safe metadata edits, same/changed identity update denial and private identity persistence. Generate and consume one synthetic signup verification token through the administrative link API without sending email; this does not open public signup or verify SMTP delivery.
- Preview: existing signup preview remains non-submitting, registration API returns 503, SSR sign-in uses clean cookies and protected customer routes, pricing stays unavailable. No test-only HTTP endpoint or public privileged credential is added.
- Cleanup: revoke synthetic sessions, delete only `parcels-qa-auth-…@example.com` accounts, confirm private rows/profile cascade and preserve the real owner. Private tokens/passwords/service credentials never enter source or test artifacts.

## Release and remaining gates

Record final commit, CI and exact preview deployment/evidence in the PR. Apply the migration before any signup activation. The already-applied operations migration belongs to PR #7; a temporary history-only migration workspace retains it during this independent fix's deployment rather than falsely marking it reverted or duplicating it here.

Public signup stays disabled at the application and Supabase provider. Resend/SMTP and actual email delivery remain deferred. Approved legal/retention/warehouse/commercial inputs and the controlled live-signup pilot are still launch prerequisites. No rollback should restore the overly broad metadata guard; use a reviewed forward fix while keeping signup disabled.

## Completed verification

The forward migration applied successfully to the authorized hosted project. All 21 local unit/database tests and the format/lint/type/build check passed. Hosted personal and business confirmed creation now succeed with valid TRN/address. Real password sign-in, user retrieval, JWT decode and session refresh contain neither sensitive fields nor values; identical/changed/partial identity metadata edits remain rejected, safe display-name updates work, and required-identity onboarding succeeds. Three private identity records were verified through aggregate database assertions; Auth user metadata/provider identity copies remain clean and direct customer/service-role SELECT remains denied.

A synthetic administrative signup link was generated and its real verification token consumed successfully with no email delivery. This exercises account creation and confirmation while provider signup remains disabled and email auto-confirmation false. It does not certify delivery or the public PKCE email journey. Database security advisor checks and exact preview/browser/cleanup results are recorded in the PR after completion. No production frontend release is included.
