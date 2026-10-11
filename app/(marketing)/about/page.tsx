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
            Parcels JA is developing a shared place for your package
            information, documents and required actions. The goal is practical:
            help you understand the next step without piecing together scattered
            updates.
          </p>
          <ButtonLink href="/how-it-works" secondary>
            Explore the journey
          </ButtonLink>
        </div>
        <Notice>
          Company legal details, official support contacts and operational
          policies are still being confirmed for publication. This preview does
          not claim service history, customer numbers or delivery performance.
        </Notice>
      </div>
    </div>
  );
}
