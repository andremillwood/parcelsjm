import {
  PageIntro,
  Notice,
  ButtonLink,
} from "../../../components/marketing/ui";
import { pageMetadata } from "../../../lib/metadata";
export const metadata = pageMetadata(
  "Tracking",
  "Sign in to view your shipment tracking and delivery or pickup arrangements.",
  "/tracking",
);
export default function Page() {
  return (
    <div className="m-container m-content-bottom">
      <PageIntro
        eyebrow="Customer account"
        title="Your package details belong to you."
      >
        <p>
          Sign in to view verified tracking updates, package documents and your
          delivery or pickup arrangements.
        </p>
      </PageIntro>
      <Notice>
        Package information is private. Sign in with the account used for your
        shipment.
      </Notice>
      <div className="m-link-row">
        <ButtonLink href="/login">Sign in</ButtonLink>
        <ButtonLink href="/app" secondary>
          My packages
        </ButtonLink>
      </div>
    </div>
  );
}
