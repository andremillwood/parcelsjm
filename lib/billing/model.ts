import type { Pagination } from "../workspace/pagination";
export type Invoice = {
  id: string;
  number: number;
  package_id: string;
  profile_id: string;
  tracking: string;
  status: string;
  currency: string;
  weight_lb: string;
  billable_lb: number;
  rate_snapshot: { version?: number; quote_id?: string };
  lines: { kind: string; description: string; amount_cents: number }[];
  total_cents: number;
  adjustment_cents: number;
  received_cents: number;
  balance_cents: number;
  payment_status: string;
  version: number;
  due_at: string | null;
  created_at: string;
};
export type Payment = {
  evidence?: string;
  id: string;
  invoice_id: string;
  kind: string;
  amount_cents: number;
  channel: string;
  reference: string;
  reverses_id: string | null;
  created_at: string;
};
export type Adjustment = {
  id: string;
  invoice_id: string;
  kind: string;
  amount_cents: number;
  description: string;
  created_at: string;
};
export type History = {
  id: string;
  invoice_id: string;
  action: string;
  message: string;
  created_at: string;
};
export type Cost = {
  id: string;
  invoice_id: string;
  revision: number;
  amounts_jmd_cents: Record<string, number | null>;
  evidence: string;
};
export type Rate = {
  id: string;
  version: number;
  status: string;
  effective_at: string;
  rates_cents: number[];
  approval_reference: string;
};
export type BillingData = {
  enabled: boolean;
  demo: boolean;
  canManage: boolean;
  owner: boolean;
  invoices: Invoice[];
  payments: Payment[];
  adjustments: Adjustment[];
  history: History[];
  costs: Cost[];
  rates: Rate[];
  pagination?: Pagination;
  error?: string;
};
