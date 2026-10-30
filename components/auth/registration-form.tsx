"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import {
  registrationSchema,
  registrationErrors,
  registrationFields,
  type RegistrationErrors,
  type RegistrationField,
} from "../../lib/auth/schema";
import { Arrow, Notice } from "../marketing/ui";
import type { ReactNode } from "react";
function Field({
  name,
  label,
  hint,
  error,
  children,
}: {
  name: RegistrationField;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="m-field">
      <label className="m-field-label" htmlFor={`signup-${name}`}>
        {label}
      </label>
      {children}
      {hint && <small id={`signup-${name}-hint`}>{hint}</small>}
      {error && (
        <p className="m-field-error" id={`signup-${name}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
export function RegistrationForm({
  mode,
  initialType = "personal",
}: {
  mode: "preview" | "live" | "unavailable";
  initialType?: "personal" | "business";
}) {
  const unavailable = mode === "unavailable";
  const [fulfillmentMethod, setFulfillmentMethod] = useState("pickup");
  const preview = mode === "preview";
  const [type, setType] = useState(initialType);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const success = useRef<HTMLDivElement>(null);
  const props = (name: RegistrationField, hint = false) => ({
    id: `signup-${name}`,
    name,
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby":
      [hint && `signup-${name}-hint`, errors[name] && `signup-${name}-error`]
        .filter(Boolean)
        .join(" ") || undefined,
  });
  function showErrors(next: RegistrationErrors) {
    setErrors(next);
    setMessage("Check the highlighted fields.");
    const name = registrationFields.find((key) => next[key]);
    if (name)
      requestAnimationFrame(() =>
        document.getElementById(`signup-${name}`)?.focus(),
      );
  }
  return (
    <div className="m-form-panel m-signup-panel">
      {unavailable && (
        <Notice>
          Registration is temporarily unavailable. Please check back soon.
        </Notice>
      )}
      {preview && (
        <Notice>
          <strong>Registration preview.</strong> No account is created and no
          information is sent or saved. Use sample details and a sample password
          only.
        </Notice>
      )}
      <form
        noValidate
        autoComplete={preview ? "off" : "on"}
        aria-busy={busy}
        onChange={() => {
          if (complete) setComplete(false);
        }}
        onSubmit={async (event) => {
          event.preventDefault();
          if (inFlight.current || unavailable) return;
          const form = event.currentTarget,
            data = new FormData(form);
          setComplete(false);
          setMessage("");
          const result = registrationSchema.safeParse({
            action: "register",
            fullName: data.get("fullName"),
            email: data.get("email"),
            phone: data.get("phone"),
            trn: data.get("trn"),
            homeAddress: data.get("homeAddress"),
            password: data.get("password"),
            fulfillmentMethod: data.get("fulfillmentMethod"),
            ...(fulfillmentMethod === "delivery"
              ? { deliveryAddress: data.get("deliveryAddress") }
              : {}),
            accountType: type,
            consent: data.get("consent") === "on",
          });
          const next: RegistrationErrors = result.success
            ? {}
            : registrationErrors(result.error.issues);
          if (
            data.get("confirmPassword") !== data.get("password") ||
            !data.get("confirmPassword")
          )
            next.confirmPassword = "Enter the same password again.";
          if (Object.keys(next).length || !result.success) {
            showErrors(next);
            return;
          }
          setErrors({});
          if (preview) {
            form.reset();
            setComplete(true);
            requestAnimationFrame(() => success.current?.focus());
            return;
          }
          inFlight.current = true;
          setBusy(true);
          try {
            const response = await fetch("/api/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(result.data),
            });
            const body = await response.json();
            if (!response.ok) {
              if (body.fieldErrors && typeof body.fieldErrors === "object") {
                const safe: RegistrationErrors = {};
                for (const key of registrationFields)
                  if (typeof body.fieldErrors[key] === "string")
                    safe[key] = body.fieldErrors[key];
                if (Object.keys(safe).length) {
                  showErrors(safe);
                  return;
                }
              }
              setMessage(
                typeof body.message === "string"
                  ? body.message
                  : "Registration could not be completed. Please retry.",
              );
              return;
            }
            form.reset();
            setMessage(
              "If registration can proceed, check your email to verify your account. Your shipping address is not active yet.",
            );
            setComplete(true);
            requestAnimationFrame(() => success.current?.focus());
          } catch {
            setMessage(
              "Connection unavailable. Your account has not been confirmed. Please retry.",
            );
          } finally {
            inFlight.current = false;
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy || unavailable} className="m-signup-fields">
          <legend className="sr-only">Your registration details</legend>
          <fieldset className="m-options">
            <legend>How will you use Parcels JA?</legend>
            {(["personal", "business"] as const).map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="accountType"
                  value={value}
                  checked={type === value}
                  onChange={() => setType(value)}
                />
                <span>
                  {value === "personal" ? "Personal" : "Business / reseller"}
                  <small>
                    {value === "personal"
                      ? "For your own purchases"
                      : "For regular business imports"}
                  </small>
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset className="m-signup-group">
            <legend>Contact details</legend>
            <Field name="fullName" label="Full name" error={errors.fullName}>
              <input
                {...props("fullName")}
                required
                minLength={2}
                maxLength={120}
                autoComplete={preview ? "off" : "name"}
              />
            </Field>
            <div className="m-form-grid">
              <Field name="email" label="Email" error={errors.email}>
                <input
                  {...props("email")}
                  type="email"
                  required
                  maxLength={254}
                  autoComplete={preview ? "off" : "email"}
                />
              </Field>
              <Field name="phone" label="Phone" error={errors.phone}>
                <input
                  {...props("phone")}
                  type="tel"
                  required
                  minLength={7}
                  maxLength={30}
                  autoComplete={preview ? "off" : "tel"}
                />
              </Field>
            </div>
          </fieldset>
          <fieldset className="m-signup-group">
            <legend>Identity and home address</legend>
            <Field
              name="trn"
              label="TRN (Taxpayer Registration Number)"
              hint="Enter 9 digits. Spaces or hyphens are accepted. Format checking does not verify TRN ownership."
              error={errors.trn}
            >
              <input
                {...props("trn", true)}
                required
                inputMode="numeric"
                pattern="[0-9]{3}[ -]?[0-9]{3}[ -]?[0-9]{3}"
                maxLength={11}
                autoComplete="off"
              />
            </Field>
            <Field
              name="homeAddress"
              label="Home address"
              hint="Include your street or district, town or city, parish and country. This is your residential address, not your US shipping address."
              error={errors.homeAddress}
            >
              <textarea
                {...props("homeAddress", true)}
                required
                minLength={10}
                maxLength={500}
                rows={3}
                autoComplete={preview ? "off" : "street-address"}
              />
            </Field>
          </fieldset>
          <fieldset className="m-signup-group">
            <legend>Account security</legend>
            <Field
              name="password"
              label={preview ? "Sample password" : "Password"}
              hint="Use at least 12 characters."
              error={errors.password}
            >
              <input
                {...props("password", true)}
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete={preview ? "off" : "new-password"}
              />
            </Field>
            <Field
              name="confirmPassword"
              label={preview ? "Confirm sample password" : "Confirm password"}
              error={errors.confirmPassword}
            >
              <input
                {...props("confirmPassword")}
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete={preview ? "off" : "new-password"}
              />
            </Field>
          </fieldset>
          <fieldset className="m-signup-group">
            <legend>Delivery or pickup</legend>
            <Field
              name="fulfillmentMethod"
              label="How would you like to receive your packages?"
              error={errors.fulfillmentMethod}
            >
              <select
                {...props("fulfillmentMethod")}
                value={fulfillmentMethod}
                onChange={(e) => setFulfillmentMethod(e.target.value)}
              >
                <option value="pickup">Pick up at a collection location</option>
                <option value="delivery">Deliver to my chosen address</option>
              </select>
            </Field>
            {fulfillmentMethod === "delivery" ? (
              <Field
                name="deliveryAddress"
                label="Delivery address"
                error={errors.deliveryAddress}
              >
                <textarea
                  {...props("deliveryAddress")}
                  required
                  minLength={10}
                  maxLength={500}
                  rows={3}
                  autoComplete="shipping street-address"
                />
              </Field>
            ) : (
              <p className="m-small">
                Our pickup location is being established. Your pickup ticket
                will confirm where and when your package is available. Choose a
                convenient location in your account once locations are listed.
              </p>
            )}
          </fieldset>
          <label className="m-checkbox">
            <input {...props("consent")} type="checkbox" required />
            <span>
              {preview ? (
                "I understand this is a preview and no account will be created."
              ) : (
                <>
                  I accept the <Link href="/legal/terms">terms</Link> and
                  acknowledge the{" "}
                  <Link href="/legal/privacy">privacy policy</Link> and{" "}
                  <Link href="/legal/shipping-policy">shipping policy</Link>.
                  This does not subscribe me to marketing.
                </>
              )}
            </span>
          </label>
          {errors.consent && (
            <p className="m-field-error" id="signup-consent-error">
              {errors.consent}
            </p>
          )}
          {!preview && (
            <p className="m-small">
              Email verification comes first. Your US shipping address is
              included in the confirmation email and can be copied from your
              dashboard after verification.
            </p>
          )}
          <button className="m-button" type="submit">
            {busy
              ? "Creating account…"
              : preview
                ? "Preview registration"
                : "Create account"}
            <Arrow />
          </button>
        </fieldset>
        {message && !complete && (
          <p className="m-error" role="alert">
            {message}
          </p>
        )}
        {complete && (
          <div
            ref={success}
            tabIndex={-1}
            className="m-success m-signup-result"
            role="status"
          >
            <h2>{preview ? "Preview complete" : "Check your email"}</h2>
            <p>
              {preview
                ? `Preview complete for a ${type} account. No account was created. No email was sent.`
                : message}
            </p>
            <p>
              <strong>Address activation pending.</strong>{" "}
              {preview
                ? "In the live journey, you’ll verify your email before completing onboarding. A shipping address is assigned separately after approval."
                : "Verify your email, then sign in to copy your assigned US shipping address and add your first pre-alert."}
            </p>
            <Link
              className="m-text-link"
              href={preview ? "/preview/app" : "/login"}
            >
              {preview
                ? "Explore the fictional customer demo"
                : "Go to sign in"}
              <Arrow />
            </Link>
          </div>
        )}
      </form>
    </div>
  );
}
