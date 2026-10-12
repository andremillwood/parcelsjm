import { Documents } from "./documents";
import type { WorkspaceData } from "../../lib/workspace/model";
import { Heading, Action, Empty, Notice, Pill } from "./ui";
import { PackageList } from "./packages";
import { WorkspaceForm } from "./forms";
export function CustomerWorkspace({
  data,
  path,
  rootOverride,
}: {
  data: WorkspaceData;
  path: string;
  rootOverride?: string;
}) {
  const root = rootOverride ?? (data.demo ? "/preview/app" : "/app");
  const packages = data.packages;
  if (path.startsWith("packages/")) {
    const p = packages.find((item) => item.id === path.split("/")[1]);
    return (
      <>
        <Heading
          eyebrow="Package details"
          title={p?.merchant ?? "Package unavailable"}
          action={
            <Action href={`${root}/packages`} secondary>
              All packages
            </Action>
          }
        >
          {p?.carrier_tracking}
        </Heading>
        {p ? (
          <>
            <div className="w-detail-grid">
              <section className="w-panel w-pad">
                <div className="w-panel-heading">
                  <h2>Package progress</h2>
                  <Pill value={p.status} />
                </div>
                <Notice>
                  {data.demo
                    ? "Fictional timeline for design review. No shipment has been received or verified."
                    : "Only verified shipment events appear here. A pre-alert is not warehouse receipt."}
                </Notice>
                <ol className="w-timeline">
                  <li>
                    <span />
                    <div>
                      <strong>Pre-alert created</strong>
                      <p>{p.description}</p>
                      <small>
                        {new Date(p.created_at).toLocaleDateString("en-JM")}
                      </small>
                    </div>
                  </li>
                  {data.events
                    ?.filter((event) => event.package_id === p.id)
                    .map((event) => (
                      <li key={event.id}>
                        <span />
                        <div>
                          <strong>{event.status.replaceAll("_", " ")}</strong>
                          <small>
                            {new Date(event.occurred_at).toLocaleString(
                              "en-JM",
                              { timeZone: "America/Jamaica" },
                            )}
                          </small>
                        </div>
                      </li>
                    ))}
                  {data.demo && p.status !== "pre_alerted" && (
                    <li>
                      <span />
                      <div>
                        <strong>Example operational update</strong>
                        <p>
                          This sample illustrates where a verified event, source
                          and timestamp will appear.
                        </p>
                      </div>
                    </li>
                  )}
                </ol>
              </section>
              <section className="w-panel w-pad">
                <h2>Details at a glance</h2>
                <dl className="w-dl">
                  <div>
                    <dt>Declared item value</dt>
                    <dd>
                      {p.declared_currency} {p.declared_value}
                    </dd>
                  </div>
                  <div>
                    <dt>Documents</dt>
                    <dd>
                      <Pill value={p.document_state} />
                    </dd>
                  </div>
                  <div>
                    <dt>Billing</dt>
                    <dd>
                      <Pill value={p.payment_state} />
                    </dd>
                  </div>
                </dl>
                <p className="w-muted">
                  Declared value is the value of your goods, not a shipping
                  charge.
                </p>
              </section>
            </div>
            <section className="w-panel w-pad">
              <h2>Package documents</h2>
              <p>
                Respond to a specific request from the team. Do not upload
                identity documents unless they have been lawfully requested.
              </p>
              <Documents data={data} packageId={p.id} admin={!!rootOverride} />
            </section>
          </>
        ) : (
          <Empty title="This package is not available">
            Return to your package list to view records belonging to your
            account.
          </Empty>
        )}
      </>
    );
  }
  if (path === "packages")
    return (
      <>
        <Heading
          eyebrow="Your shipments"
          title="My packages"
          action={
            <Action href={`${root}/pre-alert/new`}>Add a pre-alert</Action>
          }
        >
          Find your orders and see what needs your attention.
        </Heading>
        <PackageList packages={packages} root={root} />
      </>
    );
  if (path === "pre-alert/new")
    return (
      <>
        <Heading
          eyebrow="Before your package arrives"
          title="Tell us what’s on its way."
        >
          A pre-alert helps connect your order and its documents. It does not
          confirm warehouse receipt.
        </Heading>
        <WorkspaceForm kind="pre-alert" demo={data.demo} />
      </>
    );
  if (path === "documents")
    return (
      <>
        <Heading eyebrow="Paperwork, together" title="Your documents">
          Review requests, upload the right file and see the team’s response.
        </Heading>
        {data.error && <Notice>{data.error}</Notice>}
        <Documents data={data} />
      </>
    );
  if (path === "billing")
    return (
      <>
        <Heading eyebrow="Charges & payments" title="Billing">
          Clear, approved charges. No estimated balance presented as an invoice.
        </Heading>
        <Empty title="No issued invoices">
          Shipping rates and cost rules still require approval. No payment is
          due from this preview.
        </Empty>
        <Notice>
          Online payments are not connected. An approved invoice and payment
          instructions must be available before you pay.
        </Notice>
      </>
    );
  if (path === "support")
    return (
      <>
        <Heading eyebrow="We’re here for the details" title="How can we help?">
          Give the team the context they need. Keep sensitive documents in the
          package workflow.
        </Heading>
        <WorkspaceForm kind="support" demo={data.demo} />
        {data.support?.map((ticket) => (
          <section className="w-panel w-pad" key={ticket.id}>
            <h2>{ticket.subject}</h2>
            <Pill value={ticket.status} />
            <p>{ticket.body}</p>
            {ticket.reply && (
              <p>
                <strong>Team response:</strong> {ticket.reply}
              </p>
            )}
          </section>
        ))}
      </>
    );
  if (path === "profile" || path === "onboarding")
    return (
      <>
        <Heading
          eyebrow="Your account"
          title={
            path === "onboarding"
              ? "Let’s get the details right."
              : "My profile"
          }
        >
          Your profile is separate from your approved shipping address.
        </Heading>
        <WorkspaceForm
          kind="profile"
          demo={data.demo}
          name={data.name}
          phone={data.phone}
          accountType={data.accountType}
        />
        <section className="w-panel w-pad">
          <h2>Shipping address</h2>
          <Notice>
            {data.shippingAddress ??
              "Address activation pending. A verified warehouse and unique shipping identifier must be assigned before you send a package."}
          </Notice>
        </section>
      </>
    );
  return (
    <>
      <Heading
        eyebrow="Your shipping workspace"
        title={`Good to see you, ${data.name.split(" ")[0]}.`}
        action={<Action href={`${root}/pre-alert/new`}>Add a pre-alert</Action>}
      >
        Your packages, documents and next steps—all in one place.
      </Heading>
      {data.error && <Notice>{data.error}</Notice>}
      {data.onboardingPending && (
        <Notice>
          Finish your contact details before creating pre-alerts.{" "}
          <a href={`${root}/onboarding`}>Complete onboarding →</a>
        </Notice>
      )}
      <div className="w-stats">
        {[
          ["Packages to follow", packages.length],
          [
            "Need your attention",
            packages.filter((p) => p.document_state === "requested").length,
          ],
          [
            "Documents in review",
            packages.filter((p) => p.document_state === "under_review").length,
          ],
        ].map(([title, value]) => (
          <div className="w-stat" key={title}>
            <span>{title}</span>
            <strong>{value}</strong>
            <small>
              {data.demo ? "Fictional sample records" : "In your account"}
            </small>
          </div>
        ))}
      </div>
      <div className="w-dashboard-grid">
        <section>
          <div className="w-section-title">
            <h2>Your latest packages</h2>
            <a href={`${root}/packages`}>View all ↗</a>
          </div>
          <PackageList packages={packages} root={root} />
        </section>
        <aside className="w-address-card">
          <p className="w-eyebrow">Your US shipping address</p>
          <h2>
            {data.shippingAddress
              ? "Ready when you are."
              : "A little more to confirm."}
          </h2>
          <span className="w-pending">
            {data.shippingAddress
              ? "Address active"
              : "Address activation pending"}
          </span>
          <p>
            {data.shippingAddress ??
              "Your approved address and shipping identifier will appear here once assigned. Please do not send packages before activation."}
          </p>
          <Action href={`${root}/profile`} secondary>
            Review your profile
          </Action>
        </aside>
      </div>
      <section className="w-help-band">
        <div>
          <h2>A good pre-alert saves a question.</h2>
          <p>Keep your store, tracking reference and item details together.</p>
        </div>
        <Action href="/how-it-works" secondary>
          Review the process
        </Action>
      </section>
    </>
  );
}
