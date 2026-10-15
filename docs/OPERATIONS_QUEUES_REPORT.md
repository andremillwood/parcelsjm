# Operational queues, pagination and shipment corrections

PRD mapping: OPS-02/03/05, PKG-02/04/05/07. Preview increment only; no production frontend release requested. Original branding, disabled signup, deferred Resend/DMD and suppressed pricing remain intact.

## Scope

- `/admin/queues`: server-filtered open/closed work, kind, assignee (mine/unassigned), priority and explicit staff due dates. Priority then oldest-open ordering, 25-row pages and exact matching counts. Aging is elapsed time, not an SLA. Closed work retains assignment/history.
- Source triggers create/backfill shipment, intake, document and support tasks. A task closes/reopens from its source; staff cannot resolve a source by editing the queue. Shipment queue currently completes at Jamaica arrival, the existing supported boundary, not customer delivery. Document rejection remains actionable; approval/waiver closes work without releasing an unscanned file.
- Assignment requires an active eligible staff role; queue visibility is role-scoped, customers/anonymous users have none. Updates lock the row and check version, with before/after assignment, priority and due date in owner audit. Source state changes also invalidate stale forms.
- Packages, customers, intake, support, document requests and audit lists use stable server pagination and search rather than a silent first-100-record limit. Package detail is selected by exact authorized ID independently of the list page. Overview summaries explicitly cover recent records only; the work queue provides exhaustive filtered counts.
- Latest-checkpoint corrections append a new event linked to the original, with evidence, effective time, internal audit reason and separate customer-visible explanation. Same-checkpoint evidence repair or retraction to the previous checkpoint only; no arbitrary historical rewrite, guessed status advancement, release/delivery or payment override. Stale latest-event IDs fail atomically. Corrections can themselves be corrected. Timelines retain and label superseded entries. Audit and deferred outbox commit with the materialized status change.

## Pricing reference

The owner's JMD1–10 lb table and DMD/FX/consolidation inputs are provisional, with rounding expressly pending approval. They remain internal reference material under the existing excluded `docs/reference/` convention. No runtime calculator, published rate seed, invoice charge or margin claim uses them. Required approvals include current cost/charge units, measured/volumetric weight, rounding, inclusions, FX, batch allocation and actual contribution.

## Migration and release

Forward migration: `20261015144005_operations_queues_and_corrections.sql`. Apply before this frontend; do not drop tables or reset shared data. All exposed queue records have RLS; writes use an invoker wrapper over private role-checked functions. No new privileged browser key is needed. Preview Auth uses the existing Parcels Supabase project; test with synthetic fixtures and remove them afterward. No live registration or email configuration is changed.

Rollback: return to previous frontend; preserve queue/correction history and use reviewed forward migrations for database fixes. Do not run older code that interprets corrected events as independent uncorrected notifications. Notification processing is still deferred, and future processor work must reconcile superseded events before sending.

## Verification and limits

Record exact final commit, CI, preview URL, hosted migration/role and browser evidence in the PR. Unit/database coverage exercises customer isolation, staff role boundaries, invalid/suspended assignees, direct-write denial, stale updates, source resolution, >100-record paging, correction chaining, immutable history and deferred outbox. Browser coverage checks filters/page navigation, assignment/correction preview, keyboard-native controls, accessibility and responsive overflow. Synthetic demo records exist only in `/preview` rendering, never as real production rows.

Older-event corrections that affect later checkpoints require a separately specified reconciliation workflow. The current state matrix remains deliberately limited to receipt, processing, transit and Jamaica arrival until commercial/release rules are approved. Scanner, retention/legal approval, finance and actual email delivery remain launch dependencies.
