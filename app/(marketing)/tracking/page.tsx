import {
  PageIntro,
  Notice,
  ButtonLink,
} from "../../../components/marketing/ui";
import { pageMetadata } from "../../../lib/metadata";
export const metadata = pageMetadata(
  "Tracking",
  "Private tracking will be available in your authenticated customer account. No public package lookup is offered in this preview.",
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
          Private tracking will be available in your authenticated customer
          account. No public package lookup is offered in this preview.
        </p>
      </PageIntro>
      <Notice>
        Not connected. No live account, tracking or address activation is
        available yet.
      </Notice>
      <div className="m-link-row">
        <ButtonLink href="/login">Explore sign-in</ButtonLink>
        <ButtonLink href="/dashboard" secondary>
          View the fictional app demo
        </ButtonLink>
      </div>
    </div>
  );
}
