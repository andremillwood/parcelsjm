import { StaffForm } from "./staff-form";
import { CustomerWorkspace } from "./customer";
import { Heading, Action, Empty, Notice, Pill } from "./ui";
import { PackageList } from "./packages";
import type { WorkspaceData } from "../../lib/workspace/model";
export function OperationsWorkspace({
  data,
  path,
}: {
  data: WorkspaceData;
  path: string;
}) {
  const root = data.demo ? "/preview/admin" : "/admin";
  if (path.startsWith("packages/")) {
    const p = data.packages.find((p) => p.id === path.split("/")[1]);
    const next: Record<string, string> = {
      pre_alerted: "received_us",
      received_us: "processing_us",
      processing_us: "in_transit",
      in_transit: "arrived_jm",
    };
    return (
      <>
        <CustomerWorkspace path={path} data={data} rootOverride={root} />
        {p && next[p.status] && (
          <StaffForm
            demo={data.demo}
            action="event"
            title="Publish a verified shipment event"
            fields={[
              {
                name: "packageId",
                label: "Package",
                type: "hidden",
                value: p.id,
              },
              {
                name: "expected",
                label: "Current state",
                type: "hidden",
                value: p.status,
              },
              {
                name: "status",
                label: "Verified next state",
                options: [
                  {
                    value: next[p.status],
                    label: next[p.status].replaceAll("_", " "),
                  },
                ],
              },
              { name: "source", label: "Evidence / source reference" },
              {
                name: "occurred",
                label: "Event time (your local time)",
                type: "datetime-local",
              },
              { name: "reason", label: "Audit reason" },
            ]}
          />
        )}
      </>
    );
  }
  if (path === "packages")
    return (
      <>
        <Heading eyebrow="Shipment operations" title="Package workspace">
          Search records and review the evidence before updating a customer.
        </Heading>
        <PackageList packages={data.packages} root={root} />
      </>
    );
  if (path === "customers")
    return (
      <>
        <Heading eyebrow="Account operations" title="Customers">
          Verification, account status and approved shipping assignments.
        </Heading>
        <section className="w-panel w-pad">
          <h2>{data.demo ? "Sample customer" : "Customer directory"}</h2>
          {data.demo ? (
            <>
              <div className="w-customer-row">
                <div className="w-avatar">A</div>
                <div>
                  <strong>Alex · fictional customer</strong>
                  <p>Personal account · no real contact details</p>
                </div>
                <Pill value="pending_verification" />
              </div>
              <Notice>
                Shipping assignment requires an active customer, a verified
                warehouse, a unique identifier and an audit reason. No warehouse
                address is preconfigured.
              </Notice>
            </>
          ) : (
            <>
              {data.customers?.length ? (
                data.customers.map((c) => (
                  <section key={c.id} className="w-panel w-pad">
                    <h3>{c.full_name || "Pending profile"}</h3>
                    <Pill value={c.account_status} />
                    <p className="w-muted">Account reference: {c.id}</p>
                    {c.account_status === "active" &&
                      !!data.warehouses?.length && (
                        <StaffForm
                          action="assignment"
                          title="Assign verified shipping address"
                          fields={[
                            {
                              name: "profileId",
                              label: "Customer",
                              type: "hidden",
                              value: c.id,
                            },
                            {
                              name: "warehouseId",
                              label: "Verified warehouse",
                              options: data.warehouses.map((w) => ({
                                value: w.id,
                                label: w.name,
                              })),
                            },
                            { name: "code", label: "Unique customer code" },
                            { name: "prefix", label: "Assigned prefix" },
                            { name: "unit", label: "Assigned unit" },
                            { name: "reason", label: "Audit reason" },
                          ]}
                        />
                      )}
                  </section>
                ))
              ) : (
                <Empty title="No customer records available">
                  Records visible to your staff role appear here after
                  registration.
                </Empty>
              )}
              <Notice>
                No address is displayed until a verified warehouse is assigned.
              </Notice>
            </>
          )}
        </section>
      </>
    );
  if (path === "intake")
    return (
      <>
        <Heading eyebrow="Receiving & reconciliation" title="Unmatched intake">
          Keep unassigned observations private until the customer match is
          confirmed.
        </Heading>
        <StaffForm
          demo={data.demo}
          action="intake"
          title="Record a verified observation"
          fields={[
            { name: "tracking", label: "Full carrier tracking reference" },
            { name: "source", label: "Evidence / source reference" },
            { name: "reason", label: "Audit reason" },
          ]}
        />
        {data.intake?.map((o) => (
          <section key={o.id} className="w-panel w-pad">
            <h2>{o.tracking}</h2>
            <p>{o.source_reference}</p>
            {o.package_id ? (
              <Pill value="matched" />
            ) : (
              <StaffForm
                demo={data.demo}
                action="match"
                title="Confirm customer match"
                fields={[
                  {
                    name: "id",
                    label: "Observation",
                    type: "hidden",
                    value: o.id,
                  },
                  { name: "packageId", label: "Exact package record UUID" },
                  { name: "reason", label: "Evidence confirming ownership" },
                ]}
              />
            )}
          </section>
        ))}
        <Notice>
          Never match a package from a partial name alone. Customer pre-alerts
          are not proof of warehouse receipt.
        </Notice>
      </>
    );
  if (path === "documents")
    return (
      <>
        <Heading eyebrow="Review queue" title="Documents to review">
          A review decision needs a reason and an immutable record.
        </Heading>
        <PackageList
          packages={data.packages.filter(
            (p) => p.document_state === "under_review",
          )}
          root={root}
        />
        <Notice>
          File access remains quarantined until the scanning policy is
          implemented and approved. A document approval is not customs
          clearance.
        </Notice>
      </>
    );
  if (path === "support")
    return (
      <>
        <Heading eyebrow="Customer care" title="Support queue">
          Keep each request connected to its customer and package.
        </Heading>
        {data.support?.length ? (
          data.support.map((t) => (
            <section key={t.id} className="w-panel w-pad">
              <h2>{t.subject}</h2>
              <Pill value={t.status} />
              <p>{t.body}</p>
              {t.reply && <p>{t.reply}</p>}
              {t.status === "open" && (
                <StaffForm
                  demo={data.demo}
                  action="resolve"
                  title="Respond and resolve"
                  fields={[
                    {
                      name: "id",
                      label: "Request",
                      type: "hidden",
                      value: t.id,
                    },
                    { name: "reply", label: "Customer-visible response" },
                    { name: "reason", label: "Internal audit reason" },
                  ]}
                />
              )}
            </section>
          ))
        ) : (
          <Empty title="No support requests available">
            Requests visible to your role appear here. Email remains deferred;
            responses are available in the customer workspace.
          </Empty>
        )}
      </>
    );
  if (path === "billing")
    return (
      <>
        <Heading eyebrow="Finance controls" title="Billing & approved rates">
          Commercial rules must be approved before they become customer charges.
        </Heading>
        {data.error && <Notice>{data.error}</Notice>}
        <div className="w-stats">
          {["Rate publication", "Invoice issuance", "Online payments"].map(
            (v) => (
              <div className="w-stat" key={v}>
                <span>{v}</span>
                <strong className="w-stat-word">Not enabled</strong>
                <small>Required approvals pending</small>
              </div>
            ),
          )}
        </div>
        <Notice>
          No historical tariff, proposed price or missing cost is treated as an
          approved rate or zero cost.
        </Notice>
        <Empty title="Ready for approved rules">
          Rate versions, immutable invoice lines and payment evidence will be
          connected once pricing and reconciliation rules are approved.
        </Empty>
      </>
    );
  if (path === "audit")
    return (
      <>
        <Heading eyebrow="Accountability" title="Audit history">
          Who changed what, when, and why.
        </Heading>
        {data.audit?.length ? (
          data.audit.map((a) => (
            <section key={a.id} className="w-panel w-pad">
              <h2>{a.action.replaceAll("_", " ")}</h2>
              <p>
                {a.entity_type} · {a.entity_id}
              </p>
              <p>{a.reason}</p>
              <small>
                {new Date(a.created_at).toLocaleString("en-JM", {
                  timeZone: "America/Jamaica",
                })}
              </small>
            </section>
          ))
        ) : (
          <Empty title="No audit records available">
            Audit records are append-only and visible to the owner role.
          </Empty>
        )}
      </>
    );
  if (path === "settings")
    return (
      <>
        <Heading
          eyebrow="Operational readiness"
          title="Settings & integrations"
        >
          Only verified configuration belongs in the customer experience.
        </Heading>
        <section className="w-panel w-pad">
          <dl className="w-dl">
            {[
              ["Supabase", "Identity and package schema connected"],
              ["Warehouse addresses", "No approved warehouse configured"],
              ["Resend", "Deferred by owner"],
              ["DMD", "Not connected — automation deferred"],
              ["Pricing", "Approval required"],
              ["Document scanning", "Quarantine policy required"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </>
    );
  return (
    <>
      <Heading
        eyebrow="Operations workspace"
        title="Keep the next step moving."
        action={<Action href={`${root}/intake`}>Review intake</Action>}
      >
        Prioritise exceptions, verify the facts and keep the customer informed.
      </Heading>
      {data.error && <Notice>{data.error}</Notice>}
      <div className="w-stats">
        {[
          [
            "Document review",
            data.packages.filter((p) => p.document_state === "under_review")
              .length,
          ],
          [
            "Missing documents",
            data.packages.filter((p) => p.document_state === "requested")
              .length,
          ],
          [
            "Unmatched intake",
            data.intake?.filter((o) => !o.package_id).length ?? 0,
          ],
        ].map(([title, n]) => (
          <div className="w-stat" key={title}>
            <span>{title}</span>
            <strong>{n}</strong>
            <small>
              {data.demo
                ? "Fictional preview queue"
                : "Visible to your staff role"}
            </small>
          </div>
        ))}
      </div>
      <div className="w-dashboard-grid">
        <section>
          <div className="w-section-title">
            <h2>Packages needing attention</h2>
            <Action href={`${root}/packages`} secondary>
              View packages
            </Action>
          </div>
          <PackageList
            packages={data.packages.filter(
              (p) => p.document_state !== "approved",
            )}
            root={root}
          />
        </section>
        <aside className="w-address-card">
          <p className="w-eyebrow">Operating readiness</p>
          <h2>Evidence before updates.</h2>
          <p>
            Confirm customer ownership, source reference and effective time
            before publishing a package event.
          </p>
          <Action href={`${root}/settings`} secondary>
            Review setup
          </Action>
        </aside>
      </div>
      <Notice>
        Resend and DMD are not connected in this preview. No notification or
        partner sync is claimed.
      </Notice>
    </>
  );
}
