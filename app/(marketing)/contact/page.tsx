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
          Ask about getting started, your business needs or the shipping
          experience.
        </p>
      </PageIntro>
      <div className="m-split">
        <div>
          <h2>Keep your documents private.</h2>
          <p className="m-prose">
            This inquiry form is for general questions. Package invoices and
            identity documents belong in the private document section in your
            account.
          </p>
          <Notice>
            For an existing shipment, sign in and send a support request from
            your account. Pickup locations and availability are confirmed on
            your pickup ticket.
          </Notice>
        </div>
        <LeadForm available={leadsAvailable()} />
      </div>
    </div>
  );
}
