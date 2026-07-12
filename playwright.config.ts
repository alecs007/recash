import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * "Light" E2E: smoke coverage of the public UI. Specs run against a real Next
 * dev server but stub API responses with page.route() where data is needed, so
 * no MongoDB / Redis / auth backend is required. Flows that need an
 * authenticated session (full create/claim/complete) are documented in
 * e2e/README.md for when a test-auth setup is added.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  // CI runs a cold dev server and (in CI) a fast-failing DB, so give pages room.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    navigationTimeout: 45_000,
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    // In CI, serve a production build (`next build` runs as a separate CI step):
    // no dev error overlay, and pages are prerendered so a missing DB doesn't
    // surface as a render error. Locally, use dev for convenience.
    command: process.env.CI
      ? `pnpm exec next start --port ${PORT}`
      : `pnpm exec next dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
