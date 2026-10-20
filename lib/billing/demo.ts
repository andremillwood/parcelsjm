import type { BillingData } from "./model";
import { APPROVED_RATE_CENTS } from "./pricing";
export const sampleBilling: BillingData = {
  enabled: true,
  demo: true,
  canManage: true,
  owner: true,
  invoices: [
    {
      id: "demo-invoice-001",
      number: 1001,
      package_id: "demo-001",
      profile_id: "demo-person",
      tracking: "DEMO-001",
      status: "issued",
      currency: "JMD",
      weight_lb: "1.2",
      billable_lb: 2,
      rate_snapshot: { version: 1 },
      lines: [
        {
          kind: "shipping",
          description: "Approved shipping charge",
          amount_cents: 109500,
        },
        { kind: "duties_tax", description: "duties tax", amount_cents: 0 },
        { kind: "handling", description: "handling", amount_cents: 0 },
        {
          kind: "local_delivery",
          description: "local delivery",
          amount_cents: 0,
        },
        { kind: "storage", description: "storage", amount_cents: 0 },
      ],
      total_cents: 109500,
      adjustment_cents: 0,
      received_cents: 50000,
      balance_cents: 59500,
      payment_status: "partially_paid",
      version: 2,
      due_at: null,
      created_at: "2026-10-20T12:00:00Z",
    },
  ],
  payments: [
    {
      id: "demo-payment",
      invoice_id: "demo-invoice-001",
      kind: "receipt",
      amount_cents: 50000,
      channel: "Fictional collection",
      reference: "DEMO-RECEIPT",
      reverses_id: null,
      created_at: "2026-10-20T13:00:00Z",
    },
  ],
  adjustments: [],
  history: [
    {
      id: "demo-history",
      invoice_id: "demo-invoice-001",
      action: "invoice_issue",
      message: "Fictional invoice for design review. No real payment is due.",
      created_at: "2026-10-20T12:00:00Z",
    },
  ],
  costs: [],
  rates: [
    {
      id: "demo-rate",
      version: 1,
      status: "approved",
      effective_at: "2026-10-20T00:00:00-05:00",
      rates_cents: [...APPROVED_RATE_CENTS],
      approval_reference: "Owner-approved table; fictional invoice example",
    },
  ],
};
