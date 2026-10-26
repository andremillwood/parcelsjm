import "server-only";
import { randomUUID } from "node:crypto";
import { emailConfig } from "./config";
import { renderMessage } from "./templates";
export type EmailJob = {
  id: string;
  recipient_email: string;
  kind: string;
  resource_id: string;
  event_status: string;
  template_version: number;
  provider_payload: Record<string, unknown> | null;
};
export async function communicationRpc<T>(
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${name}`,
    {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: {
        apikey: key ?? "",
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    },
  );
  if (!r.ok) throw new Error("Notification storage unavailable");
  const text = await r.text();
  return (text ? JSON.parse(text) : null) as T;
}
export async function dispatchEmails() {
  const config = emailConfig();
  if (!config) return { enabled: false, reviewed: 0, accepted: 0, pending: 0 };
  const summary = { enabled: true, reviewed: 0, accepted: 0, pending: 0 };
  const start = Date.now();
  for (let n = 0; n < 5 && Date.now() - start < 20000; n++) {
    const token = randomUUID();
    const jobs = await communicationRpc<EmailJob[]>("claim_email_jobs", {
      p_scope: config.scope,
      p_token: token,
      p_staff: config.staff,
    });
    if (!jobs.length) break;
    const job = jobs[0];
    summary.reviewed++;
    let payload = job.provider_payload;
    if (!payload) {
      try {
        payload = {
          from: config.from,
          to: [
            config.scope === "test"
              ? "delivered@resend.dev"
              : job.recipient_email,
          ],
          reply_to: config.replyTo,
          ...renderMessage(
            job.kind,
            job.resource_id,
            job.event_status,
            config.origin,
            job.template_version,
          ),
          tags: [{ name: "notification_id", value: job.id }],
        };
      } catch {
        await communicationRpc("finish_email", {
          p_id: job.id,
          p_token: token,
          p_provider: null,
          p_result: "review",
          p_error: "template_unavailable",
        });
        continue;
      }
      payload = await communicationRpc("prepare_email", {
        p_id: job.id,
        p_token: token,
        p_payload: payload,
      });
    }
    let provider: string | null = null,
      result = "retry",
      error = "provider_unavailable";
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(8000),
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `parcels-v1/${job.id}`,
        },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        const d = await r.json();
        if (typeof d.id === "string" && d.id.length < 200) {
          provider = d.id;
          result = "accepted";
          error = "";
        } else error = "provider_confirmation_missing";
      } else if (r.status === 409) {
        result = "review";
        error = "idempotency_conflict";
      } else if (r.status === 429) {
        error = "provider_rate_limited";
      } else if (r.status >= 400 && r.status < 500) {
        result = "failed";
        error = "provider_rejected";
      }
    } catch {
      /* A timeout is ambiguous. Retry the frozen payload under the same provider key. */
    }
    await communicationRpc("finish_email", {
      p_id: job.id,
      p_token: token,
      p_provider: provider,
      p_result: result,
      p_error: error || null,
    });
    if (result === "accepted") summary.accepted++;
    else summary.pending++;
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  return summary;
}
