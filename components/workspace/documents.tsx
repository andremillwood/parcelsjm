"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DocumentData, DocumentRequest } from "../../lib/documents/model";
import type { WorkspaceData } from "../../lib/workspace/model";
import { MAX_DOCUMENT_BYTES } from "../../lib/documents/constants";
import { Pill, Empty, Notice } from "./ui";
const time = (s: string) =>
  new Date(s).toLocaleString("en-JM", { timeZone: "America/Jamaica" });
async function post(action: string, data: object) {
  const r = await fetch(`/api/documents/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const d = await r.json();
  if (!r.ok)
    throw new Error(d.message || "The document action could not be confirmed.");
  return d;
}
function UploadForm({
  request,
  enabled,
}: {
  request: DocumentRequest;
  enabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState<string | null>(null);
  async function complete(id: string) {
    const result = await post("complete", { uploadId: id });
    setPending(null);
    setMessage(result.message);
    router.refresh();
  }
  return (
    <form
      className="w-form w-document-upload"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setMessage("");
        try {
          if (pending) {
            await complete(pending);
            return;
          }
          const data = new FormData(e.currentTarget);
          const file = data.get("file");
          if (
            !(file instanceof File) ||
            !file.size ||
            file.size > MAX_DOCUMENT_BYTES
          )
            throw new Error("Choose a PDF, JPEG or PNG no larger than 10 MB.");
          const amount = String(data.get("amount") || "");
          const intent = await post("intent", {
            requestId: request.id,
            filename: file.name,
            mime: file.type,
            size: file.size,
            amount: amount ? Number(amount) : null,
            currency: amount ? data.get("currency") : null,
            merchant: String(data.get("merchant") || ""),
            orderReference: String(data.get("orderReference") || ""),
          });
          setMessage("Uploading to private storage…");
          const uploaded = await fetch(intent.signedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!uploaded.ok)
            throw new Error(
              "Storage upload failed. Refresh and try again after the reservation expires in 20 minutes.",
            );
          setPending(intent.uploadId);
          setMessage("Verifying file contents…");
          await complete(intent.uploadId);
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Upload failed. Please retry.",
          );
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy || !enabled}>
        <legend>Submit {request.document_type.replaceAll("_", " ")}</legend>
        {!pending && (
          <>
            <label>
              Document file
              <input
                type="file"
                name="file"
                required
                accept="application/pdf,image/jpeg,image/png"
                aria-describedby={`file-help-${request.id}`}
              />
            </label>
            <p className="w-muted" id={`file-help-${request.id}`}>
              PDF, JPEG or PNG · up to 10 MB · one file per version, up to five
              versions. Choose a photo from your phone or camera where
              supported. Do not upload unrelated identity documents.
            </p>
            {request.document_type === "invoice" && (
              <div className="w-form-grid">
                <label>
                  Invoice amount (optional)
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="1000000"
                  />
                </label>
                <label>
                  Invoice currency
                  <select name="currency">
                    <option>USD</option>
                    <option>JMD</option>
                  </select>
                </label>
                <label>
                  Invoice merchant (optional)
                  <input name="merchant" maxLength={160} />
                </label>
                <label>
                  Order reference (optional)
                  <input name="orderReference" maxLength={120} />
                </label>
              </div>
            )}
          </>
        )}
        <button className="w-button" type="submit">
          {busy
            ? "Please wait…"
            : pending
              ? "Retry file confirmation"
              : "Upload document"}
        </button>
      </fieldset>
      {!enabled && (
        <p>Uploads are temporarily unavailable. Your request remains saved.</p>
      )}
      {message && <p role="status">{message}</p>}
    </form>
  );
}
function ReviewForm({
  request,
  clean,
}: {
  request: DocumentRequest;
  clean: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <form
      className="w-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const d = new FormData(e.currentTarget);
        setBusy(true);
        try {
          const result = await post("review", {
            requestId: request.id,
            version: request.version,
            expected: request.status,
            decision: d.get("decision"),
            reason: d.get("reason"),
          });
          setMessage(result.message);
          router.refresh();
        } catch (err) {
          setMessage(err instanceof Error ? err.message : "Review failed.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        <legend>Review decision</legend>
        <label>
          Decision
          <select required name="decision" defaultValue="">
            <option value="">Choose a decision…</option>
            {clean && request.status === "under_review" && (
              <option value="approved">Approve document</option>
            )}
            {["uploaded", "under_review"].includes(request.status) && (
              <option value="rejected">Reject and request replacement</option>
            )}
            <option value="waived">Waive this requirement</option>
          </select>
        </label>
        <label>
          Reason and customer instructions
          <textarea
            required
            name="reason"
            minLength={10}
            maxLength={2000}
            rows={3}
          />
        </label>
        <button className="w-button" type="submit">
          Save document review
        </button>
      </fieldset>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
function Download({ id }: { id: string }) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <button
        className="w-button w-button-secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const d = await post("download", { uploadId: id });
            const a = document.createElement("a");
            a.href = d.url;
            a.rel = "noreferrer";
            a.click();
            setMessage(d.message);
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Download failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Download checked file
      </button>
      {message && <p role="status">{message}</p>}
    </>
  );
}
export function DocumentRequestForm({
  data,
  packageId,
}: {
  data: WorkspaceData;
  packageId?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="w-form w-panel w-pad"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const form = e.currentTarget,
          d = new FormData(form);
        if (data.demo) {
          setMessage("Fictional preview only. No document was requested.");
          return;
        }
        setBusy(true);
        try {
          const selected = String(d.get("packageId") || "");
          const pkg = data.packages.find((p) => p.id === selected);
          const result = await post("request", {
            profileId: pkg?.profile_id || d.get("profileId"),
            packageId: selected || null,
            type: d.get("type"),
            instructions: d.get("instructions"),
          });
          setMessage(result.message);
          form.reset();
          router.refresh();
        } catch (err) {
          setMessage(err instanceof Error ? err.message : "Request failed.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Request a document</h2>
      <p>
        Explain the operational need and exactly what the customer should
        supply. Identity documents must have a verified lawful basis.
      </p>
      <fieldset disabled={busy}>
        <legend className="sr-only">Document request</legend>
        <label>
          Package (optional)
          <select name="packageId" defaultValue={packageId || ""}>
            <option value="">Customer profile document</option>
            {data.packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.carrier_tracking} · {p.merchant}
              </option>
            ))}
          </select>
        </label>
        <label>
          Customer (required for profile documents)
          <select name="profileId" defaultValue="">
            <option value="">Use selected package’s customer</option>
            {data.customers?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name || "Customer"} · {c.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Document type
          <select name="type">
            <option value="invoice">Purchase invoice</option>
            <option value="payment_proof">Proof of purchase payment</option>
            <option value="other">Other specifically requested document</option>
          </select>
        </label>
        <label>
          Why needed and what to upload
          <textarea
            name="instructions"
            required
            minLength={10}
            maxLength={2000}
            rows={3}
          />
        </label>
        <button className="w-button" type="submit">
          Request document
        </button>
      </fieldset>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
export function Documents({
  data,
  admin = false,
  packageId,
}: {
  data: WorkspaceData;
  admin?: boolean;
  packageId?: string;
}) {
  const docs: DocumentData = data.documents ?? {
    requests: [],
    uploads: [],
    history: [],
    canRequest: false,
    canReview: false,
    uploadsEnabled: false,
  };
  const [filter, setFilter] = useState("all");
  const all = docs.requests.filter(
    (r) => !packageId || r.package_id === packageId,
  );
  const requests = all.filter((r) => filter === "all" || r.status === filter);
  return (
    <div className="w-documents">
      <Notice>
        Files are private. Unscanned files remain quarantined and cannot be
        opened or approved. A document approval does not mean customs clearance.
        Email notifications remain deferred.
      </Notice>
      {admin && (docs.canRequest || data.demo) && (
        <DocumentRequestForm data={data} packageId={packageId} />
      )}
      <div className="w-document-toolbar">
        <strong>
          {all.length} document request{all.length === 1 ? "" : "s"}
        </strong>
        <label>
          Filter document status
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {[
              "all",
              "requested",
              "uploaded",
              "under_review",
              "approved",
              "rejected",
              "waived",
            ].map((v) => (
              <option key={v} value={v}>
                {v.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!requests.length && (
        <Empty
          title={
            all.length
              ? "No requests match this status"
              : "No document requests yet"
          }
        >
          {admin
            ? "Request a specific document from a customer or package above."
            : "The team’s requests and reasons will appear here. You do not need to upload anything until it is requested."}
        </Empty>
      )}
      {requests.map((r) => {
        const versions = docs.uploads
          .filter((u) => u.request_id === r.id)
          .sort((a, b) => b.version - a.version);
        const latest = versions.find((u) => u.version === r.version);
        const pkg = data.packages.find((p) => p.id === r.package_id);
        return (
          <section
            className="w-panel w-pad w-document-card"
            key={r.id}
            aria-label={`${r.document_type.replaceAll("_", " ")} request`}
          >
            <div className="w-panel-heading">
              <div>
                <p className="w-eyebrow">
                  {pkg ? pkg.carrier_tracking : "Customer profile"}
                </p>
                <h2>{r.document_type.replaceAll("_", " ")}</h2>
              </div>
              <Pill value={r.status} />
            </div>
            <p className="w-document-instructions">{r.instructions}</p>
            <small>Requested {time(r.created_at)} · Jamaica time</small>
            {latest && (
              <p className="w-document-scan">
                <strong>File safety: </strong>
                {latest.scan_state === "pending" ||
                latest.scan_state === "error"
                  ? "Quarantined — scanning pending"
                  : latest.scan_state.replaceAll("_", " ")}
              </p>
            )}
            {!admin &&
              !data.demo &&
              ["requested", "rejected"].includes(r.status) && (
                <UploadForm request={r} enabled={docs.uploadsEnabled} />
              )}
            {admin &&
              docs.canReview &&
              !["approved", "waived"].includes(r.status) && (
                <ReviewForm
                  request={r}
                  clean={latest?.scan_state === "clean"}
                />
              )}
            {!!versions.length && (
              <details>
                <summary>File versions ({versions.length})</summary>
                {versions.map((u) => (
                  <div className="w-document-version" key={u.id}>
                    <strong>
                      Version {u.version} · {u.filename}
                    </strong>
                    <p>
                      {(u.declared_size / 1024).toFixed(1)} KB ·{" "}
                      {time(u.created_at)} · {u.scan_state.replaceAll("_", " ")}
                    </p>
                    {u.amount && (
                      <p>
                        Invoice: {u.currency} {u.amount} · {u.merchant} ·{" "}
                        {u.order_reference}
                      </p>
                    )}
                    {u.scan_state === "clean" &&
                      (!admin || docs.canReview) &&
                      !data.demo && <Download id={u.id} />}
                  </div>
                ))}
              </details>
            )}
            <details open={r.status === "rejected"}>
              <summary>Request and review history</summary>
              <ol className="w-document-history">
                {docs.history
                  .filter((h) => h.request_id === r.id)
                  .map((h) => (
                    <li key={h.id}>
                      <strong>{h.action.replaceAll("_", " ")}</strong>
                      <p>{h.reason}</p>
                      <small>{time(h.created_at)}</small>
                    </li>
                  ))}
              </ol>
            </details>
          </section>
        );
      })}
    </div>
  );
}
