import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="wrap section">
      <h1>Page not found</h1>
      <p>This page could not be found.</p>
      <Link className="btn" href="/">
        Return to the website
      </Link>
    </main>
  );
}
