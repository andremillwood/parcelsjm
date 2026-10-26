import "server-only";
import { after } from "next/server";
import { emailConfig } from "./config";
import { dispatchEmails } from "./worker";
export function scheduleEmails() {
  if (!emailConfig()) return;
  after(async () => {
    try {
      await dispatchEmails();
    } catch {
      console.error(
        "Notification dispatch requires retry; operational record remains saved.",
      );
    }
  });
}
