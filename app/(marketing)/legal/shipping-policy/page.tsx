import { PolicyPage } from "../../../../components/marketing/policy-page";
import { pageMetadata } from "../../../../lib/metadata";
export const metadata = pageMetadata(
  "Shipping policy",
  "Parcels JA shipping policy, effective 29 October 2026.",
  "/legal/shipping-policy",
);
export default function Policy() {
  return <PolicyPage kind="shipping-policy" />;
}
