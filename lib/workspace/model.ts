import type { DocumentData } from "../documents/model";
export type PackageRecord = {
  id: string;
  profile_id?: string;
  resume_status?: string | null;
  carrier_tracking: string;
  merchant: string;
  description: string;
  status: string;
  document_state: string;
  payment_state: string;
  declared_value: string;
  declared_currency: string;
  created_at: string;
};
export type WorkspaceData = {
  pagination?: import("./pagination").Pagination;
  documents?: DocumentData;
  name: string;
  accountType: string;
  phone?: string;
  onboardingPending?: boolean;
  packages: PackageRecord[];
  demo: boolean;
  shippingAddress?: string;
  customerCode?: string;
  error?: string;
  events?: {
    id: string;
    package_id: string;
    status: string;
    occurred_at: string;
    sequence?: number;
    corrects_event_id?: string | null;
    correction_reason?: string | null;
  }[];
  support?: {
    id: string;
    subject: string;
    body: string;
    status: string;
    reply: string | null;
    created_at: string;
  }[];
  customers?: { id: string; full_name: string; account_status: string }[];
  intake?: {
    id: string;
    tracking: string;
    source_reference: string;
    package_id: string | null;
    created_at: string;
  }[];
  audit?: {
    id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    reason: string;
    created_at: string;
  }[];
  warehouses?: { id: string; name: string }[];
};
export const sampleData: WorkspaceData = {
  name: "Alex",
  accountType: "personal",
  demo: true,
  packages: [
    {
      id: "demo-001",
      carrier_tracking: "DEMO-001",
      merchant: "Example clothing store",
      description: "Two cotton shirts",
      status: "processing_us",
      document_state: "requested",
      payment_state: "not_invoiced",
      declared_value: "45.00",
      declared_currency: "USD",
      created_at: "2026-10-10T12:00:00Z",
    },
    {
      id: "demo-002",
      carrier_tracking: "DEMO-002",
      merchant: "Example home store",
      description: "Desk organiser",
      status: "pre_alerted",
      document_state: "under_review",
      payment_state: "not_invoiced",
      declared_value: "24.00",
      declared_currency: "USD",
      created_at: "2026-10-09T12:00:00Z",
    },
    {
      id: "demo-003",
      carrier_tracking: "DEMO-003",
      merchant: "Example bookshop",
      description: "Three books",
      status: "in_transit",
      document_state: "approved",
      payment_state: "not_invoiced",
      declared_value: "36.00",
      declared_currency: "USD",
      created_at: "2026-10-08T12:00:00Z",
    },
  ],
};
export const label = (value: string) =>
  value.replaceAll("_", " ").replace(/^./, (v) => v.toUpperCase());
