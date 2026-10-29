import { PageIntro, Notice, CTA } from "../../../components/marketing/ui";
import { steps } from "../../../components/marketing/content";
import { pageMetadata } from "../../../lib/metadata";
export const metadata = pageMetadata(
  "How it works",
  "Understand the shipping journey from account verification and address assignment to documents, tracking and collection.",
  "/how-it-works",
);
export default function HowItWorks() {
  return (
    <>
      <div className="m-container m-content-bottom">
        <PageIntro
          eyebrow="The shipping journey"
          title="From your cart to your next step."
        >
          <p>
            Six steps to keep your purchases, documents and collection
            arrangements together.
          </p>
        </PageIntro>
        <Notice>
          Do not send a package until your account has an approved warehouse
          address and shipping identifier. Use the exact address shown in your
          account.
        </Notice>
        <ol className="m-full-steps">
          {steps.map(([title, copy], i) => (
            <li key={title}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h2 className="m-step-title">{title}</h2>
                <p>{copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <CTA />
    </>
  );
}
