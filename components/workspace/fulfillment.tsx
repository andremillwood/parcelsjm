"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkspaceData } from "../../lib/workspace/model";
export function PackageFulfillment({
  data,
  packageId,
  admin = false,
}: {
  data: WorkspaceData;
  packageId: string;
  admin?: boolean;
}) {
  const ticket = data.tickets?.find((t) => t.package_id === packageId);
  const selected =
    data.fulfillment?.find((f) => f.package_id === packageId) ??
    (admin
      ? data.customerPreferences?.find(
          (f) =>
            f.profile_id ===
            data.packages.find((p) => p.id === packageId)?.profile_id,
        )
      : data.preference);
  const [method, setMethod] = useState<string>(selected?.method ?? "pickup");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  if (ticket)
    return (
      <section className="w-panel w-pad">
        <h2>Your pickup ticket</h2>
        <p>Ticket reference: {ticket.id}</p>
        <dl className="w-dl">
          <div>
            <dt>Available from (Jamaica time)</dt>
            <dd>
              {new Date(ticket.available_at).toLocaleString("en-JM", {
                timeZone: "America/Jamaica",
              })}
            </dd>
          </div>
          <div>
            <dt>Pickup location</dt>
            <dd>
              {ticket.location_name}, {ticket.address}
            </dd>
          </div>
          <div>
            <dt>Opening hours</dt>
            <dd>{ticket.hours}</dd>
          </div>
        </dl>
        <p>{ticket.instructions}</p>
        <p>
          Bring this ticket and identification. The availability time is not a
          collection deadline.
        </p>
        {admin && (
          <p>
            Email:{" "}
            {ticket.email_state === "accepted"
              ? "Accepted by email service"
              : ticket.email_state === "review"
                ? "Staff review required"
                : "Pending — use the email retry form below"}
          </p>
        )}
      </section>
    );
  if (admin)
    return (
      <section className="w-panel w-pad">
        <h2>Customer delivery choice</h2>
        <p>
          {selected
            ? selected.method === "delivery"
              ? `Delivery: ${selected.address}`
              : `Pickup: ${data.locations?.find((l) => l.id === selected.location_id)?.name ?? "Location to be confirmed with customer"}`
            : "Customer has not chosen delivery or pickup yet."}
        </p>
      </section>
    );
  const locations = data.locations?.filter((l) => l.active) ?? [];
  return (
    <form
      className="w-form w-panel w-pad"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        const values = Object.fromEntries(new FormData(e.currentTarget));
        try {
          const r = await fetch("/api/workspace/fulfillment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...values, packageId }),
          });
          const result = await r.json();
          setMessage(result.message);
          if (r.ok) router.refresh();
        } catch {
          setMessage("Your choice could not be saved. Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>How would you like this package?</h2>
      <fieldset disabled={busy}>
        <legend className="sr-only">Delivery or pickup</legend>
        <label>
          Receive by
          <select
            name="method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="pickup">Pick up at a collection location</option>
            <option value="delivery">Deliver to my chosen address</option>
          </select>
        </label>
        {method === "delivery" ? (
          <label>
            Delivery address
            <textarea
              name="address"
              required
              minLength={10}
              maxLength={500}
              rows={3}
              defaultValue={selected?.address}
              autoComplete="shipping street-address"
            />
          </label>
        ) : (
          <>
            <p>
              Choose the most convenient location for your address. Your ticket
              will confirm the final collection arrangements.
            </p>
            {locations.length ? (
              <label>
                Pickup location
                <select
                  name="locationId"
                  defaultValue={selected?.location_id ?? ""}
                >
                  <option value="">Confirm a location with me</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} · {l.parish} · {l.address} · {l.hours}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p>
                Our pickup location is being established. We will confirm where
                and when your package is available before you travel.
              </p>
            )}
          </>
        )}
        <p>
          Delivery coverage and any charges will be confirmed before dispatch.
        </p>
        <button className="w-button" type="submit">
          {busy ? "Saving…" : "Save delivery choice"}
        </button>
      </fieldset>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
