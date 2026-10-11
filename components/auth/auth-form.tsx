"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
export function AuthForm({
  mode,
  available,
  initialType = "personal",
}: {
  mode: "login" | "register" | "reset" | "password";
  available: boolean;
  initialType?: "personal" | "business";
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [failed, setFailed] = useState(false);
  const router = useRouter();
  return (
    <div className="m-form-panel">
      {!available && (
        <div className="m-notice">
          Live account access is not activated. You can explore the labelled
          customer workspace preview below.
        </div>
      )}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!available || busy) return;
          const data = new FormData(event.currentTarget);
          setBusy(true);
          setMessage("");
          try {
            const response = await fetch("/api/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: mode,
                ...(mode !== "password" ? { email: data.get("email") } : {}),
                ...(mode !== "reset" ? { password: data.get("password") } : {}),
                ...(mode === "register"
                  ? {
                      fullName: data.get("fullName"),
                      phone: data.get("phone"),
                      accountType: data.get("accountType"),
                      consent: data.get("consent") === "on",
                    }
                  : {}),
              }),
            });
            const result = await response.json();
            setFailed(!response.ok);
            setMessage(result.message);
            if (response.ok && mode === "login") {
              router.push("/app");
              router.refresh();
            }
          } catch {
            setFailed(true);
            setMessage("Connection unavailable. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={!available || busy}>
          <legend className="sr-only">Account details</legend>
          {mode === "register" && (
            <>
              <label className="m-field">
                Full name
                <input
                  name="fullName"
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                />
              </label>
              <label className="m-field">
                Phone
                <input
                  name="phone"
                  type="tel"
                  required
                  minLength={7}
                  maxLength={30}
                  autoComplete="tel"
                />
              </label>
              <label className="m-field">
                Account type
                <select name="accountType" defaultValue={initialType}>
                  <option value="personal">Personal</option>
                  <option value="business">Business / reseller</option>
                </select>
              </label>
            </>
          )}
          {mode !== "password" && (
            <label className="m-field">
              Email
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
              />
            </label>
          )}
          {mode !== "reset" && (
            <label className="m-field">
              {mode === "password" ? "New password" : "Password"}
              <input
                name="password"
                type="password"
                required
                minLength={mode === "login" ? 1 : 12}
                maxLength={128}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
              {mode !== "login" && <small>Use at least 12 characters.</small>}
            </label>
          )}
          {mode === "register" && (
            <label className="m-checkbox">
              <input type="checkbox" name="consent" required />
              <span>
                I accept the <Link href="/legal/terms">terms</Link> and
                acknowledge the{" "}
                <Link href="/legal/privacy">privacy policy</Link>. This does not
                subscribe me to marketing.
              </span>
            </label>
          )}
          <button className="m-button" type="submit">
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : mode === "register"
                  ? "Create account"
                  : mode === "reset"
                    ? "Send reset link"
                    : "Update password"}
          </button>
        </fieldset>
        {message && (
          <p
            className={failed ? "m-error" : "m-success"}
            role={failed ? "alert" : "status"}
          >
            {message}
          </p>
        )}
      </form>
      {mode === "login" && (
        <p>
          <Link className="m-text-link" href="/forgot-password">
            Forgot your password?
          </Link>
        </p>
      )}
      <p>
        <Link className="m-text-link" href="/preview/app">
          Explore the customer workspace preview ↗
        </Link>
      </p>
    </div>
  );
}
