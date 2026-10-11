import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authAvailable } from "./lib/auth/config";
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (authAvailable()) {
    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (values) => {
            values.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({ request });
            values.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );
    await client.auth.getUser();
  }
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
export const config = {
  matcher: [
    "/app/:path*",
    "/admin/:path*",
    "/api/auth/:path*",
    "/auth/:path*",
    "/api/pre-alerts/:path*",
    "/api/packages/:path*",
    "/api/admin/:path*",
    "/api/workspace/:path*",
    "/api/documents/:path*",
  ],
};
