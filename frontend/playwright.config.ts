import { defineConfig, devices } from "@playwright/test";

/**
 * Browser smoke (Admissions, Progress, Kutir Visits, Users, Kutirs). Expects Vite on :5173
 * and API on :8001 (Vite proxies /api → 8001). Does not start servers —
 * see docs/browser-smoke.md.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    headless: process.env.HEADED !== "1",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
