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
      "id,profile_id,carrier_tracking,merchant,description,status,document_state,payment_state,declared_value,declared_currency,created_at",
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
    phone: identity.profile.phone,
    onboardingPending: identity.profile.account_status !== "active",
    demo: false,
    packages: (packages.data ?? []) as PackageRecord[],
    support: support.data ?? [],
    events: events.data ?? [],
  };
  if (packages.error || support.error || events.error)
    data.error =
      "Some records could not be loaded. Please retry; counts may be incomplete.";
  const roles = await c
    .from("admin_role_assignments")
    .select("role")
    .eq("profile_id", identity.user.id);
  let requestsQuery = c
    .from("document_requests")
    .select(
      "id,profile_id,package_id,document_type,instructions,status,version,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (!admin) requestsQuery = requestsQuery.eq("profile_id", identity.user.id);
  const requests = await requestsQuery;
  const ids = (requests.data ?? []).map((r) => r.id);
  const [uploads, history] = ids.length
    ? await Promise.all([
        c
          .from("document_uploads")
          .select(
            "id,request_id,version,filename,declared_size,scan_state,amount,currency,merchant,order_reference,created_at",
          )
          .in("request_id", ids)
          .order("created_at", { ascending: false })
          .limit(500),
        c
          .from("document_history")
          .select("id,request_id,upload_id,action,reason,created_at")
          .in("request_id", ids)
          .order("created_at", { ascending: false })
          .limit(1000),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  data.documents = {
    requests: requests.data ?? [],
    uploads: uploads.data ?? [],
    history: history.data ?? [],
    canRequest:
      roles.data?.some((r) =>
        ["owner", "documents", "operations"].includes(r.role),
      ) ?? false,
    canReview:
      roles.data?.some((r) => ["owner", "documents"].includes(r.role)) ?? false,
    uploadsEnabled: process.env.DOCUMENT_UPLOADS_ENABLED === "true",
  };
  if (requests.error || uploads.error || history.error)
    data.error =
      "Document records could not be loaded. Refresh before taking action.";
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
