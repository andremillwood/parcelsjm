import { loadWorkspace } from "../../../../lib/workspace/load";
import { notFound } from "next/navigation";
import { requireStaff } from "../../../../lib/auth/session";
import { WorkspaceShell } from "../../../../components/workspace/shell";
import { OperationsWorkspace } from "../../../../components/workspace/operations";
export const dynamic = "force-dynamic";
export default async function AdminPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const identity = await requireStaff();
  const { path = [] } = await params;
  const section = path.join("/");
  if (
    ![
      "",
      "customers",
      "packages",
      "intake",
      "documents",
      "support",
      "billing",
      "audit",
      "settings",
    ].includes(section) &&
    !/^packages\/[a-f0-9-]{36}$/.test(section)
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
      <OperationsWorkspace
        path={section}
        data={await loadWorkspace(identity, true)}
      />
    </WorkspaceShell>
  );
}
