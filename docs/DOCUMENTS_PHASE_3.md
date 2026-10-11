# Phase 3 — document intake and review

## Scope and PRD mapping

This increments the existing customer/package operations phase; it does not start finance, Resend or DMD work. Original branding and all unapproved commercial gates remain intact.

| Requirement      | Implementation and acceptance evidence                                                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DOC-01           | Staff requests are bound to an exact customer and optional owned package. Profile requests are supported. Customer uploads require an active, verified identity and their own open request.                                                                              |
| DOC-02           | PDF/JPEG/PNG, 10 MiB maximum, five immutable versions per request and twenty reservations/customer/day. Client checks improve usability; bucket limits, database authorization and server byte signatures are authoritative. Signature checking is not malware scanning. |
| DOC-03           | Private `customer-documents` bucket; random object keys; INSERT only for reserved own paths. No authenticated SELECT, UPDATE or DELETE on objects. Server-authorized, audited downloads expire after 60 seconds and require a clean scan.                                |
| DOC-04 / DOC-05  | Requested → uploaded (quarantine) → under review after clean scan → approved/rejected/waived. Rejection requires instructions; replacement preserves previous versions/history. Staff writes use row locks and expected state/version.                                   |
| DOC-06           | Optional invoice amount/currency, merchant and order reference. No OCR, customs approval or invented fees.                                                                                                                                                               |
| DOC-07           | Explicit per-customer/package manual requests with purpose/instructions. No automatic blanket identity requirements. A configurable rule engine is deferred.                                                                                                             |
| DOC-08           | Retention and DSAR production policy remains an approval dependency; no invented deletion period. See operational procedure below.                                                                                                                                       |
| PKG-05 / AUTH-02 | Document summaries are separate from shipment/payment status. Database roles and ownership are checked on the server and in SQL; no editable JWT authorization.                                                                                                          |
| NTF-03           | Document history and a deduplicated deferred outbox commit atomically. No email worker is activated.                                                                                                                                                                     |

## Deliberate scanner gate

The owner confirmed there is no scanner yet and requested quarantine. Real uploads work, but **no unscanned file can be opened or approved**, including by the application superadmin. Rejecting without opening a file and waiving the requirement remain possible with a customer-visible reason. Waiving does not release the file from quarantine.

A future trusted scanner must download the immutable object in an isolated environment, verify its SHA-256 against `document_uploads.sha256`, perform actual malware scanning, and call service-only `record_document_scan(upload, sha256, result, evidence)`. Results are `clean`, `infected` or `error`; evidence must identify the engine/version/signature set. Only `clean` moves the current submission to human review. Timeouts/errors keep it quarantined; infected files are blocked and the customer is asked for replacement. Do not fabricate clean attestations or expose the service role to a browser. The present release has no scanner, scanner cron, or manual "mark clean" control.

Local database tests use a clearly labelled synthetic clean-scan fixture to exercise approval and signed-download authorization. This is not a hosted malware-scanning verification. Production remains blocked on an approved scanner with retries, alerts and operational ownership.

## Deployment and API contract

Apply `20261011225740_document_intake_review.sql`. Configure `SUPABASE_SERVICE_ROLE_KEY` as a server-only sensitive variable and `DOCUMENT_UPLOADS_ENABLED=true` only in the authorized preview branch. Existing Supabase public variables and authentication gate are required. Do not change Resend or public signup gates.

All `/api/documents/{request,intent,complete,review,download}` operations are authenticated same-origin POSTs with bounded JSON. Upload bytes go directly to a signed Supabase Storage URL to avoid Vercel's request-body limit. `complete` independently downloads and validates the stored bytes before recording quarantine. Signed upload tokens have Supabase's two-hour lifetime; application completion expires after 20 minutes. An expired token can at most create its immutable, private orphan object; it cannot make it readable or reviewable. Interrupted confirmations can be retried; expired reservations require a new attempt. No overwrite permission is granted.

Request fields: `profileId`, nullable `packageId`, `type`, `instructions`. Intent fields: `requestId`, `filename`, `mime`, `size`, nullable paired `amount`/`currency`, `merchant`, `orderReference`. Complete/download use `uploadId`. Review uses `requestId`, `version`, `expected`, `decision`, `reason`.

Requests and histories are customer-readable under RLS. Owner/documents can review and download clean files; operations can request and see metadata but cannot download/review. Support/finance have no document access unless separately assigned an authorized role. Scan evidence is staff/backend metadata, not a claim of customs clearance.

## Operations, retention and recovery

- Monitor `awaiting_upload` older than 20 minutes, `pending`/`error` scans and stale `under_review` requests. Scanning pending is expected while the scanner is deferred.
- Customer pages display up to 100 requests, 500 versions and 1,000 history entries. Pagination and archival are follow-up scaling work; no exhaustive export claim is made.
- Before production, approve retention duration, lawful document purposes, deletion/legal-hold rules and the DSAR identity-verification process. Until then, accept only explicitly requested pilot/test documents, minimize data and do not run automatic retention deletion.
- For an authorized deletion: verify the subject and scope, record approval/legal-hold checks, remove the exact storage object using the Storage API (never only SQL-delete `storage.objects`), then remove/redact the corresponding metadata under an approved audit-retention procedure. Expired upload orphans can be identified by reservation timestamp; schedule cleanup only after the policy is approved. Do not include file contents or signed URLs in logs.
- Roll back UI availability with `DOCUMENT_UPLOADS_ENABLED=false`; quarantine/RLS remains effective. Preserve metadata/history and objects when rolling back code. Do not drop tables to undo a deployment. Reapply a reviewed forward migration to fix a database issue.

## Verification

Automated checks cover filename traversal/control characters, unsupported and spoofed types, size limit, invoice metadata, customer isolation, storage read denial, role escalation, scan-hash mismatch, unscanned approval denial, review conflicts, rejection/replacement history, waivers, independent shipment state, deferred outbox and suspended accounts. Browser checks include customer/admin document pages at 360/390/768/1024/1440 with axe accessibility and overflow checks.

Hosted evidence and preview commit will be recorded after verification. No production deployment is authorized by this phase.
