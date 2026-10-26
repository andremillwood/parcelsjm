import { scheduleEmails } from "../../../../lib/communications/schedule";
import { emailStatusMessage } from "../../../../lib/communications/config";
import { getIdentity } from "../../../../lib/auth/session";
import { readJson, InputError, reply } from "../../../../lib/http/input";
import { workspaceSchemas } from "../../../../lib/workspace/schema";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await params;
    const identity = await getIdentity();
    if (!identity || identity.profile.account_status === "suspended")
      return reply(401, "Sign in with a verified account.");
    if (!(action in workspaceSchemas)) return reply(404, "Action unavailable.");
    const body = await readJson(request);
    const { client } = identity;
    const staffActions: Record<string, string[]> = {
      correction: ["owner", "operations"],
      event: ["owner", "operations"],
      intake: ["owner", "operations"],
      match: ["owner", "operations"],
      assignment: ["owner", "operations"],
      resolve: ["owner", "support"],
    };
    if (staffActions[action]) {
      const roles = await client
        .from("admin_role_assignments")
        .select("role")
        .eq("profile_id", identity.user.id);
      if (
        roles.error ||
        !roles.data?.some((row) => staffActions[action].includes(row.role))
      )
        return reply(403, "This action requires an authorized staff role.");
    }

    // Queue authorization is source-specific and is enforced atomically by its RPC.
    let result;
    switch (action) {
      case "pre-alert": {
        const d = workspaceSchemas["pre-alert"].parse(body);
        result = await client.rpc("create_pre_alert", {
          p_request: d.requestId,
          p_tracking: d.tracking,
          p_merchant: d.merchant,
          p_carrier: d.carrier,
          p_description: d.description,
          p_quantity: d.quantity,
          p_value: d.value,
          p_currency: d.currency,
          p_notes: d.notes,
        });
        break;
      }
      case "profile": {
        const d = workspaceSchemas.profile.parse(body);
        result = await client
          .from("profiles")
          .update({
            full_name: d.fullName,
            phone: d.phone,
            account_type: d.accountType,
          })
          .eq("id", identity.user.id)
          .select("id")
          .single();
        if (!result.error && identity.profile.account_status === "active")
          return reply(200, "Contact details saved.");
        if (!result.error) {
          const activation = await client.rpc("complete_onboarding");
          if (activation.error)
            return reply(
              200,
              "Contact details saved. Account activation still requires verified email and policy consent.",
            );
        }
        break;
      }
      case "support": {
        const d = workspaceSchemas.support.parse(body);
        result = await client.rpc("create_support", {
          p_request: d.requestId,
          p_subject: d.subject,
          p_body: d.body,
          p_reference: d.packageReference,
        });
        break;
      }
      case "event": {
        const d = workspaceSchemas.event.parse(body);
        result = await client.rpc("record_package_event", {
          p_package: d.packageId,
          p_expected: d.expected,
          p_status: d.status,
          p_source: d.source,
          p_reason: d.reason,
          p_occurred: d.occurred,
        });
        break;
      }
      case "correction": {
        const d = workspaceSchemas.correction.parse(body);
        result = await client.rpc("correct_package_event", {
          p_package: d.packageId,
          p_event: d.eventId,
          p_status: d.status,
          p_source: d.source,
          p_reason: d.reason,
          p_explanation: d.explanation,
          p_occurred: d.occurred,
        });
        break;
      }
      case "queue": {
        const d = workspaceSchemas.queue.parse(body);
        result = await client.rpc("manage_operational_task", {
          p_id: d.id,
          p_version: d.version,
          p_assignee: d.assignee || null,
          p_priority: d.priority,
          p_due: d.due || null,
          p_reason: d.reason,
        });
        break;
      }
      case "intake": {
        const d = workspaceSchemas.intake.parse(body);
        result = await client.rpc("record_intake", {
          p_tracking: d.tracking,
          p_source: d.source,
          p_reason: d.reason,
        });
        break;
      }
      case "match": {
        const d = workspaceSchemas.match.parse(body);
        result = await client.rpc("match_intake", {
          p_id: d.id,
          p_package: d.packageId,
          p_reason: d.reason,
        });
        break;
      }
      case "resolve": {
        const d = workspaceSchemas.resolve.parse(body);
        result = await client.rpc("resolve_support", {
          p_id: d.id,
          p_reply: d.reply,
          p_reason: d.reason,
        });
        break;
      }
      case "assignment": {
        const d = workspaceSchemas.assignment.parse(body);
        result = await client.rpc("assign_shipping", {
          p_profile: d.profileId,
          p_warehouse: d.warehouseId,
          p_code: d.code,
          p_prefix: d.prefix,
          p_unit: d.unit,
          p_reason: d.reason,
        });
        break;
      }
    }
    if (!result || result.error)
      return reply(
        409,
        "The change was not saved. Check permissions, onboarding, duplicate references and current record state, then refresh.",
      );
    scheduleEmails();
    return reply(
      200,
      action === "profile"
        ? "Profile saved and onboarding completed."
        : `Saved. ${emailStatusMessage()}`,
    );
  } catch (error) {
    if (error instanceof InputError) return reply(error.status, error.message);
    if (error instanceof Error && error.name === "ZodError")
      return reply(400, "Check required fields and valid values.");
    return reply(
      503,
      "Service unavailable. Your change could not be confirmed.",
    );
  }
}
