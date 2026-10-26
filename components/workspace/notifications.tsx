import Link from "next/link";
import {
  DELIVERY_STATES,
  type NotificationPage,
} from "../../lib/communications/load";
import { MESSAGE_CATALOG } from "../../lib/communications/templates";
import { Heading, Notice, Empty, Pill } from "./ui";
import { StaffForm } from "./staff-form";
const errors: Record<string, string> = {
  disabled_at_event:
    "Held because email was disabled when this event occurred. No automatic replay.",
  recipient_changed_or_inactive:
    "Recipient changed or account is inactive. Do not resend automatically.",
  recipient_suppressed: "Delivery stopped after a bounce or complaint.",
  provider_rate_limited: "Provider rate limit. A capped retry is scheduled.",
  provider_rejected:
    "Provider rejected the request. Investigate before requesting a retry.",
  idempotency_window_expired:
    "Provider deduplication window expired. Manual investigation required.",
  retry_exhausted: "Retry limit reached. Investigate provider logs.",
  stale_before_first_attempt: "Event is too old for automatic first delivery.",
  template_unavailable:
    "Template/version unavailable. Investigate before sending.",
  provider_unavailable:
    "Provider did not confirm acceptance. Retry uses the same message and key.",
  idempotency_conflict:
    "The provider reported an idempotency conflict. Manual investigation required.",
  unverified_recipient: "No verified recipient. Message suppressed.",
};
export function Notifications({ data }: { data: NotificationPage }) {
  const root = data.demo ? "/preview/admin" : "/admin";
  return (
    <>
      <Heading eyebrow="Customer communications" title="Email notifications">
        <span>
          Delivery outcomes, controlled retries and the approved template
          catalogue.
        </span>
      </Heading>
      {!data.allowed ? (
        <Empty title="Owner access required">
          Notification delivery and retry controls are restricted to the owner
          role.
        </Empty>
      ) : (
        <>
          <Notice>
            {data.demo
              ? "Fictional delivery records for design review. No email is sent by this demo."
              : data.liveEnabled
                ? "Live queue enabled. Only eligible new events are processed; old held events are not replayed."
                : "Live queue is disabled. Account SMTP is configured separately; public signup remains gated."}{" "}
            Provider acceptance is not proof of inbox delivery. Unscanned
            documents remain quarantined.
          </Notice>
          {data.error && (
            <p role="alert" className="w-error">
              {data.error}
            </p>
          )}
          <form className="w-panel w-pad w-toolbar" method="get">
            <label>
              Delivery state
              <select name="status" defaultValue={data.state}>
                <option value="">All states</option>
                {DELIVERY_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <button className="w-button">Filter notifications</button>
            <Link href={`${root}/notifications`}>Reset filters</Link>
          </form>
          <p className="w-muted">
            {data.total} logical notifications · page {data.page}. Recipient
            addresses, email bodies, security tokens and identity details are
            not exposed here.
          </p>
          {data.rows.length ? (
            data.rows.map((row) => (
              <section className="w-panel w-pad w-task" key={row.id}>
                <div className="w-panel-heading">
                  <h2>
                    {MESSAGE_CATALOG[row.kind]?.subject ??
                      "Recorded notification"}
                  </h2>
                  <Pill value={row.state} />
                </div>
                <dl className="w-dl">
                  <div>
                    <dt>Reference</dt>
                    <dd>{row.resource_id}</dd>
                  </div>
                  <div>
                    <dt>Delivery scope</dt>
                    <dd>{row.scope}</dd>
                  </div>
                  <div>
                    <dt>Attempts</dt>
                    <dd>{row.attempts} of 5</dd>
                  </div>
                  <div>
                    <dt>Last update · Jamaica</dt>
                    <dd>
                      {new Date(row.updated_at).toLocaleString("en-JM", {
                        timeZone: "America/Jamaica",
                      })}
                    </dd>
                  </div>
                </dl>
                {row.error_code && (
                  <p>
                    {errors[row.error_code] ??
                      "Delivery needs operator review. Check provider logs using the notification reference."}
                  </p>
                )}
                {["retry", "failed"].includes(row.state) &&
                  row.attempts < 5 && (
                    <details>
                      <summary>Request a controlled retry</summary>
                      <StaffForm
                        demo={data.demo}
                        action="email-retry"
                        title="Retry this notification"
                        fields={[
                          {
                            name: "id",
                            label: "Notification",
                            type: "hidden",
                            value: row.id,
                          },
                          {
                            name: "reason",
                            label: "Investigation and reason for retry",
                          },
                        ]}
                      />
                      <p className="w-muted">
                        The server rejects expired or suppressed messages. This
                        does not create a new message identity or clear a
                        bounce.
                      </p>
                    </details>
                  )}
              </section>
            ))
          ) : (
            <Empty title="No notification records">
              New eligible events appear here after configuration. Try another
              filter. Saved shipment and financial records do not depend on
              email delivery.
            </Empty>
          )}
          <nav className="w-pagination" aria-label="Notification pages">
            <span>Page {data.page}</span>
            <div>
              {data.page > 1 && (
                <Link
                  href={`${root}/notifications?page=${data.page - 1}&status=${data.state}`}
                >
                  Previous
                </Link>
              )}
              {data.page * 25 < data.total && (
                <Link
                  href={`${root}/notifications?page=${data.page + 1}&status=${data.state}`}
                >
                  Next
                </Link>
              )}
            </div>
          </nav>
          <section className="w-panel w-pad">
            <h2>Operational templates</h2>
            <p>
              These messages follow verified records. No marketing, WhatsApp or
              SMS is activated.
            </p>
            {Object.entries(MESSAGE_CATALOG)
              .filter(([k]) => k !== "test_message")
              .map(([kind, t]) => (
                <details key={kind}>
                  <summary>{t.subject}</summary>
                  <p>{t.text}</p>
                </details>
              ))}
          </section>
        </>
      )}
    </>
  );
}
