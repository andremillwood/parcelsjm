import Link from "next/link";
import { label } from "../../lib/workspace/model";
export function Pill({ value }: { value: string }) {
  return (
    <span
      className={`w-pill ${["requested", "rejected", "exception", "customs_hold"].includes(value) ? "w-pill-attention" : ["approved", "delivered", "active"].includes(value) ? "w-pill-good" : ""}`}
    >
      {label(value)}
    </span>
  );
}
export function Heading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="w-heading">
      <div>
        <p className="w-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children && <p className="w-subtitle">{children}</p>}
      </div>
      {action}
    </div>
  );
}
export function Action({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`w-button ${secondary ? "w-button-secondary" : ""}`}
    >
      {children}
      <span aria-hidden="true">↗</span>
    </Link>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="w-empty">
      <span className="w-empty-icon" aria-hidden="true">
        □
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Notice({ children }: { children: React.ReactNode }) {
  return <div className="w-notice">{children}</div>;
}
