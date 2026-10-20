import { Shipments } from "../../../../components/workspace/shipments";
import { demoShipments } from "../../../../lib/shipments/load";
import { Billing } from "../../../../components/workspace/billing";
import { sampleBilling } from "../../../../lib/billing/demo";
import { Queues } from "../../../../components/workspace/queues";
import {
  listOptions,
  type QueryParams,
} from "../../../../lib/workspace/pagination";
import { notFound } from "next/navigation";
import { WorkspaceShell } from "../../../../components/workspace/shell";
import { CustomerWorkspace } from "../../../../components/workspace/customer";
import { OperationsWorkspace } from "../../../../components/workspace/operations";
import { sampleData } from "../../../../lib/workspace/model";
export const metadata = { title: "Workspace design preview | Parcels JA" };
export default async function Preview({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<QueryParams>;
}) {
  const { path = [] } = await params;
  const admin = path[0] === "admin";
  if (!["app", "admin"].includes(path[0])) notFound();
  const section = path.slice(1).join("/");
  const valid = admin
    ? [
        "",
        "queues",
        "customers",
        "packages",
        "intake",
        "documents",
        "support",
        "billing",
        "shipments",
        "shipments/demo-batch",
        "audit",
        "settings",
      ]
    : [
        "",
        "packages",
        "pre-alert/new",
        "documents",
        "billing",
        "support",
        "profile",
        "onboarding",
      ];
  if (
    !valid.includes(section) &&
    !sampleData.packages.some((p) => section === `packages/${p.id}`) &&
    section !== "billing/demo-invoice-001"
  )
    notFound();
  const query = await searchParams,
    o = listOptions(query);
  const allTasks = Array.from({ length: 32 }, (_, i) => ({
    id: `demo-task-${i}`,
    kind: ["shipment", "intake", "document", "support"][i % 4],
    source_id: i % 4 === 0 ? "demo-001" : `demo-source-${i}`,
    reference: `Fictional work ${String(i + 1).padStart(2, "0")}`,
    state: i === 31 ? "closed" : "open",
    assignee_id: null,
    priority: i < 2 ? 3 : 1,
    due_at: i === 0 ? "2026-10-01T12:00:00Z" : null,
    opened_at: "2026-10-10T12:00:00Z",
    version: 1,
  }));
  const tasks = allTasks.filter(
    (t) =>
      t.state === (o.status === "closed" ? "closed" : "open") &&
      (!o.kind || t.kind === o.kind) &&
      (!o.search ||
        t.reference.toLowerCase().includes(o.search.toLowerCase())) &&
      o.assignee !== "mine" &&
      (!o.priority || t.priority === Number(o.priority)) &&
      (!o.overdue || !!t.due_at),
  );
  const demoData = {
    ...sampleData,
    events: [
      {
        id: "demo-event-1",
        package_id: "demo-001",
        status: "processing_us",
        occurred_at: "2026-10-10T13:00:00Z",
        sequence: 1,
      },
    ],
  };
  return (
    <WorkspaceShell
      admin={admin}
      demo
      name={admin ? "Operations team" : sampleData.name}
      path={section}
    >
      {section.startsWith("shipments") ? (
        <Shipments id={section.split("/")[1]} data={demoShipments} />
      ) : section.startsWith("billing") ? (
        <Billing
          admin={admin}
          id={section.split("/")[1]}
          data={sampleBilling}
        />
      ) : admin ? (
        section === "queues" ? (
          <Queues
            demo
            data={{
              observedAt: "2026-10-15T14:00:00Z",
              tasks: tasks.slice(o.from, o.to + 1),
              pagination: { page: o.page, total: tasks.length, params: query },
              assignees: {},
              error: undefined,
            }}
          />
        ) : (
          <OperationsWorkspace data={demoData} path={section} />
        )
      ) : (
        <CustomerWorkspace data={sampleData} path={section} />
      )}
    </WorkspaceShell>
  );
}
