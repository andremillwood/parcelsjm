import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testMatch: "public-launch.spec.ts",
  use: {
    ...base.use,
    baseURL: "http://127.0.0.1:3101",
    launchOptions: { args: ["--disable-gpu"] },
  },
  webServer: [
    {
      command: "node tests/fixtures/auth-settings.mjs",
      url: "http://127.0.0.1:3102/auth/v1/settings",
      reuseExistingServer: false,
    },
    {
      command: "npm run start -- --hostname 127.0.0.1 --port 3101",
      url: "http://127.0.0.1:3101",
      reuseExistingServer: false,
      env: {
        AUTH_ENABLED: "true",
        ACCOUNT_POLICIES_APPROVED: "true",
        ACCOUNT_POLICY_VERSION: "2026-10-29",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:3102",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-public-key",
        LEAD_CAPTURE_ENABLED: "false",
      },
    },
  ],
});
