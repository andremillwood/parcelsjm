import { PolicyDraft } from "../../../../components/marketing/policy-draft";
import { pageMetadata } from "../../../../lib/metadata";
export const metadata = pageMetadata(
  "Terms — draft",
  "Draft policy for review. Approval pending; public signup remains disabled.",
  "/legal/terms",
);
export default function Policy() {
  return <PolicyDraft kind="terms" />;
}
