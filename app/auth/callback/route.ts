import { sendSignupAddress } from "../../../lib/shipping/email";
import { NextResponse } from "next/server";
import { serverClient } from "../../../lib/supabase/server";
import { authAvailable, safeNext } from "../../../lib/auth/config";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (authAvailable() && code) {
    const client = await serverClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (user?.id) {
        try {
          await sendSignupAddress(user.id);
        } catch {
          /* The dashboard remains available when email is unavailable. */
        }
      }
      return NextResponse.redirect(
        new URL(safeNext(url.searchParams.get("next")), url.origin),
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  }
  return NextResponse.redirect(
    new URL("/login?error=verification", url.origin),
    { headers: { "Cache-Control": "no-store" } },
  );
}
