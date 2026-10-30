export const faqs = [
  {
    question: "Can I register and start shipping now?",
    answer:
      "Create a personal or business account using your home address and 9-digit TRN, then verify your email. Wait for your assigned US shipping address before sending packages.",
  },
  {
    question: "When will I receive a US shipping address?",
    answer:
      "Your account must be verified and assigned an approved warehouse address and identifier. Until then, address activation will show as pending. Do not ship to an unconfirmed address.",
  },
  {
    question: "Where can I see shipping rates?",
    answer:
      "The Rates page lists our JMD shipping schedule for 1–10 lb. Measured weight is rounded up to the next pound. Customs duties and taxes, local delivery and storage are assessed separately; packages over 10 lb need an individual quote.",
  },
  {
    question: "What documents should I prepare?",
    answer:
      "Keep your purchase invoice and order reference available. Your package will show the documents specifically requested for it. Do not send invoices or identity documents through the inquiry form.",
  },
  {
    question: "How will package tracking work?",
    answer:
      "Sign in to see verified shipment events, when they occurred, and any action you need to take.",
  },
  {
    question: "Do you offer pickup or local delivery?",
    answer:
      "Choose delivery to your preferred address or pickup in your account. Our pickup location is being established. Your pickup ticket will confirm where and when your package is available; wait for confirmation before travelling.",
  },
];
export const steps = [
  ["Create your account", "Choose personal or business and verify your email."],
  [
    "Wait for address activation",
    "Use only the warehouse address and unique identifier assigned to your verified account.",
  ],
  [
    "Shop and pre-alert",
    "Add the carrier tracking reference, purchase details and declared value to your account.",
  ],
  [
    "Prepare your documents",
    "Attach the requested invoice or paperwork through the private customer portal.",
  ],
  [
    "Follow verified updates",
    "See the last confirmed package event and any document or customs action required.",
  ],
  [
    "Review, pay and collect",
    "Review your itemized invoice and confirmed payment and collection arrangements.",
  ],
];
export function FAQ({ limit }: { limit?: number }) {
  return (
    <div className="m-faq">
      {faqs.slice(0, limit).map((faq) => (
        <details key={faq.question}>
          <summary>
            {faq.question}
            <span aria-hidden="true">+</span>
          </summary>
          <p>{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
