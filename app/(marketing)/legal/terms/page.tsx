import { PolicyPage } from "../../../../components/marketing/policy-page";
import { pageMetadata } from "../../../../lib/metadata";
export const metadata = pageMetadata(
  "Terms of service",
  "Parcels JA terms of service, effective 29 October 2026.",
  "/legal/terms",
);
export default function Policy() {
  return <PolicyPage kind="terms" />;
}
