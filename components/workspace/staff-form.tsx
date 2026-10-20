"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
type Field = {
  name: string;
  label: string;
  value?: string;
  options?: { value: string; label: string }[];
  type?: string;
  optional?: boolean;
};
export function StaffForm({
  action,
  fields,
  demo = false,
  title,
}: {
  action: string;
  fields: Field[];
  demo?: boolean;
  title: string;
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const router = useRouter();
  return (
    <form
      className="w-form w-panel w-pad"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setError(false);
        if (demo) {
          setMessage("Preview checked. No operational record changed.");
          return;
        }
        setBusy(true);
        try {
          const d = Object.fromEntries(new FormData(e.currentTarget));
          if (action === "event" || action === "correction")
            d.occurred = new Date(String(d.occurred)).toISOString();
          if ((action === "queue" || action === "billing-draft") && d.due)
            d.due = new Date(String(d.due) + "-05:00").toISOString();
          if (action === "billing-rate")
            d.effective = new Date(
              String(d.effective) + "-05:00",
            ).toISOString();
          const endpoint = action.startsWith("billing-")
            ? `/api/billing/${action.slice(8)}`
            : action.startsWith("shipment-")
              ? `/api/shipments/${action.slice(9)}`
              : `/api/workspace/${action}`;
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(d),
          });
          const result = await response.json();
          setMessage(result.message);
          setError(!response.ok);
          if (response.ok) router.refresh();
        } catch {
          setError(true);
          setMessage("The change could not be confirmed. Please retry.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>{title}</h2>
      <fieldset disabled={busy}>
        <legend className="sr-only">{title}</legend>
        {fields.map((f) =>
          f.type === "hidden" ? (
            <input key={f.name} type="hidden" name={f.name} value={f.value} />
          ) : (
            <label key={f.name}>
              {f.label}
              {f.options ? (
                <select
                  required={!f.optional}
                  name={f.name}
                  defaultValue={f.value}
                >
                  <option value="">Select…</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  required={!f.optional}
                  name={f.name}
                  type={f.type ?? "text"}
                  defaultValue={f.value}
                  maxLength={
                    f.name === "reason" || f.name === "reply" ? 2000 : 500
                  }
                  minLength={
                    ["reason", "reply", "source"].includes(f.name) ? 5 : 1
                  }
                />
              )}
            </label>
          ),
        )}
        <button className="w-button" disabled={busy} type="submit">
          {busy ? "Saving…" : demo ? "Check preview" : "Save verified change"}
        </button>
      </fieldset>
      {message && (
        <p
          className={error ? "w-error" : "w-form-feedback"}
          role={error ? "alert" : "status"}
        >
          {message}
        </p>
      )}
    </form>
  );
}
