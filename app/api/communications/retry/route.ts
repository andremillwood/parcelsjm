import { z } from "zod";
import { getIdentity } from "../../../../lib/auth/session";
import { readJson, InputError, reply } from "../../../../lib/http/input";
import { scheduleEmails } from "../../../../lib/communications/schedule";
export async function POST(request: Request) {
  const identity = await getIdentity();
  if (!identity || identity.profile.account_status === "suspended")
    return reply(401, "Sign in with a verified active account.");
  const roles = await identity.client
    .from("admin_role_assignments")
    .select("role")
    .eq("profile_id", identity.user.id);
  if (roles.error || !roles.data?.some((r) => r.role === "owner"))
    return reply(403, "Owner access required.");
  try {
    const d = z
      .object({ id: z.uuid(), reason: z.string().trim().min(10).max(500) })
      .parse(await readJson(request));
    const r = await identity.client.rpc("retry_email_job", {
      p_id: d.id,
      p_reason: d.reason,
    });
    if (r.error)
      return reply(
        409,
        "Retry not scheduled. The message may be expired, suppressed, exhausted or changed. Review its delivery history.",
      );
    scheduleEmails();
    return reply(
      200,
      "Controlled retry requested. Provider acceptance and delivery remain separate outcomes.",
    );
  } catch (e) {
    return reply(
      e instanceof InputError ? e.status : e instanceof z.ZodError ? 400 : 503,
      e instanceof InputError
        ? e.message
        : "Check the notification and a reason of 10–500 characters, then retry.",
    );
  }
}
