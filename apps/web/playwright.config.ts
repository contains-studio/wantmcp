import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the dev server and the in-process mock API (API_BASE_URL=mock, the
 * default in .dev.vars.example). The server starts fresh for every run, so the mock's seed data is
 * clean. Locally the installed Chrome is used; CI installs Playwright's Chromium.
 */
const PORT = 5190;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: process.env.CI ? undefined : "chrome" } },
    { name: "phone", use: { ...devices["Pixel 7"], channel: process.env.CI ? undefined : "chrome" }, grep: /@phone/ },
  ],
  webServer: {
    command: `node scripts/ensure-dev-vars.mjs && node node_modules/@react-router/dev/bin.cjs dev --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
