import Link from "next/link";
import type { ReactNode } from "react";

export function Arrow() {
  return <span aria-hidden="true">↗</span>;
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
      <Arrow />
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
          <Eyebrow>Your next step</Eyebrow>
          <h2>
            A clearer journey
            <br />
            starts here.
          </h2>
          <p>Explore how your Parcels JA account will work.</p>
        </div>
        <div>
          <ButtonLink href="/register">Explore registration</ButtonLink>
          <p className="m-small">
            Registration preview. Address activation is not yet available.
          </p>
        </div>
      </div>
    </section>
  );
}
