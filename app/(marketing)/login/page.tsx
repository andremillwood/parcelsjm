import {
  PageIntro,
  Notice,
  ButtonLink,
} from "../../../components/marketing/ui";
import { pageMetadata } from "../../../lib/metadata";
export const metadata = pageMetadata(
  "Login",
  "Secure sign-in is being prepared. This preview does not accept passwords or provide access to real customer records.",
  "/login",
);
export default function Page() {
  return (
    <div className="m-container m-content-bottom">
      <PageIntro
        eyebrow="Customer account"
        title="Your account, when it’s ready."
      >
        <p>
          Secure sign-in is being prepared. This preview does not accept
          passwords or provide access to real customer records.
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
