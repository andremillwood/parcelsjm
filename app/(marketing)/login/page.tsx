import { AuthForm } from "../../../components/auth/auth-form";
import { authAvailable } from "../../../lib/auth/config";
import { PageIntro } from "../../../components/marketing/ui";
import { pageMetadata } from "../../../lib/metadata";
export const dynamic = "force-dynamic";
export const metadata = pageMetadata(
  "Account access",
  "Secure access to your Parcels JA account.",
  "/login",
);
export default function Page() {
  return (
    <div className="m-container m-registration m-content-bottom">
      <PageIntro eyebrow="Your Parcels JA account" title="Welcome back.">
        Keep your packages, documents and next steps together.
      </PageIntro>
      <AuthForm mode="login" available={authAvailable()} />
    </div>
  );
}
