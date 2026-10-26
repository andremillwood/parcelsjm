import "server-only";
import type { requireStaff } from "../auth/session";
import type { QueryParams } from "../workspace/pagination";
export const DELIVERY_STATES = [
  "held",
  "pending",
  "sending",
  "retry",
  "accepted",
  "delivered",
  "bounced",
  "complained",
  "failed",
  "review",
  "suppressed",
] as const;
export type DeliveryRow = {
  id: string;
  kind: string;
  resource_id: string;
  event_status: string;
  scope: string;
  state: string;
  attempts: number;
  error_code: string | null;
  created_at: string;
  updated_at: string;
};
export type NotificationPage = {
  allowed: boolean;
  rows: DeliveryRow[];
  total: number;
  page: number;
  state: string;
  liveEnabled: boolean;
  error?: string;
  demo?: boolean;
};
export async function loadNotifications(
  identity: Awaited<ReturnType<typeof requireStaff>>,
  params: QueryParams,
): Promise<NotificationPage> {
  const page = Math.max(1, Math.min(10000, Number(params.page) || 1)),
    state =
      typeof params.status === "string" &&
      (DELIVERY_STATES as readonly string[]).includes(params.status)
        ? params.status
        : "";
  const result: NotificationPage = {
    allowed: identity.roles.includes("owner"),
    rows: [],
    total: 0,
    page,
    state,
    liveEnabled: false,
  };
  if (!result.allowed) return result;
  const r = await identity.client.rpc("notification_delivery_page", {
    p_page: page,
    p_state: state,
  });
  if (r.error)
    return {
      ...result,
      error:
        "Notification records could not be loaded. Refresh or check the migration/configuration status.",
    };
  return {
    ...result,
    rows: r.data.rows,
    total: r.data.total,
    liveEnabled: r.data.live_enabled,
  };
}
export const demoNotifications: NotificationPage = {
  allowed: true,
  demo: true,
  total: 3,
  page: 1,
  state: "",
  liveEnabled: false,
  rows: [
    {
      id: "demo-mail-1",
      kind: "invoice_issue",
      resource_id: "demo-invoice-001",
      event_status: "",
      scope: "test",
      state: "delivered",
      attempts: 1,
      error_code: null,
      created_at: "2026-10-26T17:00:00Z",
      updated_at: "2026-10-26T17:01:00Z",
    },
    {
      id: "demo-mail-2",
      kind: "document_requested",
      resource_id: "demo-document-1",
      event_status: "",
      scope: "test",
      state: "retry",
      attempts: 2,
      error_code: "provider_rate_limited",
      created_at: "2026-10-26T17:00:00Z",
      updated_at: "2026-10-26T17:01:00Z",
    },
    {
      id: "demo-mail-3",
      kind: "shipment_update",
      resource_id: "demo-001",
      event_status: "received_us",
      scope: "test",
      state: "accepted",
      attempts: 1,
      error_code: null,
      created_at: "2026-10-26T17:00:00Z",
      updated_at: "2026-10-26T17:01:00Z",
    },
  ],
};
