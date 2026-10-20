"use client";
import { WorkspaceIcon } from "./icons";
("use client");
import { SHIPMENT_STATES } from "../../lib/billing/pricing";
import { useState } from "react";
import Link from "next/link";
import { label, type PackageRecord } from "../../lib/workspace/model";
import { Pill, Empty } from "./ui";
export function PackageList({
  packages,
  root,
  serverPagination,
}: {
  packages: PackageRecord[];
  root: string;
  serverPagination?: import("../../lib/workspace/pagination").Pagination;
}) {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all");
  const filtered = packages.filter(
    (p) =>
      (status === "all" ||
        (status === "action"
          ? p.document_state === "requested"
          : p.status === status)) &&
      `${p.carrier_tracking} ${p.merchant} ${p.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section className="w-panel">
      {serverPagination ? (
        <form method="get" className="w-toolbar">
          <label>
            Search packages
            <input
              name="q"
              type="search"
              defaultValue={String(serverPagination.params.q ?? "")}
              maxLength={120}
            />
          </label>
          <label>
            Filter packages
            <select
              name="status"
              defaultValue={String(serverPagination.params.status ?? "all")}
            >
              <option value="all">All packages</option>
              <option value="action">Action needed</option>
              {SHIPMENT_STATES.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </label>
          <button className="w-button">Search all records</button>
        </form>
      ) : (
        <div className="w-toolbar">
          <label>
            <span className="sr-only">Search packages</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tracking, store or item…"
            />
          </label>
          <label>
            <span className="sr-only">Filter packages</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All packages</option>
              <option value="action">Action needed</option>
              <option value="pre_alerted">Pre-alerted</option>
              <option value="in_transit">In transit</option>
            </select>
          </label>
        </div>
      )}
      {filtered.length ? (
        <div className="w-package-list">
          {filtered.map((p) => (
            <Link
              className="w-package-row"
              key={p.id}
              href={`${root}/packages/${p.id}`}
            >
              <span className="w-package-icon">
                <WorkspaceIcon name="package" />
              </span>
              <div className="w-package-description">
                <strong>{p.merchant}</strong>
                <span>{p.description}</span>
                <code>{p.carrier_tracking}</code>
              </div>
              <div className="w-package-state">
                <Pill value={p.status} />
                <small>
                  {p.document_state === "requested"
                    ? "Document needed"
                    : p.document_state === "under_review"
                      ? "Documents under review"
                      : "View package details"}
                </small>
              </div>
              <WorkspaceIcon name="arrow" />
            </Link>
          ))}
        </div>
      ) : (
        <Empty title="No packages to show">
          {search || status !== "all"
            ? "Try a different search or filter."
            : "Your pre-alerts and verified package updates will appear here."}
        </Empty>
      )}
    </section>
  );
}
