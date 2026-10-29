import { Shipments } from "../../../../components/workspace/shipments";
import { loadShipments } from "../../../../lib/shipments/load";
import { Billing } from "../../../../components/workspace/billing";
import { loadBilling } from "../../../../lib/billing/load";
import { Queues } from "../../../../components/workspace/queues";
import { loadQueues } from "../../../../lib/workspace/queues";
import { loadWorkspace } from "../../../../lib/workspace/load";
import { notFound } from "next/navigation";
import { requireStaff } from "../../../../lib/auth/session";
import { WorkspaceShell } from "../../../../components/workspace/shell";
import { OperationsWorkspace } from "../../../../components/workspace/operations";
export const dynamic = "force-dynamic";
export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<
    import("../../../../lib/workspace/pagination").QueryParams
  >;
}) {
  const identity = await requireStaff();
  const { path = [] } = await params;
  const section = path.join("/");
  if (
    ![
      "",
      "queues",
      "customers",
      "packages",
      "shipments",
      "intake",
      "documents",
      "support",
      "billing",
      "audit",
      "settings",
      "locations",
    ].includes(section) &&
    !/^packages\/[a-f0-9-]{36}$/.test(section) &&
    !/^billing\/[a-f0-9-]{36}$/.test(section) &&
    !/^shipments\/[a-f0-9-]{36}$/.test(section)
  )
    notFound();
  return (
    <WorkspaceShell
      admin
      staff
      superadmin={identity.roles.includes("owner")}
      name={identity.profile.full_name || "Staff"}
      path={section}
    >
      {section.startsWith("shipments") ? (
        <Shipments
          id={section.split("/")[1]}
          data={await loadShipments(
            identity,
            await searchParams,
            section.split("/")[1],
          )}
        />
      ) : section.startsWith("billing") ? (
        <Billing
          admin
          id={section.split("/")[1]}
          data={await loadBilling(
            identity,
            await searchParams,
            section.split("/")[1],
          )}
        />
      ) : section === "queues" ? (
        <Queues data={await loadQueues(identity, await searchParams)} />
      ) : (
        <OperationsWorkspace
          path={section}
          data={await loadWorkspace(
            identity,
            true,
            section,
            await searchParams,
          )}
        />
      )}
    </WorkspaceShell>
  );
}
