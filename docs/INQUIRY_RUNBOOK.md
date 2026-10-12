# Phase 1 inquiry operations

## Activation gate

Preview defaults to disabled. A successful local test does not authorize real data collection. Keep `LEAD_CAPTURE_ENABLED=false` until all steps below are verified for the isolated environment.

1. Link the owner's Supabase project with `npx supabase login`, then `npx supabase link --project-ref pftjfzmbqqzzfxgypwkl`. Review existing schemas and migration history before applying the additive marketing migration. Use CLI `--help` for current push/dry-run syntax. Do not reset the hosted database. If using direct Postgres, download the project CA from Database Settings and use verified TLS; do not disable certificate validation.
2. Apply `supabase/migrations/20261011212647_marketing_inquiries.sql` through the reviewed migration workflow. Verify RLS and grants with both anonymous and authenticated requests; run database advisors. The migration is tested locally in PGlite, but that is not a hosted Supabase acceptance test.
3. In Vercel **parcelsjm**, scope configuration to **Preview → codex/phase-1**. Set the public Supabase URL/key, server-only service key, Resend sending key, verified `RESEND_FROM_EMAIL`, approved `LEAD_NOTIFICATION_EMAIL`, independent random `LEAD_RATE_LIMIT_SECRET` and `CRON_SECRET` (at least 32 characters each). Never put the Postgres administrator password in the application environment.
4. Replace the privacy stub with approved collection, controller/contact, retention and rights information. Set a stable `LEAD_PRIVACY_VERSION` identifying that policy and `LEAD_PRIVACY_APPROVED=true`. Keep separate marketing subscription consent out of this flow.
5. Set `LEAD_CAPTURE_ENABLED=true`, redeploy Preview, and submit an authorized fictional contact and business inquiry. Verify one inquiry and one outbox row, provider acceptance, and arrival in the approved staff inbox. Retry the same request ID and confirm no duplicate record or message. Exercise failure/429/validation paths. Do not use production customer records.
6. Record evidence and clear the Phase 1 exit gate only after stored-and-communicated acceptance passes. No production release follows automatically.

## Storage and notification semantics

`marketing_inquiries` is private to server/staff operations. Browser roles have no table or RPC privileges, and both tables enable RLS with no public policy. No user role system is introduced here; the staff UI is a later phase. Authorized project staff review the table through Supabase until then.

The database atomically creates the inquiry and notification record. It serializes submissions, deduplicates a UUID request identifier against an HMAC of validated input, and enforces rolling limits of 3 inquiries/email/hour, 10/IP/hour and 100 total/hour. These are initial abuse controls, not customer shipping limits. Review them against legitimate inquiry traffic. Raw IPs are not stored. Vercel's overwritten client-IP header is used; local development shares one bucket.

The handler bounds JSON to 16 KiB, checks same-origin submissions, validates contact/business fields, requires explicit inquiry consent and rejects a filled honeypot. A same-origin header is an additional browser safeguard, not authentication. Never expose the service key or provide a public inquiry-read endpoint.

Resend messages contain only an opaque inquiry reference. They do not include submitted names, email, phone, message, categories or shipment information. `sent` records **provider acceptance**, not delivered/read status. Inbox delivery must be verified separately; webhook delivery tracking remains Phase 4.

A stable Resend idempotency key and two-minute database lease protect retries. A failed or interrupted send stays retryable. Maximum 5 claims within 23 hours prevents automatic retries beyond Resend's 24-hour idempotency window. A saved inquiry returns 202 even if the provider is down, accurately stating that it is queued.

## Retry and incident review

`POST /api/contact/retry` requires `Authorization: Bearer <CRON_SECRET>`; it is not public and has no scheduled production cron. An authorized operator can invoke it from a secret-aware client. It reviews up to 20 eligible records per invocation. Do not paste secrets in tickets or command history. Inspect remaining pending/sending records after each invocation; the response count is reviewed candidates, not delivered messages.

When attempts are exhausted or a record exceeds 23 hours, inspect provider delivery/idempotency history before manual action. Never blindly clear IDs or reset the retry clock, which can duplicate a message. Preserve the inquiry while resolving provider configuration failures. Do not change sender/recipient configuration mid-retry without reviewing provider history.

Retention and deletion require owner/legal approval before activation. Delete an inquiry only under that approved policy; its notification record cascades. No invented retention schedule, automatic erasure job or customer marketing list is enabled.

## Verification scope

`npm run test:unit` executes schema/permission/rate-limit/lease tests in PGlite and HTTP/provider contract tests with fictional inputs and mocked provider responses. `npm run test:e2e` exercises the disabled preview, responsive marketing pages and registration demo. `npm run test:forms` enables the UI with fictional configuration and intercepts submission responses in the browser at 390/1440px, including consent, a failed attempt and successful retry. These checks do not substitute for hosted database permissions and an authorized real test notification.
