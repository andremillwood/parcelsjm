import "server-only";
export function leadsAvailable() {
  return (
    process.env.LEAD_CAPTURE_ENABLED === "true" &&
    process.env.LEAD_PRIVACY_APPROVED === "true" &&
    !!process.env.LEAD_PRIVACY_VERSION &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !!process.env.RESEND_API_KEY &&
    !!process.env.RESEND_FROM_EMAIL &&
    !!process.env.LEAD_NOTIFICATION_EMAIL &&
    (process.env.LEAD_RATE_LIMIT_SECRET?.length ?? 0) >= 32
  );
}
