import { PageIntro, ButtonLink } from "../../../components/marketing/ui";
export default function Page() {
  return (
    <div className="m-container m-content-bottom">
      <PageIntro eyebrow="Account access" title="Your account needs review.">
        Account access is unavailable. Contact the team before sending packages
        or attempting another registration.
      </PageIntro>
      <ButtonLink href="/contact">Contact Parcels JA</ButtonLink>
    </div>
  );
}
