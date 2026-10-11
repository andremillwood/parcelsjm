import { PageIntro, Notice } from "../../../components/marketing/ui";
import { LeadForm } from "../../../components/marketing/lead-form";
import { leadsAvailable } from "../../../lib/leads/config";
import { pageMetadata } from "../../../lib/metadata";
export const dynamic = "force-dynamic";
export const metadata = pageMetadata(
  "Rates being updated",
  "Shipping estimates are unavailable until current rates and charge inclusions are approved.",
  "/rates",
);
export default function Rates() {
  return (
    <div className="m-container m-content-bottom">
      <PageIntro
        eyebrow="Know the cost before you commit"
        title="Clear costs start with confirmed rates."
      >
        <p>
          We are preparing the price schedule. Historical tariffs and suggested
          prices are not current shipping quotes.
        </p>
      </PageIntro>
      <div className="m-split">
        <div>
          <Notice>
            <strong>Estimate unavailable.</strong> No approved rate card is
            published. The calculator will remain unavailable until rates and
            charge inclusions are confirmed.
          </Notice>
          <h2>What to look for in your quote</h2>
          <ul className="m-policy-list">
            <li>The currency, effective date and weight calculation basis.</li>
            <li>
              Freight and handling charges, with their inclusions explained.
            </li>
            <li>Any assessed customs duties and taxes, shown separately.</li>
            <li>Pickup or local delivery charges, only where confirmed.</li>
          </ul>
          <p className="m-prose">
            No price, fee, exchange rate or delivery option shown here should be
            treated as a booking commitment.
          </p>
        </div>
        <LeadForm kind="rates" available={leadsAvailable()} />
      </div>
    </div>
  );
}
