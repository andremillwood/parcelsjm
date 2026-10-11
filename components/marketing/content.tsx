export const faqs = [
  {
    question: "Can I register and start shipping now?",
    answer:
      "Not through this preview. You can explore the personal and business registration journey, but no account or shipping address is created yet.",
  },
  {
    question: "When will I receive a US shipping address?",
    answer:
      "After registration is enabled, your account must be verified and assigned an approved warehouse address and identifier. Until then, address activation will show as pending. Do not ship to an unconfirmed address.",
  },
  {
    question: "Where can I see shipping rates?",
    answer:
      "The Rates page explains the current availability. An estimate will only be available after an approved rate card and its charge inclusions are published. Historical prices are not live quotes.",
  },
  {
    question: "What documents should I prepare?",
    answer:
      "Keep your purchase invoice and order reference available. Your package will show the documents specifically requested for it. Do not send invoices or identity documents through the inquiry form.",
  },
  {
    question: "How will package tracking work?",
    answer:
      "The planned customer account will display verified shipment events, when they occurred, and any action you need to take. The current app demo contains fictional records and cannot track a real package.",
  },
  {
    question: "Do you offer pickup or local delivery?",
    answer:
      "Pickup arrangements and delivery coverage must be confirmed before booking. This preview does not confirm locations, delivery areas or transit times.",
  },
];
export const steps = [
  [
    "Create your account",
    "Choose personal or business and verify your email when registration becomes available.",
  ],
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
