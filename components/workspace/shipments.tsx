import Link from "next/link";
import type { ShipmentData } from "../../lib/shipments/load";
import { Heading, Notice, Empty, Pill } from "./ui";
import { RecordSearch, Pagination } from "./pagination";
import { StaffForm } from "./staff-form";
export function Shipments({ data, id }: { data: ShipmentData; id?: string }) {
  const root = data.demo ? "/preview/admin" : "/admin",
    manage = data.canManage && !data.error;
  const s = data.batches.find((s) => s.id === id);
  if (id && !s)
    return (
      <>
        <Heading eyebrow="Shipment operations" title="Manifest unavailable">
          This record is unavailable to your role.
        </Heading>
        <Link href={root + "/shipments"}>Return to shipments</Link>
      </>
    );
  const hidden = s
    ? [
        { name: "id", label: "Consolidation", type: "hidden", value: s.id },
        {
          name: "version",
          label: "Version",
          type: "hidden",
          value: String(s.version),
        },
      ]
    : [];
  return (
    <>
      <Heading
        eyebrow="Manual shipment operations"
        title={s ? s.reference : "Shipment consolidations"}
      >
        Group verified packages and record partner/AWB references. Individual
        package checkpoints require their own evidence.
      </Heading>
      {data.error && <p role="alert">{data.error}</p>}
      <Notice>
        {data.demo ? "Fictional manifest preview. " : ""}DMD automation remains
        deferred. A consolidation status does not automatically advance its
        packages. Approved DMD delivery input: USD25 per consolidation; actual
        allocation and settlement evidence belong in the financial records.
      </Notice>
      {!s ? (
        <>
          <RecordSearch data={data.pagination} />
          {data.batches.length ? (
            <section className="w-panel">
              {data.batches.map((b) => (
                <Link
                  className="w-invoice-row"
                  key={b.id}
                  href={`${root}/shipments/${b.id}`}
                >
                  <strong>{b.reference}</strong>
                  <Pill value={b.status} />
                  <span>
                    {b.partner_reference || "No partner reference recorded"}
                  </span>
                </Link>
              ))}
            </section>
          ) : (
            <Empty title="No consolidations">
              Create a draft to prepare a verified manifest.
            </Empty>
          )}
          <Pagination data={data.pagination} />
          {manage && (
            <StaffForm
              demo={data.demo}
              action="shipment-create"
              title="Create draft consolidation"
              fields={[
                { name: "reference", label: "Unique consolidation reference" },
                { name: "reason", label: "Operational evidence and reason" },
              ]}
            />
          )}
        </>
      ) : (
        <>
          <Link href={root + "/shipments"}>All consolidations</Link>
          <section className="w-panel w-pad">
            <h2>Manifest · version {s.version}</h2>
            <Pill value={s.status} />
            <p>
              Partner/AWB reference: {s.partner_reference || "Not recorded"}
            </p>
            <h3>Package membership</h3>
            {data.members.length ? (
              <ul>
                {data.members.map((m) => (
                  <li key={m.package_id}>
                    <Link href={`${root}/packages/${m.package_id}`}>
                      {m.package_id}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No packages assigned.</p>
            )}
            {s.manifest && (
              <>
                <h3>Sealed dispatch snapshot</h3>
                <ul>
                  {s.manifest.map((m) => (
                    <li key={m.package_id}>
                      {m.tracking} · {m.status.replaceAll("_", " ")}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
          {manage && (
            <>
              <StaffForm
                key={`manifest-${s.version}`}
                demo={data.demo}
                action="shipment-manage"
                title="Record verified manifest change"
                fields={[
                  ...hidden,
                  {
                    name: "decision",
                    label: "Verified action",
                    options: (s.status === "draft"
                      ? ["add", "remove", "reference", "dispatch", "cancel"]
                      : s.status === "dispatched"
                        ? ["reference", "arrive"]
                        : s.status === "arrived"
                          ? ["reference", "close"]
                          : []
                    ).map((v) => ({ value: v, label: v.replaceAll("_", " ") })),
                  },
                  {
                    name: "packageId",
                    label: "Exact package UUID (add/remove only)",
                    optional: true,
                  },
                  {
                    name: "partnerReference",
                    label:
                      "Verified partner/AWB reference (reference action only)",
                    optional: true,
                  },
                  { name: "reason", label: "Operational evidence and reason" },
                ]}
              />
              <Notice>
                Membership changes are allowed only in a draft. Dispatch
                requires a nonempty manifest, verified partner reference and
                eligible packages. Closure requires every package to be
                delivered, returned or cancelled. Refresh after each action.
              </Notice>
            </>
          )}
        </>
      )}
    </>
  );
}
