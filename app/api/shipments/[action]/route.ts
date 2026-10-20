import { z } from "zod";
import { getIdentity } from "../../../../lib/auth/session";
import { readJson, InputError, reply } from "../../../../lib/http/input";
const reason = z.string().trim().min(5).max(2000);
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const identity = await getIdentity();
    if (!identity || identity.profile.account_status !== "active")
      return reply(401, "Sign in with an active verified account.");
    const roles = await identity.client
      .from("admin_role_assignments")
      .select("role")
      .eq("profile_id", identity.user.id);
    if (
      roles.error ||
      !roles.data?.some((r) => ["owner", "operations"].includes(r.role))
    )
      return reply(403, "Operations role required.");
    const { action } = await params,
      body = await readJson(request);
    let result;
    if (action === "create") {
      const d = z
        .object({ reference: z.string().trim().min(3).max(120), reason })
        .parse(body);
      result = await identity.client.rpc("create_consolidation", {
        p_reference: d.reference,
        p_reason: d.reason,
      });
    } else if (action === "manage") {
      const d = z
        .object({
          id: z.uuid(),
          version: z.coerce.number().int().positive(),
          decision: z.enum([
            "add",
            "remove",
            "reference",
            "dispatch",
            "arrive",
            "close",
            "cancel",
          ]),
          packageId: z.union([z.uuid(), z.literal("")]).default(""),
          partnerReference: z.string().trim().max(200).default(""),
          reason,
        })
        .parse(body);
      result = await identity.client.rpc("manage_consolidation", {
        p_id: d.id,
        p_version: d.version,
        p_action: d.decision,
        p_package: d.packageId || null,
        p_partner_reference: d.partnerReference,
        p_reason: d.reason,
      });
    } else return reply(404, "Action unavailable.");
    if (result.error)
      return reply(
        409,
        "Not saved. Refresh and check the manifest state, package eligibility, reference and evidence.",
      );
    return reply(
      200,
      "Saved. Package checkpoints remain individually verified; no partner automation or email was triggered.",
    );
  } catch (error) {
    if (error instanceof InputError) return reply(error.status, error.message);
    if (error instanceof z.ZodError)
      return reply(400, "Check the required fields and identifiers.");
    return reply(
      503,
      "The change could not be confirmed. Refresh before retrying.",
    );
  }
}
