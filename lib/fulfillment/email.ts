import "server-only";
import { privilegedClient } from "../supabase/privileged";
export async function sendPickupTicket(ticketId: string) {
  if (
    !process.env.RESEND_API_KEY ||
    !process.env.RESEND_FROM_EMAIL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    return "Ticket saved in the customer account. Email is pending because the email service is unavailable.";
  const c = privilegedClient();
  const { data: t, error } = await c
    .from("pickup_tickets")
    .select("*")
    .eq("id", ticketId)
    .single();
  if (error || !t) throw new Error("Ticket unavailable");
  if (t.email_state === "accepted")
    return "Ticket saved. Email accepted by the email service.";
  // Provider idempotency keys expire after 24 hours. Never risk a duplicate after that window.
  if (
    t.email_state === "review" ||
    Date.now() - Date.parse(t.created_at) > 23 * 3600000
  ) {
    await c
      .from("pickup_tickets")
      .update({ email_state: "review" })
      .eq("id", ticketId);
    return "Ticket saved. Staff must review email delivery before trying again.";
  }
  const {
    data: { user },
    error: userError,
  } = await c.auth.admin.getUserById(t.profile_id);
  if (userError || !user?.email || !user.email_confirmed_at)
    return "Ticket saved. Email awaits a verified customer email address.";
  const available = new Date(t.available_at).toLocaleString("en-JM", {
    timeZone: "America/Jamaica",
    dateStyle: "full",
    timeStyle: "short",
  });
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `pickup-ticket/${t.id}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [user.email],
        subject: "Your Parcels JA pickup ticket",
        text: `Your package is available for pickup from ${available} (Jamaica time).\n\nTicket: ${t.id}\nPackage reference: ${t.package_id}\nLocation: ${t.location_name}\nAddress: ${t.address}\nOpening hours: ${t.hours}\n\n${t.instructions}\n\nThis is the availability time, not a collection deadline. Bring this ticket and identification. Your ticket is also available in your Parcels JA account.`,
      }),
    });
    if (!r.ok)
      return "Ticket saved in the customer account. Email was not accepted; staff can retry.";
    const saved = await c
      .from("pickup_tickets")
      .update({ email_state: "accepted" })
      .eq("id", ticketId);
    if (saved.error)
      return "Email accepted. Delivery status could not be saved; retry uses the same ticket reference.";
    return "Pickup ticket saved. Email accepted by the email service.";
  } catch {
    return "Ticket saved in the customer account. Email could not be confirmed; staff can retry.";
  }
}
