import { loadWorkspace } from "../../../../lib/workspace/load";
import { notFound } from "next/navigation";
import { requireIdentity } from "../../../../lib/auth/session";
import { WorkspaceShell } from "../../../../components/workspace/shell";
import { CustomerWorkspace } from "../../../../components/workspace/customer";
import { AuthForm } from "../../../../components/auth/auth-form";
export const dynamic = "force-dynamic";
export default async function AppPage({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<
    import("../../../../lib/workspace/pagination").QueryParams
  >;
}) {
  const identity = await requireIdentity();
  const { data: assignments } = await identity.client
    .from("admin_role_assignments")
    .select("role")
    .eq("profile_id", identity.user.id);
  const roles = assignments?.map((row) => row.role) ?? [];
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
      staff={roles.length > 0}
      superadmin={roles.includes("owner")}
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
          data={await loadWorkspace(
            identity,
            false,
            section,
            await searchParams,
          )}
        />
      )}
    </WorkspaceShell>
  );
}
