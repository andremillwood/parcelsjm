"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function SignOut() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  return (
    <>
      <button
        className="w-button w-button-secondary"
        onClick={async () => {
          try {
            const r = await fetch("/api/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "logout" }),
            });
            if (r.ok) {
              router.push("/login");
              router.refresh();
            } else setMessage("Sign-out could not be confirmed. Please retry.");
          } catch {
            setMessage("Connection unavailable. Please retry.");
          }
        }}
      >
        Sign out
      </button>
      {message && <p role="alert">{message}</p>}
    </>
  );
}
