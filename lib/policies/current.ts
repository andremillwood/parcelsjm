export const POLICY_VERSION = "2026-10-29";
export const POLICY_EFFECTIVE_DATE = "29 October 2026";

export type PublishedPolicy = {
  title: string;
  sections: { title: string; paragraphs: string[] }[];
};
export const policies: Record<string, PublishedPolicy> = {
  privacy: {
    title: "Privacy policy",
    sections: [
      {
        title: "Who is responsible",
        paragraphs: [
          "Mckellar Group of Companies operates Parcels JA. Contact support@parcelsjm.com for support or privacy requests. Contact us for business correspondence and service enquiries.",
        ],
      },
      {
        title: "Information we handle",
        paragraphs: [
          "Account information includes your name, email, telephone number, Taxpayer Registration Number (TRN) and home address. Shipment records include tracking numbers, purchase details, pre-alerts, status history and documents you submit. We also record invoices, payment references, collections, support requests and relevant security and audit events.",
          "TRNs, addresses and uploaded documents are restricted to authorized workflows. Do not submit payment-card details or unrelated sensitive information through support messages or uploads.",
        ],
      },
      {
        title: "Why we use information",
        paragraphs: [
          "We use information to identify customers, manage accounts, process shipments, request supporting documents, assess and explain charges, verify payments, provide support and protect the service. Account and shipment information is required to provide the service, administer the customer relationship and meet applicable customs and recordkeeping obligations. Optional information is identified at collection.",
          "Providing shipping information does not authorize unrelated marketing. Any future optional marketing must have a separate choice and a way to withdraw it.",
        ],
      },
      {
        title: "Service providers and international processing",
        paragraphs: [
          "The application uses Supabase for authentication, database and private document storage, and Vercel for application hosting. Approved staff receive access based on their duties. Shipment information may need to be shared with the carrier, warehouse, customs or delivery parties involved in the specific shipment, subject to approved arrangements and applicable requirements.",
          "Account verification and transactional messages use our email service providers. Staff may record shipment information from DMD manifests. Information may be processed outside Jamaica by the service providers involved in your account and shipment. Contact us with questions about this processing.",
        ],
      },
      {
        title: "Documents and security",
        paragraphs: [
          "Uploads are held privately in quarantine while no approved malware scanner is connected. Unscanned files are not available for ordinary review or download. Authorized staff can manage document requests and follow up on missing requirements. Access controls, audit records and restricted storage reduce risk; no system can promise absolute security.",
        ],
      },
      {
        title: "Retention and deletion",
        paragraphs: [
          "We retain account, identity, shipment, document, financial, support and security records for their service purpose and applicable legal obligations. Contact us to request deletion or ask about retention of a particular record. Required financial records, legal holds and backup retention may limit immediate deletion; we explain any applicable limitation when responding.",
        ],
      },
      {
        title: "Your rights and requests",
        paragraphs: [
          "Contact support@parcelsjm.com to request access or correction, raise an objection, or ask about deletion and other applicable rights. We may need proportionate identity verification and must explain any lawful limitation. Never email a password or a complete identity document unless a secure approved process specifically requires it.",
          "You may raise a data-protection concern with Jamaica’s Office of the Information Commissioner at oic.gov.jm. We review requests and respond in accordance with applicable requirements.",
        ],
      },
      {
        title: "Cookies and changes",
        paragraphs: [
          "Authentication uses essential session cookies. Any optional analytics or advertising tools, their purposes and consent controls must be documented before activation. Material policy changes will be explained with a version and effective date.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of service",
    sections: [
      {
        title: "Provider and scope",
        paragraphs: [
          "These terms describe the Parcels JA service provided by Mckellar Group of Companies. Contact support@parcelsjm.com. Contact us for business correspondence and service enquiries.",
          "The service manages customer accounts, shipment information, documents, billing and collection workflows. Available routes, delivery areas, warehouse arrangements and operating hours must be confirmed before accepting shipments. No transit time, delivery outcome or customs clearance is guaranteed.",
        ],
      },
      {
        title: "Your account and information",
        paragraphs: [
          "Provide accurate contact details, TRN, home address and shipment information. Keep credentials private and report suspected misuse. Use only the shipping address and customer identifier actually assigned and verified in your account. A pre-alert is a notice of an expected package, not proof that Parcels JA has received it.",
        ],
      },
      {
        title: "Goods and customs",
        paragraphs: [
          "You are responsible for accurate descriptions, values, purchase documents and any required permits. Do not send prohibited, unlawful or undeclared restricted goods. Confirm acceptance of unusual, hazardous or restricted items before shipment. Customs authorities determine their own inspections, assessments and release requirements; Parcels JA must not promise an exemption or a clearance time.",
        ],
      },
      {
        title: "Shipping charges and separate costs",
        paragraphs: [
          "The approved JMD shipping schedule uses weight rounded up to the next whole pound: 1 lb $695; 2 lb $1,095; 3 lb $1,395; 4 lb $1,695; 5 lb $1,995; 6 lb $2,295; 7 lb $2,595; 8 lb $2,895; 9 lb $3,195; 10 lb $3,495. Packages above 10 lb require an approved manual quote. An invoice records the measured weight, billable weight and applicable rate version.",
          "Customs duties/taxes, local delivery and storage are separate charges. They must be assessed and explained on the invoice; these terms do not set their rates or create a storage fee or free-storage period. Any other handling charge needs an explicit assessment and approved basis. Your invoice sets out the applicable assessed charges.",
        ],
      },
      {
        title: "Payments, disputes and release",
        paragraphs: [
          "Use only payment instructions confirmed by the business. Staff verify manual payments against evidence before crediting an invoice. A transfer screenshot alone is not confirmation of cleared funds. Partial payments reduce the balance; duplicate references must not be counted twice. No online payment processor is represented as active.",
          "Contact support@parcelsjm.com promptly if a charge is incorrect. Staff record disputes, explanations, corrections, payment reversals and approved credits in the account history. Release requires a settled, undisputed invoice, resolved document requirements and a verified customer shipping assignment. A payment reversal can reopen an outstanding debt after handover.",
        ],
      },
      {
        title: "Cancellations, returns and refunds",
        paragraphs: [
          "Request cancellation or return instructions before taking action. Feasibility depends on the shipment stage and third-party requirements. Any applicable return or additional charge must be disclosed and approved; no automatic penalty is established here. Contact support for a review of refund eligibility. The outcome, method and timing are confirmed for the individual request. A ledger credit is not a claim that cash has been refunded.",
        ],
      },
      {
        title: "Damage, loss and complaints",
        paragraphs: [
          "Keep purchase records and packaging and contact support@parcelsjm.com with the tracking number and relevant evidence if a shipment is missing or damaged. Support will confirm the procedure and any applicable carrier requirements for the individual claim. These terms create no insurance promise, liability cap or waiver of statutory consumer rights.",
          "Unresolved complaints may be referred to the appropriate Jamaican consumer or regulatory authority. These terms do not remove rights that cannot lawfully be excluded under applicable Jamaican law.",
        ],
      },
      {
        title: "Updates and acceptance",
        paragraphs: [
          "Creating an account requires acceptance of these terms and acknowledgment of the privacy policy. The version accepted is recorded with your account. Material changes will be communicated with an effective date.",
        ],
      },
    ],
  },
  "shipping-policy": {
    title: "Shipping policy",
    sections: [
      {
        title: "Before sending a package",
        paragraphs: [
          "Parcels JA is operated by Mckellar Group of Companies. Contact support@parcelsjm.com. Contact us for business correspondence and service enquiries. Use only the verified warehouse address and customer identifier assigned in your account. Delivery areas, operating arrangements and shipment availability are confirmed individually.",
        ],
      },
      {
        title: "Pre-alerts and receiving",
        paragraphs: [
          "Submit accurate carrier tracking, retailer, contents and purchase details when creating a pre-alert. Keep your purchase invoice. A pre-alert records an expectation only. Receipt is confirmed through an operational checkpoint supported by evidence; a retailer’s delivery notice does not by itself confirm that the package has been matched to your account.",
        ],
      },
      {
        title: "Documents and customs",
        paragraphs: [
          "Provide requested invoices, identification, permits or other supporting records through the approved secure process. Files are private and remain quarantined until an approved scanner returns a clean result. While scanning is unavailable, staff must resolve document requirements through an approved process; an unscanned upload alone does not clear a requirement.",
          "Accurate descriptions and values are required. Customs inspections, duty/tax assessments and holds are controlled by the relevant authorities. Required permits and restrictions depend on the goods. We do not guarantee customs release.",
        ],
      },
      {
        title: "Tracking and exceptions",
        paragraphs: [
          "Shipment checkpoints may cover receiving, processing, transit, Jamaican arrival, customs processing or hold, clearance, collection or delivery. Status changes record when an event occurred and the supporting evidence. Delays and exceptions are reviewed by staff. A checkpoint is not a promised arrival date.",
          "Corrections preserve the history and require a reason. An exception must be resolved through the recorded workflow; staff cannot silently erase financial or handover records.",
        ],
      },
      {
        title: "Weight and charges",
        paragraphs: [
          "Shipping is charged in JMD using the approved 1–10 lb schedule described in the terms of service. Measured weight is rounded up to a whole pound; above 10 lb needs an approved manual quote. Customs duties/taxes, local delivery and storage are separate assessed charges. Confirm the itemized invoice and ask support about disputed amounts before collection.",
          "Storage periods, storage rates, delivery areas and local delivery fees are confirmed separately and disclosed before application.",
        ],
      },
      {
        title: "Collection and delivery",
        paragraphs: [
          "Staff can mark a package ready for collection, out for delivery or delivered only when its invoice is settled and undisputed, document requirements are resolved and the customer has a verified shipping assignment. Choose delivery to your preferred address or pickup in your account. Our pickup location is being established. A pickup ticket confirms the location and the time your package becomes available; this is not a collection deadline. Wait for confirmation before travelling. Contact support for identification, third-party collection and delivery-attempt arrangements.",
          "Do not assume a local delivery service, timeframe or location is available until confirmed. Payment reversal or later correction may require further review without rewriting a completed handover.",
        ],
      },
      {
        title: "Returns, loss and damage",
        paragraphs: [
          "Contact support@parcelsjm.com before arranging a return or cancellation. Keep the goods, packaging and purchase evidence where relevant. Support confirms return routing, applicable charges and claim requirements for your shipment. This policy does not create a fee, insurance promise or limitation of consumer rights.",
        ],
      },
    ],
  },
};
