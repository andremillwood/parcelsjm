import "server-only";
import type { getIdentity } from "../auth/session";
import { listOptions, type QueryParams } from "../workspace/pagination";
export type Consolidation = {
  id: string;
  reference: string;
  partner_reference: string;
  status: string;
  version: number;
  created_at: string;
  manifest: { package_id: string; tracking: string; status: string }[] | null;
};
export type ShipmentData = {
  demo: boolean;
  canManage: boolean;
  batches: Consolidation[];
  members: { package_id: string; consolidation_id: string }[];
  pagination?: { page: number; total: number; params: QueryParams };
  error?: string;
};
export async function loadShipments(
  identity: NonNullable<Awaited<ReturnType<typeof getIdentity>>>,
  params: QueryParams,
  id?: string,
): Promise<ShipmentData> {
  const c = identity.client,
    o = listOptions(params),
    roles = await c
      .from("admin_role_assignments")
      .select("role")
      .eq("profile_id", identity.user.id);
  let q = c
    .from("shipment_consolidations")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id");
  if (id) q = q.eq("id", id);
  else {
    if (o.search) q = q.ilike("reference", `%${o.search}%`);
    q = q.range(o.from, o.to);
  }
  const batches = await q;
  const members = id
    ? await c
        .from("shipment_manifest_members")
        .select("package_id,consolidation_id")
        .eq("consolidation_id", id)
        .limit(1000)
    : { data: [], error: null };
  return {
    demo: false,
    canManage: !!roles.data?.some((r) =>
      ["owner", "operations"].includes(r.role),
    ),
    batches: batches.data ?? [],
    members: members.data ?? [],
    pagination: id
      ? undefined
      : { page: o.page, total: batches.count ?? 0, params },
    ...(batches.error ||
    members.error ||
    roles.error ||
    (members.data?.length ?? 0) >= 1000
      ? {
          error:
            "Manifest could not be fully loaded. Refresh before making changes.",
        }
      : {}),
  };
}
export const demoShipments: ShipmentData = {
  demo: true,
  canManage: true,
  batches: [
    {
      id: "demo-batch",
      reference: "DEMO-CONSOLIDATION",
      partner_reference: "Fictional partner reference",
      status: "draft",
      version: 1,
      created_at: "2026-10-20T12:00:00Z",
      manifest: null,
    },
  ],
  members: [{ package_id: "demo-001", consolidation_id: "demo-batch" }],
};
