import "server-only";
import type { getIdentity } from "../auth/session";
import { listOptions, type QueryParams } from "./pagination";
export type OperationalTask = {
  id: string;
  kind: string;
  source_id: string;
  reference: string;
  state: string;
  assignee_id: string | null;
  priority: number;
  due_at: string | null;
  opened_at: string;
  version: number;
};
export async function loadQueues(
  identity: NonNullable<Awaited<ReturnType<typeof getIdentity>>>,
  params: QueryParams,
) {
  const o = listOptions(params),
    c = identity.client;
  let q = c
    .from("operational_tasks")
    .select(
      "id,kind,source_id,reference,state,assignee_id,priority,due_at,opened_at,version",
      { count: "exact" },
    )
    .order("priority", { ascending: false })
    .order("opened_at")
    .order("id");
  q = q.eq("state", o.status === "closed" ? "closed" : "open");
  if (["shipment", "intake", "document", "support"].includes(o.kind))
    q = q.eq("kind", o.kind);
  if (o.search) q = q.ilike("reference", `%${o.search}%`);
  if (o.assignee === "mine") q = q.eq("assignee_id", identity.user.id);
  if (o.assignee === "unassigned") q = q.is("assignee_id", null);
  if (/^[0-3]$/.test(o.priority)) q = q.eq("priority", Number(o.priority));
  if (o.overdue)
    q = q.lt("due_at", new Date().toISOString()).eq("state", "open");
  const [result, ...staff] = await Promise.all([
    q.range(o.from, o.to),
    ...["shipment", "intake", "document", "support"].map((kind) =>
      c.rpc("queue_assignees", { p_kind: kind }),
    ),
  ]);
  return {
    observedAt: new Date().toISOString(),
    tasks: (result.data ?? []) as OperationalTask[],
    pagination: { page: o.page, total: result.count ?? 0, params },
    assignees: Object.fromEntries(
      ["shipment", "intake", "document", "support"].map((kind, i) => [
        kind,
        staff[i].data ?? [],
      ]),
    ) as Record<string, { id: string; name: string }[]>,
    error:
      result.error || staff.some((s) => s.error)
        ? "Queue records could not be fully loaded. Refresh before making changes."
        : undefined,
  };
}
