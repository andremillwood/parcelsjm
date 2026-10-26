import "server-only";
import { dispatchEmails } from "../communications/worker";
import type { LeadInput } from "./schema";
async function api(path: string, init: RequestInit) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`,
    {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    },
  );
  if (!response.ok) throw new Error("Inquiry storage unavailable");
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
export async function saveLead(
  input: LeadInput,
  hashes: { email: string; ip: string; payload: string },
) {
  const result = await api("rpc/submit_marketing_inquiry", {
    method: "POST",
    body: JSON.stringify({
      p_id: input.requestId,
      p_data: input,
      p_email_hash: hashes.email,
      p_ip_hash: hashes.ip,
      p_payload_hash: hashes.payload,
      p_privacy_version: process.env.LEAD_PRIVACY_VERSION,
    }),
  });
  if (result !== "accepted" && result !== "limited" && result !== "conflict")
    throw new Error("Unexpected inquiry response");
  return result;
}
// New inquiries are enqueued atomically by the database. Legacy deferred records
// are not replayed; provider acceptance and delivery live in notification_jobs.
export async function notifyLead(_id: string) {
  void _id;
  await dispatchEmails();
}
export async function retryNotifications() {
  return (await dispatchEmails()).reviewed;
}
