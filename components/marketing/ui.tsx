import Link from "next/link";
import type { ReactNode } from "react";

export function Arrow() {
  return (
    <svg
      className="m-arrow"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 16 16 4M5 4h11v11" />
    </svg>
  );
}
export function ButtonLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      className={`m-button${secondary ? " m-button-secondary" : ""}`}
      href={href}
    >
      {children}
      {!secondary && <Arrow />}
    </Link>
  );
}
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="m-eyebrow">{children}</p>;
}
export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="m-page-intro">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1>{title}</h1>
      <div className="m-lead">{children}</div>
    </div>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="m-notice">
      <span aria-hidden="true">i</span>
      <div>{children}</div>
    </div>
  );
}
export function CTA() {
  return (
    <section className="m-cta">
      <div className="m-container m-split">
        <div>
          <h2>
            Get to know your
            <br />
            Parcels JA account.
          </h2>
          <p>Keep your packages, documents and delivery choices together.</p>
        </div>
        <div>
          <ButtonLink href="/register">Create account</ButtonLink>
          <p className="m-small">
            Verify your email, then follow the steps in your account.
          </p>
        </div>
      </div>
    </section>
  );
}
