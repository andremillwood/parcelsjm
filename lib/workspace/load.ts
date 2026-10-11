import "server-only";
import type { getIdentity } from "../auth/session";
import type { WorkspaceData, PackageRecord } from "./model";
export async function loadWorkspace(
  identity: NonNullable<Awaited<ReturnType<typeof getIdentity>>>,
  admin = false,
): Promise<WorkspaceData> {
  const c = identity.client;
  let query = c
    .from("packages")
    .select(
      "id,carrier_tracking,merchant,description,status,document_state,payment_state,declared_value,declared_currency,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (!admin) query = query.eq("profile_id", identity.user.id);
  const [packages, support, events] = await Promise.all([
    query,
    c
      .from("support_requests")
      .select("id,subject,body,status,reply,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    c
      .from("package_events")
      .select("id,package_id,status,occurred_at")
      .order("occurred_at")
      .limit(500),
  ]);
  const data: WorkspaceData = {
    name: identity.profile.full_name || "Customer",
    accountType: identity.profile.account_type,
    demo: false,
    packages: (packages.data ?? []) as PackageRecord[],
    support: support.data ?? [],
    events: events.data ?? [],
  };
  if (packages.error || support.error || events.error)
    data.error =
      "Some records could not be loaded. Please retry; counts may be incomplete.";
  if (admin) {
    const [customers, intake, audit, warehouses] = await Promise.all([
      c
        .from("profiles")
        .select("id,full_name,account_status")
        .order("created_at", { ascending: false })
        .limit(100),
      c
        .from("intake_observations")
        .select("id,tracking,source_reference,package_id,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      c
        .from("audit_logs")
        .select("id,entity_type,entity_id,action,reason,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      c.from("warehouses").select("id,name").eq("active", true),
    ]);
    data.customers = customers.data ?? [];
    data.intake = intake.data ?? [];
    data.audit = audit.data ?? [];
    data.warehouses = warehouses.data ?? [];
    if (customers.error || intake.error || audit.error || warehouses.error)
      data.error =
        "Some staff records could not be loaded. Retry or check your role permissions.";
  } else {
    const { data: shipping } = await c
      .from("shipping_accounts")
      .select("customer_code,assigned_prefix,unit_identifier,warehouse_id")
      .eq("profile_id", identity.user.id)
      .eq("status", "active")
      .maybeSingle();
    if (shipping) {
      const { data: w } = await c
        .from("warehouses")
        .select("address_lines,city,region,postal_code,country")
        .eq("id", shipping.warehouse_id)
        .eq("active", true)
        .maybeSingle();
      if (w) {
        data.shippingAddress = [
          shipping.assigned_prefix,
          shipping.customer_code,
          shipping.unit_identifier,
          ...w.address_lines,
          w.city,
          w.region,
          w.postal_code,
          w.country,
        ].join(", ");
        data.customerCode = shipping.customer_code;
      }
    }
  }
  return data;
}
