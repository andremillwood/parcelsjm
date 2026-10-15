# Customer signup identity increment

Scope: required nine-digit TRN and full residential address for personal/business signup; one shared preview/live form; password confirmation, inline validation, focus/error/success handling and accurate next steps. Live signup and Resend remain disabled.

## Data handling

The application normalizes TRN formatting while preserving leading zeros. Format validation does not verify ownership. Residential address is a trimmed 10–500 character field; customers are prompted for street/district, town/city, parish and country. It is separate from an overseas shipping assignment. The preview requests sample inputs, submits no identity request and writes no browser draft storage. Success clears identity/password fields. Future live submissions send the validated password once; confirmation is client-only.

Migration `20261014202257_signup_identity_details.sql` stores identity in `private.signup_identity_details`, with RLS and no grants to anon, authenticated or service_role. A privileged trigger ingests validated values before Auth insertion, then removes them from Auth metadata. Forward migration `20261015141612_reject_signup_identity_metadata_edits.sql` rejects edits containing either identity key before the provider can echo the values into an SDK user/session object. It cannot overwrite the private record. Invalid values raise a generic exception before table constraints, avoiding raw identity values in constraint-error details. The FK is deferred to transaction commit and cascades on deletion. No public profile, JWT, notification or application audit payload receives the identity fields. Hosted testing found that the immediate admin-create response echoes request metadata despite the sanitized database row. The app endpoint discards provider user/session data and returns only a safe message. Hosted retrieval, sign-in and refreshed JWT checks exclude the identity values.

Existing profiles retain `identity_required=false`. Newly provisioned profiles default to true; verified customer onboarding requires the private record. The flag is not customer-editable. Staff assigned an actual database-backed staff role can use existing onboarding. This prevents direct provider signup without identity from activating a customer account after signup eventually opens. Existing accounts need a separately designed authenticated collection/correction process; no details are invented or backfilled.

## Release gates

The Vercel account-policy gate remains false and policy version unset; Supabase Auth reports `disable_signup=true` and email confirmation enabled. Public API registration fails before validation/provider creation. Preview-local checks do not imply that verification email delivery has been accepted. Resend, scanner setup, policies and shipping/rates remain deferred.

## Verification

Unit/database, enabled-form simulation, disabled-preview browser and hosted private-storage checks are required. Live-form tests use a local fictional provider configuration and intercepted responses; they never create accounts or send email. Hosted storage tests may use explicitly authorized synthetic accounts only and must remove them afterward. Final results and preview deployment identity will be recorded in the PR.
