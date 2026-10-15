import { RegistrationForm } from "../../../components/auth/registration-form";
import { registrationAvailable } from "../../../lib/auth/config";
import { PageIntro } from "../../../components/marketing/ui";
import { pageMetadata } from "../../../lib/metadata";
export const metadata = pageMetadata(
  "Get started",
  "Explore personal and business registration. Accounts and shipping address activation are not yet available.",
  "/register",
);
export default async function Register({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  return (
    <div className="m-container m-content-bottom m-registration">
      <PageIntro
        eyebrow="Your Parcels JA account"
        title="Start with a little clarity."
      >
        <p>
          Personal purchases or business imports. See what getting started will
          look like.
        </p>
      </PageIntro>
      <RegistrationForm
        mode={registrationAvailable() ? "live" : "preview"}
        initialType={type === "business" ? "business" : "personal"}
      />
    </div>
  );
}
