import { createHash } from "node:crypto";
import { getIdentity } from "../../../../lib/auth/session";
import { InputError, readJson, reply } from "../../../../lib/http/input";
import {
  DOCUMENT_BUCKET,
  documentSchemas,
  sniffDocument,
} from "../../../../lib/documents/validation";
import { privilegedClient } from "../../../../lib/supabase/privileged";
export const runtime = "nodejs";
export const maxDuration = 60;
const json = (data: object) =>
  Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const identity = await getIdentity();
    if (!identity || identity.profile.account_status !== "active")
      return reply(401, "Sign in with an active, verified account.");
    const { action } = await params;
    const body = await readJson(request);
    const { client } = identity;
    if (action === "request" || action === "review") {
      const roles = await client
        .from("admin_role_assignments")
        .select("role")
        .eq("profile_id", identity.user.id);
      const allowed =
        action === "request"
          ? ["owner", "documents", "operations"]
          : ["owner", "documents"];
      if (roles.error || !roles.data?.some((r) => allowed.includes(r.role)))
        return reply(403, "An authorized document staff role is required.");
    }
    if (action === "request") {
      const d = documentSchemas.request.parse(body);
      const result = await client.rpc("request_document", {
        p_profile: d.profileId,
        p_package: d.packageId,
        p_type: d.type,
        p_instructions: d.instructions,
      });
      if (result.error)
        return reply(
          409,
          "Request not saved. Check customer, package ownership and request limits.",
        );
      return json({
        id: result.data,
        message:
          "Document requested. The customer can see it in their app; email remains deferred.",
      });
    }
    if (action === "intent") {
      if (process.env.DOCUMENT_UPLOADS_ENABLED !== "true")
        return reply(503, "Document uploads are not enabled yet.");
      privilegedClient(); // Fail before reserving an intent if server validation is unavailable.
      const d = documentSchemas.intent.parse(body);
      const reserved = await client.rpc("reserve_document_upload", {
        p_request: d.requestId,
        p_filename: d.filename,
        p_mime: d.mime,
        p_size: d.size,
        p_amount: d.amount,
        p_currency: d.currency,
        p_merchant: d.merchant,
        p_order: d.orderReference,
      });
      if (reserved.error)
        return reply(
          409,
          "Upload not started. Refresh the request. Limits: five attempts per request, twenty per day; interrupted attempts expire after 20 minutes.",
        );
      const upload = await client
        .from("document_uploads")
        .select("id,object_path")
        .eq("id", reserved.data)
        .eq("profile_id", identity.user.id)
        .single();
      if (!upload.data)
        return reply(409, "Upload reservation could not be confirmed.");
      const signed = await client.storage
        .from(DOCUMENT_BUCKET)
        .createSignedUploadUrl(upload.data.object_path, { upsert: false });
      if (signed.error)
        return reply(
          503,
          "Upload permission unavailable. Retry later; nothing has been accepted.",
        );
      return json({
        uploadId: upload.data.id,
        signedUrl: signed.data.signedUrl,
      });
    }
    if (action === "complete") {
      const d = documentSchemas.complete.parse(body);
      // An explicit ownership check precedes every privileged file operation.
      const { data: u, error } = await client
        .from("document_uploads")
        .select(
          "id,object_path,declared_mime,declared_size,completed_at,scan_state",
        )
        .eq("id", d.uploadId)
        .eq("profile_id", identity.user.id)
        .single();
      if (error || !u) return reply(404, "Upload unavailable.");
      if (u.completed_at)
        return json({
          message:
            u.scan_state === "invalid"
              ? "File rejected. Upload a valid replacement."
              : "Upload already received. Check the current review status.",
        });
      const service = privilegedClient();
      const stored = await service.storage
        .from(DOCUMENT_BUCKET)
        .download(u.object_path);
      if (stored.error || !stored.data)
        return reply(
          409,
          "File not found in storage. Finish uploading before retrying confirmation.",
        );
      const bytes = new Uint8Array(await stored.data.arrayBuffer());
      const mime = sniffDocument(bytes);
      const valid =
        mime === u.declared_mime && bytes.length === u.declared_size;
      const result = await service.rpc("complete_document_upload", {
        p_upload: u.id,
        p_mime: mime,
        p_size: bytes.length,
        p_sha256: createHash("sha256").update(bytes).digest("hex"),
        p_valid: valid,
      });
      if (result.error)
        return reply(
          409,
          "File confirmation failed. The upload may have expired or the request changed. Refresh before trying again.",
        );
      return reply(
        valid ? 200 : 422,
        valid
          ? "Uploaded securely. Your file is quarantined until malware scanning completes, then the team can review it. Email remains deferred."
          : "File rejected: its contents or size did not match the selected PDF, JPEG or PNG. Please upload a valid replacement.",
      );
    }
    if (action === "review") {
      const d = documentSchemas.review.parse(body);
      const result = await client.rpc("review_document", {
        p_request: d.requestId,
        p_version: d.version,
        p_expected: d.expected,
        p_decision: d.decision,
        p_reason: d.reason,
      });
      if (result.error)
        return reply(
          409,
          "Review not saved. Refresh changed records; approval requires a clean malware scan. A reason is required for every decision.",
        );
      return reply(
        200,
        "Review saved in the customer history. Email remains deferred.",
      );
    }
    if (action === "download") {
      const d = documentSchemas.download.parse(body);
      const permitted = await client.rpc("authorize_document_download", {
        p_upload: d.uploadId,
      });
      if (permitted.error || !permitted.data)
        return reply(
          403,
          "File access is unavailable: check ownership, role, scan status and download limit.",
        );
      const signed = await privilegedClient()
        .storage.from(DOCUMENT_BUCKET)
        .createSignedUrl(permitted.data, 60, { download: true });
      if (signed.error)
        return reply(503, "Download unavailable. Please retry.");
      return json({
        url: signed.data.signedUrl,
        message: "Private download link expires in 60 seconds.",
      });
    }
    return reply(404, "Action unavailable.");
  } catch (error) {
    if (error instanceof InputError) return reply(error.status, error.message);
    if (error instanceof Error && error.name === "ZodError")
      return reply(
        400,
        "Check document fields, filename, file type and the 10 MB size limit.",
      );
    return reply(
      503,
      "Document service unavailable. No successful change could be confirmed.",
    );
  }
}
