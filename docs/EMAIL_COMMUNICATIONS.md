# Transactional email setup

Sender: Parcels JA <support@parcelsjm.com>. Staff alerts and reply routing: andremillwood@gmail.com until a support inbox is confirmed.

## Implemented communications

Account ready and shipping address ready; pre-alert receipt; verified shipment checkpoints and corrections; document requests, upload quarantine, review and scan outcomes; issued invoice changes, disputes, verified payments and reversals; support receipts and replies; inquiry acknowledgements and staff alerts. Auth templates cover confirmation, recovery, invitations, magic links, email changes, reauthentication and security changes.

Private information, TRNs, home addresses, documents and billing detail remain behind authentication. Provider acceptance and delivery are recorded separately. Retry payloads are frozen and idempotent; expired or ambiguous jobs require investigation. Bounces and complaints suppress further delivery. Notifications are owner-visible with audited retry controls.

## Launch gates

Live signup remains disabled. Policies remain drafts. Unscanned documents remain quarantined. Live email dispatch is independently disabled in the database; historical held jobs are not automatically replayed. Preview dispatch uses only Resend simulator recipients.

Supabase SMTP activation requires the project owner CLI session. Generate the minimal config using scripts/prepare-auth-email-config.mjs into a private temporary directory; supply the SMTP password through its documented environment variable. Inspect the config diff privately before pushing, preserving all signup and redirect settings.

A real Resend webhook must target /api/communications/webhook and subscribe to email.sent, email.delivered, email.bounced, email.complained and email.failed. Store its signing secret directly in the deployment environment. The preview signing secret is synthetic and cannot verify real provider events.

Supabase pg_cron invokes private.dispatch_email_cron once per minute. It exits without network traffic while live communications are disabled. The production worker bearer belongs in Vault as parcels_email_dispatch_bearer and in CRON_SECRET; use a distinct value from preview. No Vercel paid plan is required. The database extension migration is verified on hosted Postgres, separately from PGlite tests.

Before activation: review preview, verify SMTP recovery, real signed webhook delivery and suppression, configure production credentials, deploy reviewed code, then explicitly enable live communications. Do not release old held messages. Keep signup disabled until separately approved.
