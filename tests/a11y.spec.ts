import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { HNNewestPage } from "../pages/HNNewestPage";
import {
  compareToBaseline,
  extractFindings,
  formatA11yComparison,
  toBaselineEntries,
  type BaselineEntry,
} from "../helpers/a11yAnalysis";

test("newest page introduces no accessibility violations beyond the tracked baseline", async ({
  page,
}, testInfo) => {
  const hn = new HNNewestPage(page);
  await hn.goto();
  const results = await new AxeBuilder({ page }).analyze();
  const rootDir = testInfo.config.configFile
    ? dirname(testInfo.config.configFile)
    : process.cwd();
  const artifactsDir = join(rootDir, "artifacts");
  mkdirSync(artifactsDir, { recursive: true });
  writeFileSync(
    join(artifactsDir, "a11y-report.json"),
    JSON.stringify(results, null, 2),
  );
  const findings = extractFindings(results.violations);
  const baselinePath = join(rootDir, "a11y-baseline.json");
  if (!existsSync(baselinePath)) {
    writeFileSync(
      baselinePath,
      `${JSON.stringify(toBaselineEntries(findings), null, 2)}\n`,
    );
  }
  const baseline = JSON.parse(
    readFileSync(baselinePath, "utf-8"),
  ) as BaselineEntry[];
  const comparison = compareToBaseline(findings, baseline);
  await testInfo.attach("a11y-summary.json", {
    body: JSON.stringify(
      { ...comparison, summaryLine: formatA11yComparison(comparison) },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect(comparison.newFindings.length, formatA11yComparison(comparison)).toBe(
    0,
  );
});
