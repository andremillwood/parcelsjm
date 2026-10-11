import { loadWorkspace } from "../../../../lib/workspace/load";
import { notFound } from "next/navigation";
import { requireIdentity } from "../../../../lib/auth/session";
import { WorkspaceShell } from "../../../../components/workspace/shell";
import { CustomerWorkspace } from "../../../../components/workspace/customer";
import { AuthForm } from "../../../../components/auth/auth-form";
export const dynamic = "force-dynamic";
export default async function AppPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const identity = await requireIdentity();
  const { path = [] } = await params;
  const section = path.join("/");
  if (
    ![
      "",
      "packages",
      "pre-alert/new",
      "documents",
      "billing",
      "support",
      "profile",
      "onboarding",
      "security",
    ].includes(section) &&
    !/^packages\/[a-f0-9-]{36}$/.test(section)
  )
    notFound();
  return (
    <WorkspaceShell
      name={identity.profile.full_name || "Customer"}
      path={section}
    >
      {section === "security" ? (
        <>
          <h1>Account security</h1>
          <AuthForm mode="password" available />
        </>
      ) : (
        <CustomerWorkspace
          path={section}
          data={await loadWorkspace(identity)}
        />
      )}
    </WorkspaceShell>
  );
}
