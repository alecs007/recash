import { defineConfig } from "@playwright/test";
import { E2E_BASE_URL } from "./e2e-full/constants";

/**
 * Full-flow E2E against a fully isolated, ephemeral backend (in-memory MongoDB
 * replica set + in-process Redis). The backend and app server are started in
 * global-setup.ts and torn down afterwards — there is no `webServer` here.
 */
export default defineConfig({
  testDir: "./e2e-full",
  globalSetup: "./e2e-full/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
  },
});
