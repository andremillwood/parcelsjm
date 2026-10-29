import { RegistrationForm } from "../../../components/auth/registration-form";
import { registrationAvailable } from "../../../lib/auth/config";
import { PageIntro } from "../../../components/marketing/ui";
import { pageMetadata } from "../../../lib/metadata";
export const metadata = pageMetadata(
  "Get started",
  "Create your personal or business account with your address, TRN and delivery preference.",
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
        title="Create your Parcels JA account."
      >
        <p>
          Create your account, verify your email, and choose delivery or pickup.
        </p>
      </PageIntro>
      <RegistrationForm
        mode={registrationAvailable() ? "live" : "unavailable"}
        initialType={type === "business" ? "business" : "personal"}
      />
    </div>
  );
}
