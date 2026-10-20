# Billing, collections and shipment operations — 2026-10-20

Owner approved the supplied JMD 1–10 lb prices and DMD/cost inputs. Implement approved shipping charges with ceil-to-lb and manual quotes above 10 lb. This supersedes earlier provisional-only implementation restrictions for this increment. No assumption becomes an observed settlement cost, automatic tax rate or advertised service promise.

1. Finance foundation: integer JMD cents, immutable approved rate versions, invoice snapshots, explicit assessed extra charges, manual quote approval, role/RLS and calculations/tests. Inclusions and partner charge units remain explicit decisions.
2. Collections: issue/dispute/void controls, partial/manual verified payments, duplicate references, append-only reversals and credits/debits, balance recomputation and audit. No money transfer or payment gateway.
3. Shipment operations: customs/holds/exceptions, return/cancellation, payment/document/address/clearance-gated readiness and handover, immutable release evidence and deferred outbox. Reversing a payment never silently reverses a delivered shipment.
4. Customer/admin UI and queues: invoice detail/ledger, finance work queue, actual-cost completeness/contribution, source evidence, pagination, honest demo/read-only states. Preserve brand and existing quarantine.
5. Draft privacy/terms/shipping policy for owner/legal review, identifying unknown legal entity/contact/retention/claims terms. Drafts are not operative policies and do not enable registration.
6. Run calculations, transactional/RLS/authorization/rollback tests; real synthetic hosted workflows, browser accessibility/responsive checks; full CI; existing parcelsjm Vercel preview. No production frontend release in this increment.

Safety: public signup remains disabled and Resend/DMD deferred. Public rate publication is separate from using approved charges in staff-issued invoices. Internal planning uses the approved 100-package/FX160/3% scenario, labelled clearly; actual contribution stays unavailable where any attributable cost is unknown. No tax, warehouse address, delivery coverage or scanner result is invented.

Owner clarification (20 October 2026): duties/taxes, local delivery and storage are separate assessed charges. DMD delivery USD25 is per consolidation. AWB/XML/bag unit allocation remains a planning scenario pending operational confirmation. Policy provider is Mckellar Group of Companies, support/privacy contact support@parcelsjm.com. Business address remains outstanding.
