import { timingSafeEqual } from "node:crypto";
import { dispatchEmails } from "../../../../lib/communications/worker";
export const runtime = "nodejs";
export const maxDuration = 60;
async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  const a = Buffer.from(request.headers.get("authorization") ?? ""),
    b = Buffer.from(`Bearer ${secret}`);
  if (
    !secret ||
    secret.length < 32 ||
    a.length !== b.length ||
    !timingSafeEqual(a, b)
  )
    return new Response(null, { status: 401 });
  try {
    return Response.json(await dispatchEmails(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
export const GET = run;
export const POST = run;
