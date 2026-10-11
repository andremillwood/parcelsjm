import { timingSafeEqual } from "node:crypto";
import { leadsAvailable } from "../../../../lib/leads/config";
import { retryNotifications } from "../../../../lib/leads/store";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (
    !secret ||
    secret.length < 32 ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return new Response(null, { status: 401 });
  if (!leadsAvailable()) return new Response(null, { status: 503 });
  try {
    return Response.json(
      { reviewed: await retryNotifications() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return new Response(null, { status: 503 });
  }
}
