import { WorkspaceIcon } from "./icons";
import Link from "next/link";
import { label } from "../../lib/workspace/model";
export function Pill({ value }: { value: string }) {
  return (
    <span
      className={`w-pill ${["requested", "rejected", "exception", "customs_hold", "disputed", "unpaid"].includes(value) ? "w-pill-attention" : ["approved", "delivered", "active", "paid", "cleared"].includes(value) ? "w-pill-good" : ""}`}
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
      <WorkspaceIcon name="arrow" />
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
      <WorkspaceIcon name="package" className="w-empty-icon" />
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Notice({ children }: { children: React.ReactNode }) {
  return <div className="w-notice">{children}</div>;
}

export function SummaryStrip({
  items,
  note,
}: {
  items: { label: string; value: number; href: string }[];
  note: string;
}) {
  return (
    <section className="w-summary" aria-label="Recent activity">
      <div className="w-summary-items">
        {items.map((item, i) => (
          <Link
            key={item.label}
            href={item.href}
            className={`w-summary-item${i === 0 ? " w-summary-primary" : ""}`}
          >
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <WorkspaceIcon name="arrow" />
          </Link>
        ))}
      </div>
      <p>{note}</p>
    </section>
  );
}
