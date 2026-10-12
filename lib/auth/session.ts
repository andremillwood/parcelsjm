import "server-only";
import { redirect } from "next/navigation";
import { authAvailable } from "./config";
import { serverClient } from "../supabase/server";
export async function getIdentity() {
  if (!authAvailable()) return null;
  const client = await serverClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user?.email_confirmed_at) return null;
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select(
      "id,full_name,phone,account_type,account_status,onboarding_completed_at",
    )
    .eq("id", user.id)
    .single();
  if (profileError || !profile) return null;
  return { client, user, profile };
}
export async function requireIdentity() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  if (identity.profile.account_status === "suspended")
    redirect("/account-unavailable");
  return identity;
}
export async function requireStaff() {
  const identity = await requireIdentity();
  const { data, error } = await identity.client
    .from("admin_role_assignments")
    .select("role")
    .eq("profile_id", identity.user.id);
  if (error || !data?.length) redirect("/app");
  return { ...identity, roles: data.map((row) => row.role as string) };
}
