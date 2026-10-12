"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="wrap section">
      <h1>Something went wrong</h1>
      <p>Please try again. If the problem continues, return to the homepage.</p>
      <div className="buttons">
        <button type="button" className="btn" onClick={reset}>
          Try again
        </button>
        <Link href="/">Return home</Link>
      </div>
    </main>
  );
}
