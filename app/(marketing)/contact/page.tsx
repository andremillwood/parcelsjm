import { PageIntro, Notice } from "../../../components/marketing/ui";
import { LeadForm } from "../../../components/marketing/lead-form";
import { leadsAvailable } from "../../../lib/leads/config";
import { pageMetadata } from "../../../lib/metadata";
export const dynamic = "force-dynamic";
export const metadata = pageMetadata(
  "Contact",
  "Ask about the Parcels JA experience. Inquiry availability is shown clearly; no support hours or response times are assumed.",
  "/contact",
);
export default function Contact() {
  return (
    <div className="m-container m-content-bottom">
      <PageIntro
        eyebrow="Let’s talk"
        title="A question is a good place to start."
      >
        <p>
          Ask about getting started, your business needs or the planned shipping
          experience.
        </p>
      </PageIntro>
      <div className="m-split">
        <div>
          <h2>Keep your documents private.</h2>
          <p className="m-prose">
            This inquiry form is for general questions. Package invoices and
            identity documents belong in the future authenticated document
            workflow.
          </p>
          <Notice>
            Official contact details, support hours and pickup locations are
            still being confirmed. No response-time guarantee is offered in this
            preview.
          </Notice>
        </div>
        <LeadForm available={leadsAvailable()} />
      </div>
    </div>
  );
}
