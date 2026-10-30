"use client";
import { useState } from "react";
import Link from "next/link";
import { Notice } from "./ui";
export function LeadForm({
  kind = "contact",
  available,
}: {
  kind?: "contact" | "business" | "rates";
  available: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [requestId, setRequestId] = useState<string>();
  if (!available)
    return (
      <div className="m-form-panel" id="inquiry">
        <h2>
          {kind === "business"
            ? "Discuss your business shipping"
            : kind === "rates"
              ? "Ask about your shipment"
              : "Talk to Parcels JA"}
        </h2>
        <p>
          Email our team with your question. Include a tracking reference if you
          have one; keep TRNs and identity documents out of email.
        </p>
        <a className="m-button" href="mailto:support@parcelsjm.com">
          Email Parcels JA
        </a>
        <p className="m-small">
          Existing customers can manage shipment enquiries in the support
          section of their account.
        </p>
      </div>
    );
  return (
    <div className="m-form-panel" id="inquiry">
      <h2>
        {kind === "business"
          ? "Tell us about your business"
          : kind === "rates"
            ? "Ask about rates"
            : "Start a conversation"}
      </h2>
      {!available && (
        <Notice>
          <strong>Inquiries are temporarily unavailable.</strong> Please try
          again later. Existing customers can send a support request from their
          account.
        </Notice>
      )}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!available || status === "sending") return;
          const form = event.currentTarget;
          const data = new FormData(form);
          const id = requestId ?? crypto.randomUUID();
          setRequestId(id);
          setStatus("sending");
          setMessage("");
          try {
            const response = await fetch("/api/contact", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                kind,
                name: data.get("name"),
                email: data.get("email"),
                phone: data.get("phone"),
                message: data.get("message"),
                ...(kind === "business"
                  ? {
                      monthlyVolume: Number(data.get("monthlyVolume")),
                      category: data.get("category"),
                    }
                  : {}),
                consent: data.get("consent") === "on",
                website: data.get("website"),
                requestId: id,
              }),
            });
            const result = await response.json();
            if (!response.ok)
              throw new Error(
                result.error ||
                  "Your inquiry could not be confirmed. Please try again.",
              );
            setStatus("sent");
            setMessage(
              "Your inquiry has been received and queued for the Parcels JA team. This is not a booking, quote or account registration.",
            );
            form.reset();
            setRequestId(undefined);
          } catch (error) {
            setStatus("error");
            setMessage(
              error instanceof Error
                ? error.message
                : "Your inquiry could not be confirmed. Please try again.",
            );
          }
        }}
      >
        <fieldset disabled={!available || status === "sending"}>
          <legend className="sr-only">Inquiry details</legend>
          <label className="m-field">
            <span>Name</span>
            <input
              name="name"
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
            />
          </label>
          <div className="m-form-grid">
            <label className="m-field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
              />
            </label>
            <label className="m-field">
              <span>Phone (optional)</span>
              <input
                name="phone"
                type="tel"
                maxLength={30}
                autoComplete="tel"
              />
            </label>
          </div>
          {kind === "business" && (
            <div className="m-form-grid">
              <label className="m-field">
                <span>Estimated packages per month</span>
                <input
                  name="monthlyVolume"
                  type="number"
                  min={1}
                  max={100000}
                  step={1}
                  required
                />
              </label>
              <label className="m-field">
                <span>Product category</span>
                <input
                  name="category"
                  required
                  maxLength={120}
                  placeholder="For example, clothing"
                />
              </label>
            </div>
          )}
          <label className="m-field">
            <span>
              {kind === "business" ? "Your shipping needs" : "How can we help?"}
            </span>
            <textarea
              name="message"
              minLength={10}
              maxLength={2000}
              required
              aria-describedby="inquiry-privacy"
            />
            <small id="inquiry-privacy">
              Do not include passwords, payment details, invoices or identity
              documents.
            </small>
          </label>
          <label className="m-honeypot" aria-hidden="true">
            Leave this empty
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <label className="m-checkbox">
            <input name="consent" type="checkbox" required />
            <span>
              I agree that Parcels JA may use these details to respond to this
              inquiry, as explained in the{" "}
              <Link href="/legal/privacy">privacy information</Link>. This does
              not subscribe me to marketing.
            </span>
          </label>
          <button className="m-button" type="submit">
            {status === "sending"
              ? "Sending…"
              : available
                ? "Send inquiry"
                : "Sending unavailable"}
            <span aria-hidden="true">↗</span>
          </button>
        </fieldset>
        {message && (
          <p
            className={status === "sent" ? "m-success" : "m-error"}
            role={status === "sent" ? "status" : "alert"}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
