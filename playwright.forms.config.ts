import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testDir: "./tests/forms",
  outputDir: "./test-results/forms",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/forms" }],
  ],
  projects: [390, 1440].map((width) => ({
    name: `forms-${width}`,
    use: { viewport: { width, height: 900 } },
  })),
  use: { ...base.use, baseURL: "http://127.0.0.1:3101" },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3101",
    url: "http://127.0.0.1:3101",
    reuseExistingServer: false,
    // Fictional values enable UI tests only. Requests are intercepted in-browser;
    // example.invalid cannot be a live provider. No real keys are loaded.
    env: {
      AUTH_ENABLED: "true",
      ACCOUNT_POLICIES_APPROVED: "true",
      ACCOUNT_POLICY_VERSION: "fictional-test-policy",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fictional-publishable-key",
      LEAD_CAPTURE_ENABLED: "true",
      LEAD_PRIVACY_APPROVED: "true",
      LEAD_PRIVACY_VERSION: "fictional-test-policy",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid",
      SUPABASE_SERVICE_ROLE_KEY: "fictional-key",
      RESEND_API_KEY: "fictional-key",
      RESEND_FROM_EMAIL: "sender@example.test",
      LEAD_NOTIFICATION_EMAIL: "staff@example.test",
      LEAD_RATE_LIMIT_SECRET: "fictional-test-secret-never-used-live",
    },
  },
});
