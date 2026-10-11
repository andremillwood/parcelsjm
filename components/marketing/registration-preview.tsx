"use client";
import { useState } from "react";
import Link from "next/link";
import { Notice } from "./ui";
export function RegistrationPreview({
  initialType,
}: {
  initialType: "personal" | "business";
}) {
  const [type, setType] = useState(initialType);
  const [complete, setComplete] = useState(false);
  return (
    <div className="m-form-panel">
      <Notice>
        This is a registration preview. No account is created and no information
        is sent or saved. Use sample details only.
      </Notice>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setComplete(true);
        }}
      >
        <fieldset className="m-options">
          <legend>How will you use Parcels JA?</legend>
          {(["personal", "business"] as const).map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="accountType"
                value={value}
                checked={type === value}
                onChange={() => {
                  setType(value);
                  setComplete(false);
                }}
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
        <label className="m-field">
          <span>Full name</span>
          <input
            required
            maxLength={120}
            autoComplete="off"
            placeholder="Sample name"
          />
        </label>
        <div className="m-form-grid">
          <label className="m-field">
            <span>Email</span>
            <input
              type="email"
              required
              maxLength={254}
              autoComplete="off"
              placeholder="you@example.com"
            />
          </label>
          <label className="m-field">
            <span>Phone</span>
            <input
              type="tel"
              required
              maxLength={30}
              autoComplete="off"
              placeholder="Your contact number"
            />
          </label>
        </div>
        <p className="m-small">
          You are previewing the form, not accepting shipping terms or signing
          up for marketing. Approved policies will be available before live
          registration.
        </p>
        <button className="m-button" type="submit">
          Preview registration <span aria-hidden="true">↗</span>
        </button>
        {complete && (
          <div role="status" className="m-success">
            Preview complete for a {type} account. No account was created.{" "}
            <strong>Address activation pending.</strong>{" "}
            <Link className="m-text-link" href="/dashboard">
              Explore the fictional customer demo ↗
            </Link>
          </div>
        )}
      </form>
    </div>
  );
}
