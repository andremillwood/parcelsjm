import { PolicyPage } from "../../../../components/marketing/policy-page";
import { pageMetadata } from "../../../../lib/metadata";
export const metadata = pageMetadata(
  "Privacy policy",
  "Parcels JA privacy policy, effective 29 October 2026.",
  "/legal/privacy",
);
export default function Policy() {
  return <PolicyPage kind="privacy" />;
}
