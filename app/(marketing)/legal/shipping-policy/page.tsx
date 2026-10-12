import {
  PageIntro,
  Notice,
  ButtonLink,
} from "../../../../components/marketing/ui";
import { pageMetadata } from "../../../../lib/metadata";
export const metadata = pageMetadata(
  "Shipping policy",
  "Policy approval pending. This page is a placeholder and is not an operative legal policy.",
  "/legal/shipping-policy",
);
export default function Policy() {
  return (
    <div className="m-container m-content-bottom">
      <PageIntro eyebrow="Before public launch" title="Shipping policy">
        <p>Approved policy text is not yet available.</p>
      </PageIntro>
      <Notice>
        <strong>Policy approval pending.</strong> This page is a development
        placeholder, not an operative legal policy or a substitute for legal
        advice. Live collection and shipping must not rely on this text.
      </Notice>
      <h2>What the approved policy needs to explain</h2>
      <ul className="m-policy-list">
        <li>Approved warehouse addressing and package identification.</li>
        <li>Document requirements and customs responsibilities.</li>
        <li>Confirmed collection, delivery, claims and returns procedures.</li>
      </ul>
      <ButtonLink href="/help" secondary>
        Return to help
      </ButtonLink>
    </div>
  );
}
