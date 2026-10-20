import Link from "next/link";
import { Heading, Notice, Empty, Pill } from "./ui";
import { StaffForm } from "./staff-form";
import { Pagination } from "./pagination";
import type { loadQueues } from "../../lib/workspace/queues";
import { listOptions } from "../../lib/workspace/pagination";
const priorities = ["Low", "Normal", "High", "Urgent"];
export function Queues({
  data,
  demo = false,
}: {
  data: Awaited<ReturnType<typeof loadQueues>>;
  demo?: boolean;
}) {
  const o = listOptions(data.pagination.params),
    root = demo ? "/preview/admin" : "/admin";
  return (
    <>
      <Heading eyebrow="Operations" title="Work queues">
        Assign the next action, review aging and follow the source record to
        resolve it.
      </Heading>
      <Notice>
        Priority and due dates are staff decisions, not delivery promises. Files
        remain quarantined until an approved scanner clears them. Email remains
        deferred.
      </Notice>
      {data.error && <p role="alert">{data.error}</p>}
      <form method="get" className="w-panel w-pad w-queue-filters">
        <label>
          Search reference
          <input
            name="q"
            type="search"
            maxLength={120}
            defaultValue={o.search}
          />
        </label>
        <label>
          Work type
          <select name="kind" defaultValue={o.kind}>
            <option value="">All types</option>
            {["shipment", "intake", "document", "support", "invoice"].map(
              (v) => (
                <option key={v}>{v}</option>
              ),
            )}
          </select>
        </label>
        <label>
          State
          <select name="status" defaultValue={o.status || "open"}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label>
          Assignment
          <select name="assignee" defaultValue={o.assignee}>
            <option value="">Anyone</option>
            <option value="mine">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </label>
        <label>
          Priority
          <select name="priority" defaultValue={o.priority}>
            <option value="">All priorities</option>
            {priorities.map((p, i) => (
              <option key={p} value={i}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="w-check">
          <input
            type="checkbox"
            name="overdue"
            value="true"
            defaultChecked={o.overdue}
          />
          Past staff due date
        </label>
        <button className="w-button">Apply filters</button>
        <Link href={`${root}/queues`}>Reset filters</Link>
      </form>
      <p className="w-muted">
        Ordered by priority, then oldest open work. Aging is elapsed time, not
        an approved SLA.
      </p>
      {data.tasks.length ? (
        data.tasks.map((t) => {
          const age = Math.max(
              0,
              Math.floor(
                (Date.parse(data.observedAt) - Date.parse(t.opened_at)) /
                  3600000,
              ),
            ),
            overdue =
              t.state === "open" &&
              t.due_at &&
              Date.parse(t.due_at) < Date.parse(data.observedAt),
            people = data.assignees[t.kind] ?? [],
            person = people.find((p) => p.id === t.assignee_id),
            href =
              t.kind === "shipment"
                ? `${root}/packages/${t.source_id}`
                : t.kind === "invoice"
                  ? `${root}/billing/${t.source_id}`
                  : `${root}/${t.kind === "document" ? "documents" : t.kind === "intake" ? "intake" : "support"}?q=${encodeURIComponent(t.source_id)}`;
          return (
            <section key={t.id} className="w-panel w-pad w-task">
              <div className="w-task-heading">
                <div>
                  <p className="w-muted">
                    {t.kind} · {priorities[t.priority]} priority
                  </p>
                  <h2>{t.reference}</h2>
                </div>
                <Pill value={t.state} />
              </div>
              <dl className="w-dl">
                <div>
                  <dt>Assigned to</dt>
                  <dd>
                    {person?.name ||
                      (t.assignee_id
                        ? "Staff unavailable — reassign"
                        : "Unassigned")}
                  </dd>
                </div>
                <div>
                  <dt>Open for</dt>
                  <dd>
                    {age < 24 ? `${age} hours` : `${Math.floor(age / 24)} days`}
                  </dd>
                </div>
                <div>
                  <dt>Staff due date</dt>
                  <dd>
                    {t.due_at
                      ? `${new Date(t.due_at).toLocaleString("en-JM", { timeZone: "America/Jamaica" })} · Jamaica${overdue ? " · Past due" : ""}`
                      : "Not set"}
                  </dd>
                </div>
              </dl>
              <Link className="w-button w-button-secondary" href={href}>
                Open source record
              </Link>
              {t.state === "open" && (
                <details>
                  <summary>Assign or prioritize</summary>
                  <StaffForm
                    key={`${t.id}-${t.version}`}
                    demo={demo}
                    action="queue"
                    title="Update work assignment"
                    fields={[
                      {
                        name: "id",
                        label: "Task",
                        type: "hidden",
                        value: t.id,
                      },
                      {
                        name: "version",
                        label: "Version",
                        type: "hidden",
                        value: String(t.version),
                      },
                      {
                        name: "assignee",
                        label: "Assignee (leave blank to unassign)",
                        optional: true,
                        value: t.assignee_id ?? "",
                        options: people.map((p) => ({
                          value: p.id,
                          label: p.name || "Staff",
                        })),
                      },
                      {
                        name: "priority",
                        label: "Priority",
                        value: String(t.priority),
                        options: priorities.map((p, i) => ({
                          value: String(i),
                          label: p,
                        })),
                      },
                      {
                        name: "due",
                        label:
                          "Staff due date (Jamaica time; leave blank to clear)",
                        optional: true,
                        type: "datetime-local",
                        value: t.due_at
                          ? new Date(Date.parse(t.due_at) - 5 * 3600000)
                              .toISOString()
                              .slice(0, 16)
                          : "",
                      },
                      { name: "reason", label: "Internal audit reason" },
                    ]}
                  />
                </details>
              )}
            </section>
          );
        })
      ) : (
        <Empty title={data.error ? "Queue unavailable" : "No matching work"}>
          {data.error
            ? "Retry before taking action; this is not an empty queue confirmation."
            : "Try another filter or review closed work. New work appears automatically from its source."}
        </Empty>
      )}
      <Pagination data={data.pagination} />
    </>
  );
}
