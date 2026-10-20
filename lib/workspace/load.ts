import { SHIPMENT_STATES } from "../billing/pricing";
import "server-only";
import type { getIdentity } from "../auth/session";
import { listOptions, type QueryParams } from "./pagination";
import type { WorkspaceData, PackageRecord } from "./model";
export async function loadWorkspace(
  identity: NonNullable<Awaited<ReturnType<typeof getIdentity>>>,
  admin = false,
  section = "",
  params: QueryParams = {},
): Promise<WorkspaceData> {
  const c = identity.client;
  const o = listOptions(params),
    detail = section.startsWith("packages/") ? section.split("/")[1] : null;
  const collection =
    section === "packages"
      ? "packages"
      : section === "support"
        ? "support"
        : section === "customers"
          ? "customers"
          : section === "intake"
            ? "intake"
            : section === "audit"
              ? "audit"
              : section === "documents"
                ? "documents"
                : null;
  let query = c
    .from("packages")
    .select(
      "id,profile_id,carrier_tracking,merchant,description,status,resume_status,document_state,payment_state,declared_value,declared_currency,created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("id");
  if (detail) query = query.eq("id", detail);
  else if (collection === "packages") {
    if (o.search)
      query = query.or(
        `carrier_tracking.ilike.%${o.search}%,merchant.ilike.%${o.search}%,description.ilike.%${o.search}%`,
      );
    if (o.status === "action") query = query.eq("document_state", "requested");
    else if ((SHIPMENT_STATES as readonly string[]).includes(o.status))
      query = query.eq("status", o.status);
    query = query.range(o.from, o.to);
  } else query = query.limit(25);
  if (!admin) query = query.eq("profile_id", identity.user.id);
  let supportQuery = c
    .from("support_requests")
    .select("id,subject,body,status,reply,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id");
  if (collection === "support") {
    if (o.search)
      supportQuery = /^[a-f0-9-]{36}$/.test(o.search)
        ? supportQuery.eq("id", o.search)
        : supportQuery.ilike("subject", `%${o.search}%`);
    supportQuery = supportQuery.range(o.from, o.to);
  } else supportQuery = supportQuery.limit(25);
  let eventQuery = c
    .from("package_events")
    .select(
      "id,package_id,status,occurred_at,sequence,corrects_event_id,correction_reason",
    )
    .order("sequence");
  // Detail lookup must not depend on the first page of packages or other customers' events.
  if (detail) eventQuery = eventQuery.eq("package_id", detail);
  else eventQuery = eventQuery.limit(100);
  const [packages, support, events] = await Promise.all([
    query,
    supportQuery,
    eventQuery,
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
  if (collection === "packages" || collection === "support")
    data.pagination = {
      page: o.page,
      total: (collection === "packages" ? packages.count : support.count) ?? 0,
      params,
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
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("id");
  if (collection === "documents") {
    if (o.search)
      requestsQuery = /^[a-f0-9-]{36}$/.test(o.search)
        ? requestsQuery.eq("id", o.search)
        : requestsQuery.ilike("document_type", `%${o.search}%`);
    requestsQuery = requestsQuery.range(o.from, o.to);
  } else if (detail) requestsQuery = requestsQuery.eq("package_id", detail);
  else requestsQuery = requestsQuery.limit(25);
  if (!admin) requestsQuery = requestsQuery.eq("profile_id", identity.user.id);
  const requests = await requestsQuery;
  if (collection === "documents")
    data.pagination = { page: o.page, total: requests.count ?? 0, params };
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
    function staffList(
      table: string,
      fields: string,
      key: string,
      searchField: string,
    ) {
      let q = c
        .from(table)
        .select(fields, { count: "exact" })
        .order("created_at", { ascending: false })
        .order("id");
      if (collection !== key) return q.limit(25);
      if (o.search)
        q = /^[a-f0-9-]{36}$/.test(o.search)
          ? q.eq("id", o.search)
          : q.ilike(searchField, `%${o.search}%`);
      return q.range(o.from, o.to);
    }
    const [customers, intake, audit, warehouses] = await Promise.all([
      staffList(
        "profiles",
        "id,full_name,account_status",
        "customers",
        "full_name",
      ),
      staffList(
        "intake_observations",
        "id,tracking,source_reference,package_id,created_at",
        "intake",
        "tracking",
      ),
      staffList(
        "audit_logs",
        "id,entity_type,entity_id,action,reason,created_at",
        "audit",
        "action",
      ),
      c.from("warehouses").select("id,name").eq("active", true),
    ]);
    const current = { customers, intake, audit }[
      collection as "customers" | "intake" | "audit"
    ];
    if (current)
      data.pagination = { page: o.page, total: current.count ?? 0, params };
    data.customers = (customers.data ??
      []) as unknown as WorkspaceData["customers"];
    data.intake = (intake.data ?? []) as unknown as WorkspaceData["intake"];
    data.audit = (audit.data ?? []) as unknown as WorkspaceData["audit"];
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
