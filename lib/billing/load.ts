import "server-only";
import type { getIdentity } from "../auth/session";
import { listOptions, type QueryParams } from "../workspace/pagination";
import type { BillingData, Invoice } from "./model";
export async function loadBilling(
  identity: NonNullable<Awaited<ReturnType<typeof getIdentity>>>,
  params: QueryParams = {},
  id?: string,
): Promise<BillingData> {
  const c = identity.client,
    roles = await c
      .from("admin_role_assignments")
      .select("role")
      .eq("profile_id", identity.user.id),
    owner = roles.data?.some((r) => r.role === "owner") ?? false,
    canManage =
      owner || (roles.data?.some((r) => r.role === "finance") ?? false);
  const data: BillingData = {
    enabled: process.env.BILLING_ENABLED === "true",
    demo: false,
    canManage,
    owner,
    invoices: [],
    payments: [],
    adjustments: [],
    history: [],
    costs: [],
    rates: [],
  };
  if (!data.enabled) return data;
  const o = listOptions(params);
  let query = c
    .from("billing_invoices")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id");
  if (id) query = query.eq("id", id);
  else {
    if (o.search)
      query = /^\d+$/.test(o.search)
        ? query.eq("number", Number(o.search))
        : query.ilike("tracking", `%${o.search}%`);
    if (["draft", "issued", "disputed", "void"].includes(o.status))
      query = query.eq("status", o.status);
    query = query.range(o.from, o.to);
  }
  const invoices = await query;
  data.invoices = (invoices.data ?? []) as Invoice[];
  if (!id)
    data.pagination = { page: o.page, total: invoices.count ?? 0, params };
  if (invoices.error || roles.error)
    data.error =
      "Billing records could not be fully loaded. Refresh before making changes.";
  if (id && data.invoices.length) {
    const [payments, adjustments, history, costs, proofs] = await Promise.all([
      c
        .from("billing_payments")
        .select(
          "id,invoice_id,kind,amount_cents,channel,reference,reverses_id,created_at",
        )
        .eq("invoice_id", id)
        .order("created_at")
        .order("id"),
      c
        .from("billing_adjustments")
        .select("id,invoice_id,kind,amount_cents,description,created_at")
        .eq("invoice_id", id)
        .order("created_at")
        .order("id"),
      c
        .from("billing_history")
        .select("id,invoice_id,action,message,created_at")
        .eq("invoice_id", id)
        .order("created_at")
        .order("id"),
      canManage
        ? c
            .from("billing_cost_records")
            .select("id,invoice_id,revision,amounts_jmd_cents,evidence")
            .eq("invoice_id", id)
            .order("revision", { ascending: false })
            .limit(1)
        : Promise.resolve({ data: [], error: null }),
      canManage
        ? c.rpc("billing_payment_proofs", { p_invoice: id })
        : Promise.resolve({ data: [], error: null }),
    ]);
    data.payments = (payments.data ?? []).map((p) => ({
      ...p,
      ...(canManage
        ? {
            evidence: proofs.data?.find(
              (e: { payment_id: string; evidence: string }) =>
                e.payment_id === p.id,
            )?.evidence,
          }
        : {}),
    }));
    data.adjustments = adjustments.data ?? [];
    data.history = history.data ?? [];
    data.costs = costs.data ?? [];
    if (
      payments.error ||
      adjustments.error ||
      history.error ||
      costs.error ||
      proofs.error ||
      [payments.data, adjustments.data, history.data].some(
        (rows) => rows && rows.length >= 1000,
      )
    )
      data.error =
        "Invoice ledger could not be fully loaded. Refresh before making changes.";
  }
  if (canManage) {
    const rates = await c
      .from("billing_rate_cards")
      .select("id,version,status,effective_at,rates_cents,approval_reference")
      .order("version", { ascending: false })
      .limit(25);
    data.rates = rates.data ?? [];
    if (rates.error) data.error = "Approved rates could not be loaded.";
  }
  return data;
}
