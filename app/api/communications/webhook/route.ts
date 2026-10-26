import { verifyEmailEvent } from "../../../../lib/communications/webhook";
import { communicationRpc } from "../../../../lib/communications/worker";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return new Response(null, { status: 503 });
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 65536) {
        await reader.cancel();
        return new Response(null, { status: 413 });
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let event;
  try {
    event = verifyEmailEvent(
      Buffer.concat(chunks).toString("utf8"),
      request.headers,
      secret,
    );
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!event) return new Response(null, { status: 200 });
  try {
    await communicationRpc("record_email_delivery", {
      p_receipt: event.receipt,
      p_provider: event.provider,
      p_type: event.type,
      p_hint: event.hint,
    });
    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
