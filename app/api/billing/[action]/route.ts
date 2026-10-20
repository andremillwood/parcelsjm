import { getIdentity } from "../../../../lib/auth/session";
import { readJson, reply, InputError } from "../../../../lib/http/input";
import { billingSchemas } from "../../../../lib/billing/schema";
import { COST_FIELDS } from "../../../../lib/billing/pricing";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    if (process.env.BILLING_ENABLED !== "true")
      return reply(503, "Billing is not activated in this environment.");
    const identity = await getIdentity();
    if (!identity || identity.profile.account_status !== "active")
      return reply(401, "Sign in with an active verified account.");
    const roles = await identity.client
      .from("admin_role_assignments")
      .select("role")
      .eq("profile_id", identity.user.id);
    if (
      roles.error ||
      !roles.data?.some((r) => ["owner", "finance"].includes(r.role))
    )
      return reply(403, "An authorized finance role is required.");
    const { action } = await params,
      body = await readJson(request);
    let result;
    const c = identity.client;
    switch (action) {
      case "draft": {
        const d = billingSchemas.draft.parse(body);
        result = await c.rpc("create_billing_invoice", {
          p_package: d.packageId,
          p_weight: d.weight,
          p_extras: {
            duties_tax: d.dutiesTax,
            handling: d.handling,
            local_delivery: d.localDelivery,
            storage: d.storage,
          },
          p_evidence: d.evidence,
          p_due: d.due || null,
        });
        break;
      }
      case "quote": {
        const d = billingSchemas.quote.parse(body);
        result = await c.rpc("approve_billing_quote", {
          p_package: d.packageId,
          p_weight: d.weight,
          p_amount: d.amount,
          p_evidence: d.evidence,
        });
        break;
      }
      case "status": {
        const d = billingSchemas.status.parse(body);
        result = await c.rpc("change_billing_invoice", {
          p_id: d.id,
          p_version: d.version,
          p_action: d.decision,
          p_message: d.message,
          p_reason: d.reason,
        });
        break;
      }
      case "payment": {
        const d = billingSchemas.payment.parse(body);
        result = await c.rpc("record_billing_payment", {
          p_id: d.id,
          p_version: d.version,
          p_amount: d.amount,
          p_channel: d.channel,
          p_reference: d.reference,
          p_evidence: d.evidence,
          p_reason: d.reason,
        });
        break;
      }
      case "reversal": {
        const d = billingSchemas.reversal.parse(body);
        result = await c.rpc("reverse_billing_payment", {
          p_id: d.id,
          p_version: d.version,
          p_payment: d.paymentId,
          p_reference: d.reference,
          p_evidence: d.evidence,
          p_reason: d.reason,
        });
        break;
      }
      case "adjustment": {
        const d = billingSchemas.adjustment.parse(body);
        result = await c.rpc("adjust_billing_invoice", {
          p_id: d.id,
          p_version: d.version,
          p_kind: d.kind,
          p_amount: d.direction === "credit" ? -d.amount : d.amount,
          p_description: d.description,
          p_reason: d.reason,
        });
        break;
      }
      case "costs": {
        const d = billingSchemas.costs.parse(body);
        result = await c.rpc("record_billing_costs", {
          p_id: d.id,
          p_version: d.version,
          p_costs: Object.fromEntries(COST_FIELDS.map((k) => [k, d[k]])),
          p_evidence: d.evidence,
        });
        break;
      }
      case "rate": {
        const d = billingSchemas.rate.parse(body);
        result = await c.rpc("create_billing_rate", {
          p_rates: d.rates,
          p_effective: d.effective,
          p_reason: d.reason,
        });
        break;
      }
      case "approve-rate": {
        const d = billingSchemas["approve-rate"].parse(body);
        result = await c.rpc("approve_billing_rate", {
          p_id: d.id,
          p_reason: d.reason,
        });
        break;
      }
      default:
        return reply(404, "Billing action unavailable.");
    }
    if (result.error)
      return reply(
        409,
        "Not recorded. Refresh and check the invoice version, role, payment reference, outstanding balance and required approvals.",
      );
    return reply(200, "Recorded. Email notifications remain deferred.");
  } catch (e) {
    if (e instanceof InputError) return reply(e.status, e.message);
    if (e instanceof Error && e.name === "ZodError")
      return reply(
        400,
        "Check required fields, exact JMD amounts and evidence.",
      );
    return reply(
      503,
      "The financial change could not be confirmed. Refresh before retrying.",
    );
  }
}
