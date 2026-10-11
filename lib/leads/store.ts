import "server-only";
import { randomUUID } from "node:crypto";
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
export async function notifyLead(id: string) {
  const token = randomUUID();
  if (
    !(await api("rpc/claim_marketing_notification", {
      method: "POST",
      body: JSON.stringify({ p_id: id, p_token: token }),
    }))
  )
    return;
  // Email contains only an opaque reference, no submitted personal data. Staff
  // review the private record in Supabase until the administrative app exists.
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `marketing-inquiry/${id}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [process.env.LEAD_NOTIFICATION_EMAIL],
      subject: "New Parcels JA inquiry",
      text: `A new inquiry is ready for authorized staff review.\nReference: ${id}\nOpen the private marketing_inquiries table in the approved Supabase project. This message is not a shipping confirmation.`,
    }),
  });
  if (!response.ok) throw new Error("Inquiry notification pending");
  const result = await response.json();
  if (typeof result.id !== "string")
    throw new Error("Notification confirmation missing");
  await api(
    `marketing_notifications?inquiry_id=eq.${id}&lease_token=eq.${token}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "sent",
        provider_id: result.id,
        sent_at: new Date().toISOString(),
        lease_until: null,
      }),
    },
  );
}
export async function retryNotifications() {
  const rows: { inquiry_id: string }[] = await api(
    `marketing_notifications?select=inquiry_id&status=neq.sent&attempts=lt.5&created_at=gt.${encodeURIComponent(new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString())}&or=(lease_until.is.null,lease_until.lt.${encodeURIComponent(new Date().toISOString())})&order=created_at.asc&limit=20`,
    { method: "GET" },
  );
  for (const row of rows) {
    try {
      await notifyLead(row.inquiry_id);
    } catch {
      /* Lease expires; operator can retry. */
    }
  }
  return rows.length;
}
