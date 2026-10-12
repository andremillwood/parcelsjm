import {
  PageIntro,
  Notice,
  ButtonLink,
} from "../../../../components/marketing/ui";
import { pageMetadata } from "../../../../lib/metadata";
export const metadata = pageMetadata(
  "Terms of service",
  "Policy approval pending. This page is a placeholder and is not an operative legal policy.",
  "/legal/terms",
);
export default function Policy() {
  return (
    <div className="m-container m-content-bottom">
      <PageIntro eyebrow="Before public launch" title="Terms of service">
        <p>Approved policy text is not yet available.</p>
      </PageIntro>
      <Notice>
        <strong>Policy approval pending.</strong> This page is a development
        placeholder, not an operative legal policy or a substitute for legal
        advice. Live collection and shipping must not rely on this text.
      </Notice>
      <h2>What the approved policy needs to explain</h2>
      <ul className="m-policy-list">
        <li>Who provides the service and how to contact them.</li>
        <li>Customer obligations, fees and payment terms.</li>
        <li>Liability, prohibited goods, disputes and cancellations.</li>
      </ul>
      <ButtonLink href="/help" secondary>
        Return to help
      </ButtonLink>
    </div>
  );
}
