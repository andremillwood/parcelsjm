export const TEMPLATE_VERSION = 1;
export const MESSAGE_CATALOG: Record<
  string,
  {
    subject: string;
    text: string;
    destination:
      "profile" | "packages" | "documents" | "billing" | "support" | "admin";
  }
> = {
  account_ready: {
    subject: "Your Parcels JA account is ready",
    text: "Your verified account onboarding is complete. A shipping address is available only after the team activates and assigns it. Check your profile before sending any package.",
    destination: "profile",
  },
  address_ready: {
    subject: "Your shipping address is ready",
    text: "The team has activated your shipping address. Sign in to review your assigned address and shipping identifier before using them.",
    destination: "profile",
  },
  pre_alert_received: {
    subject: "We received your pre-alert",
    text: "Your purchase details are recorded. A pre-alert does not confirm warehouse receipt or customs clearance.",
    destination: "packages",
  },
  shipment_update: {
    subject: "A verified shipment update is available",
    text: "The team recorded a verified shipment checkpoint. Sign in for its effective time, current status and next action. This email does not promise a delivery date.",
    destination: "packages",
  },
  shipment_correction: {
    subject: "A shipment update was corrected",
    text: "The team corrected a previously recorded checkpoint. Review the corrected history and explanation in your account; the original event is retained.",
    destination: "packages",
  },
  document_requested: {
    subject: "A document is needed",
    text: "The team requested a supporting document. Sign in to read the instructions and upload it privately. Do not reply with identity records or attachments.",
    destination: "documents",
  },
  document_uploaded: {
    subject: "Your file was received into quarantine",
    text: "Your upload is held privately in quarantine. Receipt is not approval, and the file cannot be ordinarily reviewed or downloaded until an approved malware scan clears it.",
    destination: "documents",
  },
  document_rejected: {
    subject: "A document needs your attention",
    text: "A document or upload could not be accepted. Sign in for the recorded reason and replacement instructions. Do not email the replacement file.",
    destination: "documents",
  },
  document_approved: {
    subject: "Your document review is complete",
    text: "The team approved a requested document after its required checks. This document decision alone is not customs clearance or shipment release.",
    destination: "documents",
  },
  document_waived: {
    subject: "A document requirement was waived",
    text: "The team recorded a waiver for a specific document requirement. Review the reason and any remaining requirements in your account.",
    destination: "documents",
  },
  document_scan_clean: {
    subject: "Your file is ready for document review",
    text: "The security scan cleared this file. Human review of the requested document is still required; a clean scan is not document approval.",
    destination: "documents",
  },
  document_scan_infected: {
    subject: "A file was blocked by a security scan",
    text: "A security scan blocked the file. It remains restricted. Sign in for safe replacement instructions and do not email the blocked file.",
    destination: "documents",
  },
  document_scan_error: {
    subject: "Document scanning is still pending",
    text: "The scan could not be completed. Your file remains quarantined. Check your account for any request from the team; this is not a rejection or approval.",
    destination: "documents",
  },
  invoice_issue: {
    subject: "Your Parcels JA invoice is available",
    text: "An approved invoice has been issued. Sign in to review the itemized charges, balance and approved collection instructions. Online card processing is not implied.",
    destination: "billing",
  },
  invoice_dispute: {
    subject: "An invoice dispute was recorded",
    text: "The team recorded an invoice dispute. Sign in for the explanation and current balance. Shipment release remains subject to the required checks.",
    destination: "billing",
  },
  invoice_resolve_dispute: {
    subject: "An invoice dispute was resolved",
    text: "The team recorded a resolution to an invoice dispute. Review the explanation and current outstanding amount in your account.",
    destination: "billing",
  },
  invoice_void: {
    subject: "An invoice was voided",
    text: "The team voided an invoice. Sign in to review its history and any replacement invoice. This is not a payment refund confirmation.",
    destination: "billing",
  },
  invoice_adjusted: {
    subject: "Your invoice has an adjustment",
    text: "The team recorded an invoice adjustment. Review the itemized change and current balance in your account.",
    destination: "billing",
  },
  payment_verified: {
    subject: "A payment was verified",
    text: "The team verified a payment against your invoice. Sign in to check the amount, collection history and remaining balance. A partial payment does not mean the invoice is fully paid.",
    destination: "billing",
  },
  payment_reversed: {
    subject: "A payment record was reversed",
    text: "The team reversed a previously recorded payment. Sign in to review the explanation and updated balance. This is not confirmation of a bank refund.",
    destination: "billing",
  },
  support_received: {
    subject: "Your support request is recorded",
    text: "Your request is available to the support team. Sign in to follow its status. No response-time or delivery promise is made by this acknowledgement.",
    destination: "support",
  },
  support_reply: {
    subject: "The support team has replied",
    text: "A reply and resolution update are available in your account. Sign in to read them securely.",
    destination: "support",
  },
  staff_support: {
    subject: "A customer support request needs review",
    text: "A support request is ready for authorized staff review. Open the staff application; no customer message or personal details are included in this email.",
    destination: "admin",
  },
  staff_document: {
    subject: "A customer file was received into quarantine",
    text: "A document upload was recorded. It remains quarantined until an approved scanner clears it; this notice does not grant access to the file.",
    destination: "admin",
  },
  staff_inquiry: {
    subject: "A new Parcels JA inquiry needs review",
    text: "An inquiry is ready for authorized staff review. Its private record is available through the approved administrative process. No submitted personal information is included here.",
    destination: "admin",
  },
  inquiry_received: {
    subject: "We received your Parcels JA inquiry",
    text: "Your inquiry is recorded for staff review. This acknowledgement does not create a customer account, activate an address or confirm a shipping quote.",
    destination: "support",
  },
  test_message: {
    subject: "Parcels JA email setup test",
    text: "This is a synthetic delivery test. No customer account, shipment, document decision or payment was created by this message.",
    destination: "support",
  },
};
const statusText: Record<string, string> = {
  received_us: "Warehouse receipt recorded",
  processing_us: "US processing update",
  in_transit: "Verified transit update",
  arrived_jm: "Arrival in Jamaica recorded",
  customs_processing: "Customs processing update",
  customs_hold: "Customs action needs attention",
  cleared: "Customs clearance recorded",
  ready_for_pickup: "Your package is ready for pickup",
  out_for_delivery: "Your package is out for delivery",
  delivered: "Delivery confirmation recorded",
  exception: "A shipment exception needs attention",
  returned: "A shipment return was recorded",
  cancelled: "A shipment cancellation was recorded",
};
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function renderMessage(
  kind: string,
  resource: string,
  status: string,
  origin: string,
  version = 1,
) {
  const template = MESSAGE_CATALOG[kind];
  if (
    !template ||
    version !== TEMPLATE_VERSION ||
    !/^[a-f0-9-]{36}$/i.test(resource)
  )
    throw new Error("Unknown notification template");
  const subject =
    kind === "shipment_update"
      ? (statusText[status] ?? template.subject)
      : template.subject;
  const path =
    template.destination === "admin"
      ? kind === "staff_support"
        ? "/admin/support"
        : kind === "staff_document"
          ? "/admin/documents"
          : "/admin/notifications"
      : kind === "inquiry_received"
        ? "/help"
        : `/app/${template.destination}${template.destination === "packages" || template.destination === "billing" ? `/${resource}` : ""}`;
  const url = new URL(path, origin).href;
  const action =
    kind === "inquiry_received"
      ? "Open help centre"
      : template.destination === "admin"
        ? "Open staff application"
        : "Open secure account";
  const text = `${subject}\n\n${template.text}\n\nReference: ${resource}\n${action}: ${url}\n\nParcels JA · Mckellar Group of Companies\nThis is an operational message, not a marketing subscription.`;
  const html = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f1f4f7;font-family:Arial,sans-serif;color:#07172b"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff"><tr><td style="padding:28px;background:#07172b;color:#ffc800;font-size:24px;font-weight:bold">Parcels JA</td></tr><tr><td style="padding:28px"><h1 style="font-size:26px;line-height:1.25;margin:0 0 20px">${escape(subject)}</h1><p style="line-height:1.7">${escape(template.text)}</p><p style="font-size:13px;line-height:1.6">Reference: ${escape(resource)}</p><p style="margin:28px 0"><a href="${escape(url)}" style="display:inline-block;background:#ffc800;color:#07172b;padding:14px 22px;text-decoration:none;border-radius:24px;font-weight:bold">${escape(action)}</a></p><p style="font-size:12px;line-height:1.6">If the button does not work, open: <a href="${escape(url)}">${escape(url)}</a></p></td></tr><tr><td style="padding:24px 28px;background:#eef2f6;font-size:12px;line-height:1.6">Mckellar Group of Companies · Parcels JA<br>This is an operational message, not a marketing subscription.</td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}
