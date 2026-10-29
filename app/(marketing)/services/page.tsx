import {
  PageIntro,
  Notice,
  ButtonLink,
} from "../../../components/marketing/ui";
import { pageMetadata } from "../../../lib/metadata";
export const metadata = pageMetadata(
  "Services",
  "Explore the Parcels JA experience. Routes, coverage and service commitments require confirmation before booking.",
  "/services",
);
export default function Services() {
  return (
    <div className="m-container m-content-bottom">
      <PageIntro
        eyebrow="The Parcels JA experience"
        title="One place for the details that matter."
      >
        <p>
          Our customer experience focuses on US purchases coming to Jamaica,
          with clear information and required actions along the way.
        </p>
      </PageIntro>
      <Notice>
        <strong>Service availability is being confirmed.</strong> This is not a
        live service catalogue. Routes, transit times, warehouse locations,
        pickup and delivery coverage must be verified before booking.
      </Notice>
      <div className="m-detail-grid">
        {[
          [
            "Package preparation",
            "Create a pre-alert and keep your purchase reference ready.",
          ],
          [
            "Document organization",
            "See the specific paperwork requested for each package.",
          ],
          [
            "Verified tracking",
            "Follow confirmed events with timestamps and next steps.",
          ],
          [
            "Business inquiries",
            "Discuss regular import needs without assuming an unapproved rate.",
          ],
        ].map(([title, copy]) => (
          <article className="m-detail" key={title}>
            <h2 className="m-step-title">{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </div>
      <div className="m-link-row">
        <ButtonLink href="/how-it-works" secondary>
          Explore the process
        </ButtonLink>
      </div>
    </div>
  );
}
