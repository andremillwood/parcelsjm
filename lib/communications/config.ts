import "server-only";
export function emailConfig() {
  const base = process.env.APP_BASE_URL;
  const staff = process.env.STAFF_NOTIFICATION_EMAIL;
  if (
    process.env.COMMUNICATIONS_ENABLED !== "true" ||
    !base ||
    !staff ||
    !process.env.RESEND_API_KEY ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staff)
  )
    return null;
  let origin: string;
  try {
    const u = new URL(base);
    if (
      u.protocol !== "https:" ||
      u.origin !== base ||
      !/^(parcelsjm\.vercel\.app|(?:www\.)?parcelsjm\.com|parcelsjm-[a-z0-9-]+\.vercel\.app)$/.test(
        u.hostname,
      )
    )
      return null;
    origin = u.origin;
  } catch {
    return null;
  }
  const mode = process.env.EMAIL_DELIVERY_MODE;
  if (mode !== "live" && mode !== "test") return null;
  if (mode === "live" && process.env.VERCEL_ENV === "preview") return null;
  return {
    origin,
    staff: staff.toLowerCase(),
    from: "Parcels JA <support@parcelsjm.com>",
    replyTo: staff.toLowerCase(),
    scope: mode,
  };
}
export function emailStatusMessage() {
  return emailConfig()
    ? "Email updates are queued separately; delivery is tracked independently."
    : "Email notifications are not activated.";
}
