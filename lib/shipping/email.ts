import "server-only";
import { privilegedClient } from "../supabase/privileged";
import { formatShippingAddress } from "./address";
export async function sendSignupAddress(profileId: string) {
  if (
    !process.env.RESEND_API_KEY ||
    !process.env.RESEND_FROM_EMAIL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    return;
  const c = privilegedClient();
  const { data: job } = await c
    .from("signup_address_email_jobs")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!job || job.state !== "pending") return;
  if (Date.now() - Date.parse(job.created_at) > 23 * 3600000) {
    await c
      .from("signup_address_email_jobs")
      .update({ state: "review" })
      .eq("id", job.id);
    return;
  }
  let payload = job.payload;
  if (!payload) {
    const [
      {
        data: { user },
      },
      { data: profile },
      { data: s },
    ] = await Promise.all([
      c.auth.admin.getUserById(profileId),
      c
        .from("profiles")
        .select("full_name,account_status")
        .eq("id", profileId)
        .single(),
      c
        .from("shipping_accounts")
        .select(
          "customer_code,assigned_prefix,unit_identifier,warehouse_id,status",
        )
        .eq("id", job.id)
        .single(),
    ]);
    if (
      !user?.email ||
      !profile ||
      profile.account_status === "suspended" ||
      !s ||
      s.status === "suspended"
    )
      return;
    const { data: w } = await c
      .from("warehouses")
      .select("address_lines,city,region,postal_code,country")
      .eq("id", s.warehouse_id)
      .eq("active", true)
      .single();
    if (!w) return;
    const address = formatShippingAddress({
      fullName: profile.full_name,
      prefix: s.assigned_prefix,
      customerCode: s.customer_code,
      unit: s.unit_identifier,
      addressLines: w.address_lines,
      city: w.city,
      region: w.region,
      postalCode: w.postal_code,
      country: w.country,
    });
    const draft = {
      from: process.env.RESEND_FROM_EMAIL,
      to: [user.email],
      subject: "Your Parcels JA US shipping address",
      text: `Welcome to Parcels JA. Your assigned US shipping address is:\n\n${address}\n\nKeep your PARJA number in both the recipient name and unit line. Verify your signup email and wait until your dashboard shows Address active before shipping. You can copy the complete address from your dashboard. This US receiving address is separate from pickup or delivery in Jamaica.`,
    };
    await c
      .from("signup_address_email_jobs")
      .update({ payload: draft })
      .eq("id", job.id)
      .is("payload", null);
    const frozen = await c
      .from("signup_address_email_jobs")
      .select("payload")
      .eq("id", job.id)
      .single();
    payload = frozen.data?.payload;
  }
  if (!payload) return;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `signup-address/${job.id}`,
      },
      body: JSON.stringify(payload),
    });
    if (r.ok)
      await c
        .from("signup_address_email_jobs")
        .update({ state: "accepted" })
        .eq("id", job.id);
  } catch {
    /* The durable pending job can be retried on email confirmation. */
  }
}
