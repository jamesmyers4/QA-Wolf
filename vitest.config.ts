import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["unit/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "artifacts/coverage",
      include: [
        "helpers/sortAnalysis.ts",
        "helpers/withBackoff.ts",
        "helpers/a11yAnalysis.ts",
        "helpers/settleRateLimit.ts",
        "helpers/structureAnalysis.ts",
      ],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 70,
        lines: 60,
      },
    },
  },
});
