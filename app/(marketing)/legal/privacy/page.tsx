import { PolicyDraft } from "../../../../components/marketing/policy-draft";
import { pageMetadata } from "../../../../lib/metadata";
export const metadata = pageMetadata(
  "Privacy — draft",
  "Draft policy for review. Approval pending; public signup remains disabled.",
  "/legal/privacy",
);
export default function Policy() {
  return <PolicyDraft kind="privacy" />;
}
