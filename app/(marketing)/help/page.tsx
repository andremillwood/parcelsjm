import Link from "next/link";
import { PageIntro, ButtonLink } from "../../../components/marketing/ui";
import { FAQ } from "../../../components/marketing/content";
import { pageMetadata } from "../../../lib/metadata";
export const metadata = pageMetadata(
  "Help & FAQs",
  "Clear answers about account activation, rates, documents and the planned Parcels JA experience.",
  "/help",
);
export default function Help() {
  return (
    <div className="m-container m-content-bottom">
      <PageIntro
        eyebrow="Help centre"
        title="A clearer answer, before you ship."
      >
        <p>
          What you can explore today, what is coming next, and what still needs
          to be confirmed.
        </p>
      </PageIntro>
      <div className="m-split">
        <div>
          <h2>Start here.</h2>
          <p className="m-prose">
            New to the process? Our{" "}
            <Link className="m-text-link" href="/how-it-works">
              How it works guide
            </Link>{" "}
            walks through the planned journey.
          </p>
          <ButtonLink href="/contact" secondary>
            Ask a question
          </ButtonLink>
        </div>
        <FAQ />
      </div>
    </div>
  );
}
