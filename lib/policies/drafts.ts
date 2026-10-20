export type PolicyDraft = {
  title: string;
  sections: { title: string; paragraphs: string[] }[];
};
export const policies: Record<string, PolicyDraft> = {
  privacy: {
    title: "Privacy policy — draft",
    sections: [
      {
        title: "Who is responsible",
        paragraphs: [
          "Mckellar Group of Companies operates Parcels JA. Contact support@parcelsjm.com for support or privacy requests. Business/contact address: [TO BE CONFIRMED]. This draft has no effective date and requires business and legal approval before customer launch.",
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
          "We use information to identify customers, manage accounts, process shipments, request supporting documents, assess and explain charges, verify payments, provide support and protect the service. The final notice must document the lawful basis for each purpose, including any customs or recordkeeping obligation, and distinguish required information from optional information.",
          "Providing shipping information does not authorize unrelated marketing. Any future optional marketing must have a separate choice and a way to withdraw it.",
        ],
      },
      {
        title: "Service providers and international processing",
        paragraphs: [
          "The application uses Supabase for authentication, database and private document storage, and Vercel for application hosting. Approved staff receive access based on their duties. Shipment information may need to be shared with the carrier, warehouse, customs or delivery parties involved in the specific shipment, subject to approved arrangements and applicable requirements.",
          "Resend messaging and DMD portal automation are not currently activated. Before launch, confirm all recipients, hosting regions, processor agreements and safeguards for transfers outside Jamaica. This draft does not certify that those assessments are complete.",
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
          "Retention schedule: [APPROVE PERIODS FOR ACCOUNT, TRN/ADDRESS, SHIPMENT, DOCUMENT, FINANCIAL, SUPPORT, SECURITY AND BACKUP RECORDS]. We should keep information only for the documented purpose and applicable legal obligations, then securely delete or anonymize it. Legal holds and required financial records may limit immediate deletion. Backup deletion timing and inactive-account handling must be confirmed before launch.",
        ],
      },
      {
        title: "Your rights and requests",
        paragraphs: [
          "Contact support@parcelsjm.com to request access or correction, raise an objection, or ask about deletion and other applicable rights. We may need proportionate identity verification and must explain any lawful limitation. Never email a password or a complete identity document unless a secure approved process specifically requires it.",
          "You may raise a data-protection concern with Jamaica’s Office of the Information Commissioner at oic.gov.jm. Confirm the request-handling procedure, statutory response periods, controller registration and any data protection officer obligations before this draft becomes effective.",
        ],
      },
      {
        title: "Cookies and changes",
        paragraphs: [
          "Authentication uses essential session cookies. Any optional analytics or advertising tools, their purposes and consent controls must be documented before activation. Material policy changes will be explained with a version and effective date after approval.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of service — draft",
    sections: [
      {
        title: "Provider and scope",
        paragraphs: [
          "These draft terms describe the proposed Parcels JA service provided by Mckellar Group of Companies. Contact support@parcelsjm.com. Business/contact address: [TO BE CONFIRMED]. Effective date: [PENDING APPROVAL]. Public signup remains disabled while launch requirements are outstanding.",
          "The service manages customer accounts, shipment information, documents, billing and collection workflows. Available routes, delivery areas, warehouse arrangements and operating hours must be confirmed before accepting shipments. No transit time, delivery outcome or customs clearance is guaranteed by this draft.",
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
          "Customs duties/taxes, local delivery and storage are separate charges. They must be assessed and explained on the invoice; this draft does not set their rates or create a storage fee or free-storage period. Any other handling charge needs an explicit assessment and approved basis. Tax registration and statutory invoice particulars must be confirmed before customer billing.",
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
          "Request cancellation or return instructions before taking action. Feasibility depends on the shipment stage and third-party requirements. Any applicable return or additional charge must be disclosed and approved; no automatic penalty is established here. Refund eligibility, processing times and method: [BUSINESS AND LEGAL REVIEW REQUIRED]. A ledger credit is not a claim that cash has been refunded.",
        ],
      },
      {
        title: "Damage, loss and complaints",
        paragraphs: [
          "Keep purchase records and packaging and contact support@parcelsjm.com with the tracking number and relevant evidence if a shipment is missing or damaged. Claims procedure, deadlines, carrier responsibilities, insurance availability and any lawful liability terms: [REQUIRES APPROVAL]. This draft creates no insurance promise, liability cap or waiver of statutory consumer rights.",
          "Unresolved complaints may be referred to the appropriate Jamaican consumer or regulatory authority. These terms must be reviewed against applicable Jamaican law before use; they do not remove rights that cannot lawfully be excluded.",
        ],
      },
      {
        title: "Updates and acceptance",
        paragraphs: [
          "Approve the final service scope, policy versions and effective dates before seeking customer acceptance. Material changes should be communicated clearly. These draft terms are available for review and are not the currently operative customer contract.",
        ],
      },
    ],
  },
  "shipping-policy": {
    title: "Shipping policy — draft",
    sections: [
      {
        title: "Before sending a package",
        paragraphs: [
          "Parcels JA is operated by Mckellar Group of Companies. Contact support@parcelsjm.com. Business/contact address and effective date: [PENDING CONFIRMATION]. Use only the verified warehouse address and customer identifier assigned in your account. This policy does not publish or imply a warehouse address, route, operating schedule or delivery area that has not been approved.",
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
          "Accurate descriptions and values are required. Customs inspections, duty/tax assessments and holds are controlled by the relevant authorities. Required permits and restrictions depend on the goods. We do not publish an invented customs threshold or guarantee release.",
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
          "Shipping is charged in JMD using the approved 1–10 lb schedule described in the draft terms. Measured weight is rounded up to a whole pound; above 10 lb needs an approved manual quote. Customs duties/taxes, local delivery and storage are separate assessed charges. Confirm the itemized invoice and ask support about disputed amounts before collection.",
          "Storage periods, storage rates, delivery areas and local delivery fees are not established by this draft. They require explicit business approval and clear customer disclosure before application.",
        ],
      },
      {
        title: "Collection and delivery",
        paragraphs: [
          "Staff can mark a package ready for collection, out for delivery or delivered only when its invoice is settled and undisputed, document requirements are resolved and the customer has a verified shipping assignment. Confirm collection arrangements with support. Identification, authorized third-party collection, handover proof and delivery-attempt rules: [FINAL OPERATING PROCEDURE REQUIRED].",
          "Do not assume a local delivery service, timeframe or location is available until confirmed. Payment reversal or later correction may require further review without rewriting a completed handover.",
        ],
      },
      {
        title: "Returns, loss and damage",
        paragraphs: [
          "Contact support@parcelsjm.com before arranging a return or cancellation. Keep the goods, packaging and purchase evidence where relevant. Return routing, charges, claims deadlines, refund processing and insurance terms require final approval; this draft does not create a fee, coverage promise or limitation of consumer rights.",
        ],
      },
    ],
  },
};
