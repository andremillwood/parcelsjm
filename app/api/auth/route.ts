import { sendSignupAddress } from "../../../lib/shipping/email";
import { readJson, InputError } from "../../../lib/http/input";
import { authAvailable, registrationAvailable } from "../../../lib/auth/config";
import { authSchema, registrationErrors } from "../../../lib/auth/schema";
import { serverClient } from "../../../lib/supabase/server";
export async function POST(request: Request) {
  const reply = (status: number, message: string) =>
    Response.json(
      { message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  if (!authAvailable())
    return reply(503, "Account access is not yet activated.");
  let input;
  try {
    const body = await readJson(request);
    // Fail closed before parsing identity fields or constructing a provider client.
    if (
      body &&
      typeof body === "object" &&
      "action" in body &&
      body.action === "register" &&
      !registrationAvailable()
    )
      return reply(503, "Registration awaits approved account policies.");
    input = authSchema.safeParse(body);
  } catch (error) {
    return reply(
      error instanceof InputError ? error.status : 400,
      error instanceof InputError ? error.message : "Invalid request.",
    );
  }
  if (!input.success)
    return Response.json(
      {
        message: "Check the required fields and try again.",
        fieldErrors: registrationErrors(input.error.issues),
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  const client = await serverClient();
  const data = input.data;
  const origin = new URL(request.url).origin;
  try {
    if (data.action === "logout") {
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError)
        return reply(503, "Sign-out could not be confirmed. Please retry.");
      return reply(200, "Signed out.");
    }
    if (data.action === "login") {
      const { error } = await client.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      return error
        ? reply(
            error.status === 429 ? 429 : 400,
            "Sign-in failed. Check your details and email verification.",
          )
        : reply(200, "Signed in.");
    }
    if (data.action === "register") {
      if (!registrationAvailable())
        return reply(503, "Registration awaits approved account policies.");
      if (data.fulfillmentMethod === "delivery" && !data.deliveryAddress)
        return reply(
          400,
          "Enter the address where you want packages delivered.",
        );
      const { data: signup, error } = await client.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
          data: {
            full_name: data.fullName,
            phone: data.phone,
            trn: data.trn,
            home_address: data.homeAddress,
            account_type: data.accountType,
            fulfillment_method: data.fulfillmentMethod,
            delivery_address:
              data.fulfillmentMethod === "delivery"
                ? data.deliveryAddress
                : undefined,
            policy_version: process.env.ACCOUNT_POLICY_VERSION,
          },
        },
      });
      if (error)
        return reply(
          error.status === 429 ? 429 : 400,
          "Registration could not be completed. Please try again later.",
        );
      // Auth create responses can echo input metadata. Never return user/session payloads here.
      if (signup.user?.id && signup.user.identities?.length) {
        try {
          await sendSignupAddress(signup.user.id);
        } catch {
          /* Signup succeeded; pending address email is retried after verification. */
        }
      }
      return reply(
        200,
        "If registration can proceed, check your email to verify your account. Your assigned US shipping address is included in the signup email and becomes available to copy from your dashboard after verification.",
      );
    }
    if (data.action === "reset") {
      const { error: resetError } = await client.auth.resetPasswordForEmail(
        data.email,
        {
          redirectTo: `${origin}/auth/callback?next=/app/security`,
        },
      );
      if (resetError)
        return reply(
          503,
          "Password reset is temporarily unavailable. Please try again later.",
        );
      return reply(
        200,
        "If the account is eligible, a password-reset email will arrive. Please check your inbox.",
      );
    }
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user)
      return reply(401, "Sign in or open a valid reset link first.");
    const { error: updateError } = await client.auth.updateUser({
      password: data.password,
    });
    if (updateError)
      return reply(
        400,
        "The password could not be changed. Try a new reset link.",
      );
    await client.auth.signOut({ scope: "global" });
    return reply(200, "Password updated. Sign in again.");
  } catch {
    return reply(
      503,
      "Account service is temporarily unavailable. Please try again.",
    );
  }
}
