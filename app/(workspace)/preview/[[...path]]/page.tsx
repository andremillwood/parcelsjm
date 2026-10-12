import { notFound } from "next/navigation";
import { WorkspaceShell } from "../../../../components/workspace/shell";
import { CustomerWorkspace } from "../../../../components/workspace/customer";
import { OperationsWorkspace } from "../../../../components/workspace/operations";
import { sampleData } from "../../../../lib/workspace/model";
export const metadata = { title: "Workspace design preview | Parcels JA" };
export default async function Preview({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  const admin = path[0] === "admin";
  if (!["app", "admin"].includes(path[0])) notFound();
  const section = path.slice(1).join("/");
  const valid = admin
    ? [
        "",
        "customers",
        "packages",
        "intake",
        "documents",
        "support",
        "billing",
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
    !sampleData.packages.some((p) => section === `packages/${p.id}`)
  )
    notFound();
  return (
    <WorkspaceShell
      admin={admin}
      demo
      name={admin ? "Operations team" : sampleData.name}
      path={section}
    >
      {admin ? (
        <OperationsWorkspace data={sampleData} path={section} />
      ) : (
        <CustomerWorkspace data={sampleData} path={section} />
      )}
    </WorkspaceShell>
  );
}
