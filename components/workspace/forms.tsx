"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
export function WorkspaceForm({
  kind,
  demo,
  name = "",
}: {
  kind: "pre-alert" | "document" | "support" | "profile";
  demo: boolean;
  packageId?: string;
  name?: string;
}) {
  const router = useRouter();
  const requestId = useRef<string | null>(null);
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  return (
    <form
      className="w-panel w-pad w-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setError(false);
        if (demo) {
          setMessage(
            kind === "document"
              ? "Preview checked. Your file has not been uploaded or saved."
              : "Preview complete. No record was saved and no notification was sent.",
          );
          return;
        }
        setBusy(true);
        try {
          const data = Object.fromEntries(new FormData(event.currentTarget));
          requestId.current ??= crypto.randomUUID();
          data.requestId = requestId.current;
          const path = `/api/workspace/${kind}`;
          const response = await fetch(path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const result = await response.json();
          setError(!response.ok);
          setMessage(result.message ?? "Please retry.");
          if (response.ok) {
            requestId.current = null;
            router.refresh();
          }
        } catch {
          setError(true);
          setMessage("The request could not be confirmed. Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy || (!demo && kind === "document")}>
        <legend className="sr-only">{kind} details</legend>
        {kind === "pre-alert" && (
          <>
            <div className="w-form-step">
              <span>01</span>
              <div>
                <h2>Order & tracking</h2>
                <p>Use the store’s original tracking reference.</p>
              </div>
            </div>
            <div className="w-form-grid">
              <label>
                Carrier tracking / reference
                <input name="tracking" required maxLength={120} />
              </label>
              <label>
                Store / merchant
                <input name="merchant" required maxLength={160} />
              </label>
            </div>
            <label>
              Carrier (if known)
              <input name="carrier" maxLength={80} />
            </label>
            <div className="w-form-step">
              <span>02</span>
              <div>
                <h2>What’s inside?</h2>
                <p>
                  Describe the items clearly. Declared value is not a shipping
                  quote.
                </p>
              </div>
            </div>
            <label>
              Item description
              <textarea
                name="description"
                required
                minLength={5}
                maxLength={1000}
              />
            </label>
            <div className="w-form-grid">
              <label>
                Number of items
                <input
                  name="quantity"
                  type="number"
                  min={1}
                  max={1000}
                  required
                  defaultValue={1}
                />
              </label>
              <label>
                Declared value
                <input
                  name="value"
                  type="number"
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  required
                />
              </label>
              <label>
                Declared currency
                <select name="currency">
                  <option>USD</option>
                  <option>JMD</option>
                </select>
              </label>
            </div>
            <label>
              Notes (optional)
              <textarea name="notes" maxLength={2000} />
            </label>
            <label className="w-check">
              <input type="checkbox" name="acknowledged" required />I confirm
              these are the item details from my order. A pre-alert does not
              confirm shipment receipt.
            </label>
          </>
        )}
        {kind === "document" && (
          <>
            <label>
              Requested package document
              <input
                name="file"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                required
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.setCustomValidity(
                    f && f.size > 10 * 1024 * 1024
                      ? "Choose a file no larger than 10 MB."
                      : "",
                  );
                }}
              />
            </label>
            <p className="w-muted">
              PDF, JPEG or PNG · up to 10 MB. Live uploads remain unavailable
              until quarantine and scanning are verified.
            </p>
          </>
        )}
        {kind === "support" && (
          <>
            <h2>Start a support request</h2>
            <label>
              Subject
              <input name="subject" required minLength={5} maxLength={160} />
            </label>
            <label>
              Package reference (optional)
              <input name="packageReference" maxLength={120} />
            </label>
            <label>
              What do you need help with?
              <textarea name="body" required minLength={10} maxLength={2000} />
            </label>
            <p className="w-muted">
              Do not include passwords, payment details or identity documents.
            </p>
          </>
        )}
        {kind === "profile" && (
          <>
            <h2>Your contact details</h2>
            <label>
              Full name
              <input
                name="fullName"
                required
                minLength={2}
                maxLength={120}
                defaultValue={name}
              />
            </label>
            <label>
              Phone
              <input
                name="phone"
                type="tel"
                required
                minLength={7}
                maxLength={30}
              />
            </label>
            <label>
              Account type
              <select name="accountType">
                <option value="personal">Personal</option>
                <option value="business">Business / reseller</option>
              </select>
            </label>
          </>
        )}
        <button className="w-button" type="submit">
          {busy
            ? "Saving…"
            : demo
              ? "Check preview"
              : kind === "pre-alert"
                ? "Create pre-alert"
                : kind === "support"
                  ? "Submit request"
                  : kind === "document"
                    ? "Upload unavailable"
                    : "Save profile"}
          <span aria-hidden="true">↗</span>
        </button>
      </fieldset>
      {message && (
        <p
          className={error ? "w-error" : "w-success"}
          role={error ? "alert" : "status"}
        >
          {message}
        </p>
      )}
    </form>
  );
}
