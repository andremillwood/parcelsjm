import { PolicyDraft } from "../../../../components/marketing/policy-draft";
import { pageMetadata } from "../../../../lib/metadata";
export const metadata = pageMetadata(
  "Shipping Policy — draft",
  "Draft policy for review. Approval pending; public signup remains disabled.",
  "/legal/shipping-policy",
);
export default function Policy() {
  return <PolicyDraft kind="shipping-policy" />;
}
