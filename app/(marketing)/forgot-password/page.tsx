import {
  PageIntro,
  Notice,
  ButtonLink,
} from "../../../components/marketing/ui";
import { pageMetadata } from "../../../lib/metadata";
export const metadata = pageMetadata(
  "Forgot-Password",
  "Password reset will be available when secure accounts are enabled. No reset message can be sent from this preview.",
  "/forgot-password",
);
export default function Page() {
  return (
    <div className="m-container m-content-bottom">
      <PageIntro
        eyebrow="Customer account"
        title="Account recovery is not active yet."
      >
        <p>
          Password reset will be available when secure accounts are enabled. No
          reset message can be sent from this preview.
        </p>
      </PageIntro>
      <Notice>
        Not connected. No live account, tracking or address activation is
        available yet.
      </Notice>
      <div className="m-link-row">
        <ButtonLink href="/register">Preview registration</ButtonLink>
        <ButtonLink href="/dashboard" secondary>
          View the fictional app demo
        </ButtonLink>
      </div>
    </div>
  );
}
