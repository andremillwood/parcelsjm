"use client";
import { useState } from "react";
export function ShippingAddress({ address }: { address: string }) {
  const [message, setMessage] = useState("");
  return (
    <div className="w-shipping-address">
      <address
        style={{
          whiteSpace: "pre-line",
          fontStyle: "normal",
          overflowWrap: "anywhere",
        }}
      >
        {address}
      </address>
      <p>
        Use every line, including your PARJA number in both the name and unit.
      </p>
      <button
        className="w-button"
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(address);
            setMessage("Shipping address copied.");
          } catch {
            setMessage(
              "Copy was unavailable. Select the address above and copy it manually.",
            );
          }
        }}
      >
        Copy shipping address
      </button>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
