import {
  PageIntro,
  Notice,
  ButtonLink,
} from "../../../components/marketing/ui";
import { pageMetadata } from "../../../lib/metadata";
export const metadata = pageMetadata(
  "About Parcels JA",
  "Connecting You to What Matters. Learn the direction of the Parcels JA customer experience.",
  "/about",
);
export default function About() {
  return (
    <div className="m-container m-content-bottom">
      <PageIntro eyebrow="Parcels JA" title="Connecting You to What Matters.">
        <p>
          A clearer experience for customers in Jamaica purchasing from the
          United States.
        </p>
      </PageIntro>
      <div className="m-split">
        <div>
          <h2>Clarity is the starting point.</h2>
          <p className="m-prose">
            Parcels JA brings together your package details in one place with
            documents and required actions. The goal is practical: help you
            understand the next step without piecing together scattered updates.
          </p>
          <ButtonLink href="/how-it-works" secondary>
            Explore the journey
          </ButtonLink>
        </div>
        <Notice>
          Choose delivery to your preferred address or pickup. Our pickup
          location is being established; wait for your ticket to confirm where
          and when to collect.
        </Notice>
      </div>
    </div>
  );
}
