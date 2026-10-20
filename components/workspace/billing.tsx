import Link from "next/link";
import type { BillingData, Invoice } from "../../lib/billing/model";
import {
  COST_FIELDS,
  jmd,
  planningContribution,
} from "../../lib/billing/pricing";
import { Heading, Notice, Empty, Pill } from "./ui";
import { Pagination, RecordSearch } from "./pagination";
import { StaffForm } from "./staff-form";
const extraKinds = [
  "shipping",
  "duties_tax",
  "handling",
  "local_delivery",
  "storage",
];
const title = (s: string) => s.replaceAll("_", " ");
export function Billing({
  data,
  admin = false,
  id,
}: {
  data: BillingData;
  admin?: boolean;
  id?: string;
}) {
  const root = data.demo
      ? `/preview/${admin ? "admin" : "app"}`
      : admin
        ? "/admin"
        : "/app",
    manage = admin && data.canManage && !data.error;
  if (!data.enabled)
    return (
      <>
        <Heading eyebrow="Charges & collections" title="Billing">
          Approved charges and verified payments, recorded separately.
        </Heading>
        <Notice>
          Billing is not activated in this environment. No payment request is
          being made.
        </Notice>
      </>
    );
  if (id) {
    const invoice = data.invoices.find((i) => i.id === id);
    if (!invoice)
      return (
        <>
          <Heading eyebrow="Billing" title="Invoice unavailable">
            This record is unavailable to your account.
          </Heading>
          <Link href={root + "/billing"}>Return to billing</Link>
        </>
      );
    const paidIds = new Set(
        data.payments.filter((p) => p.reverses_id).map((p) => p.reverses_id),
      ),
      cost = data.costs[0],
      allCosts =
        cost &&
        COST_FIELDS.every(
          (k) =>
            cost.amounts_jmd_cents[k] !== null &&
            cost.amounts_jmd_cents[k] !== undefined,
        ),
      knownCosts = cost
        ? COST_FIELDS.reduce(
            (n, k) => n + (Number(cost.amounts_jmd_cents[k]) || 0),
            0,
          )
        : 0,
      revenue =
        invoice.lines
          .filter((l) => l.kind !== "duties_tax")
          .reduce((n, l) => n + Number(l.amount_cents), 0) +
        data.adjustments
          .filter((a) => a.kind !== "duties_tax")
          .reduce((n, a) => n + Number(a.amount_cents), 0),
      plan = planningContribution(String(invoice.weight_lb));
    return (
      <>
        <Heading
          eyebrow="Itemized charges"
          title={`Invoice ${invoice.number}`}
          action={
            <Link
              className="w-button w-button-secondary"
              href={root + "/billing"}
            >
              All invoices
            </Link>
          }
        >
          {invoice.tracking} ·{" "}
          {data.demo
            ? "Fictional record · no real payment due"
            : "JMD · issued charges and verified collections"}
        </Heading>
        {data.error && <p role="alert">{data.error}</p>}
        <div className="w-stats">
          <div className="w-stat">
            <span>Outstanding</span>
            <strong className="w-money">
              {jmd(Number(invoice.balance_cents))}
            </strong>
            <small>
              {invoice.status === "draft"
                ? "Draft, not payable"
                : invoice.status === "void"
                  ? "Void, not payable"
                  : invoice.status === "disputed"
                    ? "Disputed. Contact the team before paying."
                    : "Only verified collections reduce this balance."}
            </small>
          </div>
          <div className="w-stat">
            <span>Verified collections, net of reversals</span>
            <strong className="w-money">
              {jmd(Number(invoice.received_cents))}
            </strong>
            <Pill value={invoice.payment_status} />
          </div>
          <div className="w-stat">
            <span>Invoice state</span>
            <strong className="w-stat-word">{title(invoice.status)}</strong>
            <small>
              Version {invoice.version} ·{" "}
              {invoice.due_at
                ? `Staff due date: ${new Date(invoice.due_at).toLocaleDateString("en-JM", { timeZone: "America/Jamaica" })}`
                : "No payment deadline set"}
            </small>
          </div>
        </div>
        <section className="w-panel w-pad">
          <h2>Charges</h2>
          <p>
            Verified weight {invoice.weight_lb} lb · billed{" "}
            {invoice.billable_lb} lb ·{" "}
            {invoice.rate_snapshot.quote_id
              ? "Owner-approved manual quote"
              : `Rate version ${invoice.rate_snapshot.version}, rounded up to the next pound`}
          </p>
          <dl className="w-dl">
            {invoice.lines.map((l) => (
              <div key={l.kind}>
                <dt>{title(l.description)}</dt>
                <dd className="w-money">{jmd(Number(l.amount_cents))}</dd>
              </div>
            ))}
            <div>
              <dt>Original invoice</dt>
              <dd>{jmd(Number(invoice.total_cents))}</dd>
            </div>
            {data.adjustments.map((a) => (
              <div key={a.id}>
                <dt>
                  {a.amount_cents < 0 ? "Credit" : "Debit"}: {a.description} (
                  {title(a.kind)})
                </dt>
                <dd>{jmd(Number(a.amount_cents))}</dd>
              </div>
            ))}
            <div>
              <dt>Total after adjustments</dt>
              <dd>
                {jmd(
                  Number(invoice.total_cents) +
                    Number(invoice.adjustment_cents),
                )}
              </dd>
            </div>
          </dl>
          <Notice>
            Customs duties/taxes and any other charges are itemized assessments,
            not an automatic customs estimate. This is an operational invoice,
            not a claim of tax registration or a tax invoice.
          </Notice>
        </section>
        <section className="w-panel w-pad">
          <h2>Collection ledger</h2>
          {data.payments.length ? (
            <ol className="w-ledger">
              {data.payments.map((p) => (
                <li key={p.id}>
                  <strong>
                    {p.kind === "reversal" ? "Reversal" : "Verified payment"} ·{" "}
                    {jmd(Number(p.amount_cents))}
                  </strong>
                  <p>
                    {p.channel} · {p.reference}
                    {paidIds.has(p.id) ? " · Reversed" : ""}
                  </p>
                  {data.canManage && p.evidence && (
                    <details>
                      <summary>Internal verification reference</summary>
                      <p>{p.evidence}</p>
                    </details>
                  )}
                  <small>
                    {new Date(p.created_at).toLocaleString("en-JM", {
                      timeZone: "America/Jamaica",
                    })}{" "}
                    · Jamaica
                  </small>
                </li>
              ))}
            </ol>
          ) : (
            <p>No verified collections recorded.</p>
          )}
          <p>
            Online payments are not connected. Use only instructions
            independently confirmed with Parcels JA; do not submit card or
            bank-account details here.
          </p>
        </section>
        <section className="w-panel w-pad">
          <h2>Invoice history</h2>
          <ol className="w-ledger">
            {data.history.map((h) => (
              <li key={h.id}>
                <strong>{title(h.action)}</strong>
                <p>{h.message}</p>
                <small>
                  {new Date(h.created_at).toLocaleString("en-JM", {
                    timeZone: "America/Jamaica",
                  })}{" "}
                  · Jamaica
                </small>
              </li>
            ))}
          </ol>
          {!admin && (
            <Link href={root + "/support"}>
              Ask the team about this invoice
            </Link>
          )}
        </section>
        {manage && (
          <>
            <Notice>
              Staff entries record verified funds already received; they do not
              move money. Refresh after every change. A stale version, duplicate
              reference, disputed balance or unresolved document prevents unsafe
              processing.
            </Notice>
            <InvoiceActions invoice={invoice} data={data} />
            <section className="w-panel w-pad">
              <h2>Internal contribution</h2>
              <p>
                Invoice revenue excluding duties/tax pass-through:{" "}
                <strong>{jmd(revenue)}</strong>. Collections are shown
                separately above.
              </p>
              <p>
                Known attributable costs: {jmd(knownCosts)}.{" "}
                <strong>
                  {allCosts
                    ? `Billed contribution: ${jmd(revenue - knownCosts)}`
                    : "Contribution unavailable: one or more actual costs are unknown."}
                </strong>
              </p>
              {cost && (
                <dl className="w-dl">
                  {COST_FIELDS.map((k) => (
                    <div key={k}>
                      <dt>{title(k)}</dt>
                      <dd>
                        {cost.amounts_jmd_cents[k] === null
                          ? "Unknown"
                          : jmd(Number(cost.amounts_jmd_cents[k]))}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {plan && (
                <details>
                  <summary>Planning scenario, not actual profit</summary>
                  <p>{plan.assumptions}</p>
                  <p>
                    Scenario shipping contribution:{" "}
                    {jmd(plan.planningContributionCents)}. This excludes
                    unconfirmed actual costs and is not a margin guarantee.
                  </p>
                </details>
              )}
              <details>
                <summary>Record actual costs</summary>
                <StaffForm
                  key={`cost-${invoice.version}`}
                  demo={data.demo}
                  action="billing-costs"
                  title="Actual attributable costs in JMD"
                  fields={[
                    ...hidden(invoice),
                    ...COST_FIELDS.map((k) => ({
                      name: k,
                      label: `${title(k)} cost (JMD; blank means unknown)`,
                      optional: true,
                      value:
                        cost?.amounts_jmd_cents[k] !== null &&
                        cost?.amounts_jmd_cents[k] !== undefined
                          ? (Number(cost.amounts_jmd_cents[k]) / 100).toFixed(2)
                          : "",
                    })),
                    {
                      name: "evidence",
                      label: "Settlement, allocation and FX evidence reference",
                    },
                  ]}
                />
              </details>
            </section>
          </>
        )}
      </>
    );
  }
  return (
    <>
      <Heading
        eyebrow={admin ? "Finance operations" : "Charges & payments"}
        title={admin ? "Billing & collections" : "Your invoices"}
      >
        {admin
          ? "Review approved charges, verify collections and keep release eligibility current."
          : "Only issued invoices for your account appear here."}
      </Heading>
      {data.error && <p role="alert">{data.error}</p>}
      {data.demo && (
        <Notice>
          Fictional invoice demonstration. No account balance or payment request
          is created.
        </Notice>
      )}
      <RecordSearch data={data.pagination} />
      {data.invoices.length ? (
        <section className="w-panel">
          {data.invoices.map((i) => (
            <Link
              className="w-invoice-row"
              key={i.id}
              href={`${root}/billing/${i.id}`}
            >
              <div>
                <strong>Invoice {i.number}</strong>
                <p>{i.tracking}</p>
              </div>
              <Pill value={i.status} />
              <div>
                <strong className="w-money">
                  {jmd(Number(i.balance_cents))}
                </strong>
                <small>Outstanding · {title(i.payment_status)}</small>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <Empty
          title={
            data.error ? "Billing records unavailable" : "No invoices to show"
          }
        >
          {data.error
            ? "Retry before taking action."
            : "Issued charges and verified collections will appear here. No amount is due from this empty state."}
        </Empty>
      )}
      <Pagination data={data.pagination} />
      {manage && (
        <>
          <details className="w-panel w-pad">
            <summary>Prepare an invoice</summary>
            <Notice>
              Use the exact package record UUID and verified weight. Enter each
              extra explicitly, including zero only when verified not due. The
              assessment reference must support the complete itemized charge.
              Above 10 lb requires an owner-approved quote matching this exact
              weight.
            </Notice>
            <StaffForm
              demo={data.demo}
              action="billing-draft"
              title="Prepare itemized invoice"
              fields={[
                { name: "packageId", label: "Exact package record UUID" },
                {
                  name: "weight",
                  label: "Verified measured weight (lb, up to 3 decimals)",
                },
                { name: "dutiesTax", label: "Assessed duties and taxes (JMD)" },
                {
                  name: "handling",
                  label: "Assessed additional handling (JMD)",
                },
                {
                  name: "localDelivery",
                  label: "Assessed local delivery (JMD)",
                },
                { name: "storage", label: "Assessed storage (JMD)" },
                {
                  name: "evidence",
                  label:
                    "Weight and final charge assessment evidence reference",
                },
                {
                  name: "due",
                  label: "Staff payment due date (Jamaica time; optional)",
                  type: "datetime-local",
                  optional: true,
                },
              ]}
            />
          </details>
          {data.owner && (
            <details className="w-panel w-pad">
              <summary>Approve a quote above 10 lb</summary>
              <StaffForm
                demo={data.demo}
                action="billing-quote"
                title="Owner-approved manual quote"
                fields={[
                  { name: "packageId", label: "Exact package record UUID" },
                  {
                    name: "weight",
                    label: "Exact verified weight above 10 lb",
                  },
                  { name: "amount", label: "Approved shipping amount (JMD)" },
                  {
                    name: "evidence",
                    label: "Commercial approval evidence and inclusions",
                  },
                ]}
              />
            </details>
          )}
          <section className="w-panel w-pad">
            <h2>Rate versions</h2>
            <p>
              Approved shipping charges are available for invoices. Public
              estimator publication is separate; no tax, last-mile rate or
              shipping capability is inferred.
            </p>
            {data.rates.map((r) => (
              <details key={r.id}>
                <summary>
                  Version {r.version} · {r.status} ·{" "}
                  {new Date(r.effective_at).toLocaleDateString("en-JM")}
                </summary>
                <dl className="w-dl">
                  {r.rates_cents.map((n, i) => (
                    <div key={i}>
                      <dt>{i + 1} lb</dt>
                      <dd>{jmd(n)}</dd>
                    </div>
                  ))}
                </dl>
                {r.status === "draft" && data.owner && (
                  <StaffForm
                    demo={data.demo}
                    action="billing-approve-rate"
                    title="Approve rate version"
                    fields={[
                      {
                        name: "id",
                        label: "Rate",
                        type: "hidden",
                        value: r.id,
                      },
                      {
                        name: "reason",
                        label: "Owner approval reference and inclusions",
                      },
                    ]}
                  />
                )}
              </details>
            ))}
            <details>
              <summary>Draft a new rate version</summary>
              <StaffForm
                demo={data.demo}
                action="billing-rate"
                title="Draft weight-based rates"
                fields={[
                  {
                    name: "rates",
                    label: "Ten JMD prices for 1–10 lb, separated by commas",
                  },
                  {
                    name: "effective",
                    label: "Effective date and time (Jamaica)",
                    type: "datetime-local",
                  },
                  {
                    name: "reason",
                    label: "Commercial change reason and charge inclusions",
                  },
                ]}
              />
            </details>
          </section>
        </>
      )}
    </>
  );
}
function hidden(i: Invoice) {
  return [
    { name: "id", label: "Invoice", type: "hidden", value: i.id },
    {
      name: "version",
      label: "Version",
      type: "hidden",
      value: String(i.version),
    },
  ];
}
function InvoiceActions({
  invoice: i,
  data,
}: {
  invoice: Invoice;
  data: BillingData;
}) {
  const fields = hidden(i),
    active = ["issued", "disputed"].includes(i.status);
  return (
    <section className="w-panel w-pad">
      <h2>Staff actions</h2>
      <details>
        <summary>Issue, dispute, resolve or void</summary>
        <StaffForm
          key={`status-${i.version}`}
          demo={data.demo}
          action="billing-status"
          title="Invoice decision"
          fields={[
            ...fields,
            {
              name: "decision",
              label: "Decision",
              options: (i.status === "draft"
                ? ["issue", "void"]
                : i.status === "issued"
                  ? ["dispute", "void"]
                  : i.status === "disputed"
                    ? ["resolve_dispute", "void"]
                    : []
              ).map((value) => ({ value, label: title(value) })),
            },
            { name: "message", label: "Customer-visible explanation" },
            { name: "reason", label: "Internal audit reason" },
          ]}
        />
      </details>
      {active && (
        <>
          <details>
            <summary>Record a verified collection</summary>
            <StaffForm
              key={`pay-${i.version}`}
              demo={data.demo}
              action="billing-payment"
              title="Verify funds received"
              fields={[
                ...fields,
                { name: "amount", label: "Received amount (JMD)" },
                { name: "channel", label: "Verified collection channel" },
                {
                  name: "reference",
                  label:
                    "Unique customer-visible receipt / transaction reference",
                },
                {
                  name: "evidence",
                  label:
                    "Verification evidence reference (no bank-account or card details)",
                },
                { name: "reason", label: "Internal audit reason" },
              ]}
            />
          </details>
          <details>
            <summary>Reverse an incorrect collection</summary>
            <StaffForm
              key={`reverse-${i.version}`}
              demo={data.demo}
              action="billing-reversal"
              title="Append payment reversal"
              fields={[
                ...fields,
                {
                  name: "paymentId",
                  label: "Original payment",
                  options: data.payments
                    .filter(
                      (p) =>
                        p.kind === "receipt" &&
                        !data.payments.some((r) => r.reverses_id === p.id),
                    )
                    .map((p) => ({
                      value: p.id,
                      label: `${p.reference} · ${jmd(Number(p.amount_cents))}`,
                    })),
                },
                { name: "reference", label: "Unique reversal reference" },
                { name: "evidence", label: "Reversal evidence reference" },
                { name: "reason", label: "Internal audit reason" },
              ]}
            />
          </details>
          <details>
            <summary>Append a charge adjustment</summary>
            <StaffForm
              key={`adjust-${i.version}`}
              demo={data.demo}
              action="billing-adjustment"
              title="Append credit or debit"
              fields={[
                ...fields,
                {
                  name: "direction",
                  label: "Adjustment direction",
                  options: [
                    {
                      value: "debit",
                      label: "Debit (additional verified charge)",
                    },
                    ...(data.owner
                      ? [
                          {
                            value: "credit",
                            label: "Credit (owner approval required)",
                          },
                        ]
                      : []),
                  ],
                },
                {
                  name: "kind",
                  label: "Charge category",
                  options: extraKinds.map((value) => ({
                    value,
                    label: title(value),
                  })),
                },
                { name: "amount", label: "Adjustment amount (JMD, positive)" },
                {
                  name: "description",
                  label: "Customer-visible adjustment description",
                },
                {
                  name: "reason",
                  label: "Internal audit / owner approval reason",
                },
              ]}
            />
          </details>
        </>
      )}
    </section>
  );
}
