import Image from "next/image";
import {
  PageIntro,
  Notice,
  ButtonLink,
} from "../../../components/marketing/ui";
import { LeadForm } from "../../../components/marketing/lead-form";
import { leadsAvailable } from "../../../lib/leads/config";
import { pageMetadata } from "../../../lib/metadata";
export const dynamic = "force-dynamic";
export const metadata = pageMetadata(
  "Business shipping",
  "Share your import volume and document needs with Parcels JA. Business pricing and arrangements require review.",
  "/business",
);
export default function Business() {
  return (
    <div className="m-container m-content-bottom">
      <div className="m-business-intro">
        <PageIntro
          eyebrow="For resellers & regular importers"
          title="Built around the way you buy."
        >
          <p>
            More orders mean more details to manage. Tell us about your volume,
            products and shipping needs so the right arrangements can be
            reviewed.
          </p>
        </PageIntro>
        <figure className="m-lifestyle">
          <div className="m-lifestyle-frame">
            <Image
              src="/marketing/small-business-jamaica.webp"
              alt="Illustrative scene of a Jamaican small-business owner checking a purchase in his studio"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 50vw"
            />
          </div>
        </figure>
      </div>
      <div className="m-split">
        <div>
          <h2>Start with your needs.</h2>
          <p className="m-prose">
            Your business account brings packages and their documents into one
            customer view. Special pricing, volume arrangements and service
            availability must be approved before booking.
          </p>
          <Notice>
            Business pricing and service arrangements are confirmed individually
            before booking.
          </Notice>
          <ButtonLink href="/register?type=business" secondary>
            Create a business account
          </ButtonLink>
        </div>
        <LeadForm kind="business" available={leadsAvailable()} />
      </div>
    </div>
  );
}
