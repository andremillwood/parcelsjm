import { PageIntro, ButtonLink } from "../../../components/marketing/ui";
import { APPROVED_RATE_CENTS, jmd } from "../../../lib/billing/pricing";
import { pageMetadata } from "../../../lib/metadata";
export const metadata = pageMetadata(
  "Shipping rates",
  "View Parcels JA shipping charges in JMD for packages up to 10 lb. Customs, delivery and storage charges are assessed separately.",
  "/rates",
);
export default function Rates() {
  return (
    <div className="m-container m-content-bottom">
      <PageIntro
        eyebrow="Plan your purchase"
        title="Your shipping rate, by weight."
      >
        <p>
          Shipping charges in Jamaican dollars. Measured weight is rounded up to
          the next whole pound.
        </p>
      </PageIntro>
      <div className="m-split m-rates-layout">
        <div className="m-rate-table-wrap">
          <table className="m-rate-table">
            <caption>Shipping schedule · effective 29 October 2026</caption>
            <thead>
              <tr>
                <th scope="col">Billable weight</th>
                <th scope="col">Shipping charge (JMD)</th>
              </tr>
            </thead>
            <tbody>
              {APPROVED_RATE_CENTS.map((amount, index) => (
                <tr key={index}>
                  <th scope="row">{index + 1} lb</th>
                  <td>{jmd(amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside className="m-rate-details">
          <h2>Know what is separate.</h2>
          <p>
            These are shipping charges, not the total landed cost. Customs
            duties and taxes, local delivery and storage are assessed separately
            and shown on your itemized invoice.
          </p>
          <p>
            For example, a 1.2 lb package is billed at the 2 lb shipping rate.
            Packages over 10 lb need an individual quote.
          </p>
          <p>
            Confirm delivery availability and any additional charges before
            ordering.
          </p>
          <ButtonLink href="/contact" secondary>
            Ask about your shipment
          </ButtonLink>
        </aside>
      </div>
    </div>
  );
}
