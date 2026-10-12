import { leadsAvailable } from "../../../lib/leads/config";
import { handleLead } from "../../../lib/leads/handler";
import { notifyLead, saveLead } from "../../../lib/leads/store";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleLead(request, {
    enabled: leadsAvailable(),
    origin: new URL(request.url).origin,
    hashSecret: process.env.LEAD_RATE_LIMIT_SECRET ?? "",
    // Vercel overwrites this header. Never trust caller-supplied X-Forwarded-For.
    clientIp: process.env.VERCEL
      ? (request.headers.get("x-vercel-forwarded-for") ?? "unknown")
      : "local",
    save: saveLead,
    notify: notifyLead,
  });
}
