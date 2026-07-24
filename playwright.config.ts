import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["./reporters/clientSummaryReporter.ts"],
    ["html", { open: "never", outputFolder: "artifacts/html-report" }],
  ],
  timeout: 180000,
  use: {
    trace: "retain-on-failure",
    actionTimeout: 45000,
  },
  projects: [
    {
      name: "chromium",
      testMatch: [
        "**/ui.spec.ts",
        "**/api.spec.ts",
        "**/list-pages.spec.ts",
        "**/a11y.spec.ts",
      ],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "db",
      testMatch: ["**/db.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "demo-fail",
      testMatch: ["**/demo-fail.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
