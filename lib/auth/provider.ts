import "server-only";
import { registrationAvailable } from "./config";

/** Keep signup unavailable when Auth cannot create and verify email accounts. */
export async function registrationReady() {
  if (!registrationAvailable()) return false;
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,
      {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) return false;
    const settings = await response.json();
    return (
      settings.disable_signup === false &&
      settings.external?.email === true &&
      settings.mailer_autoconfirm === false
    );
  } catch {
    return false;
  }
}
