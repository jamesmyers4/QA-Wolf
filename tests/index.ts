import { test, expect } from "@playwright/test";
import type { TestInfo } from "@playwright/test";
import { HNNewestPage } from "../pages/HNNewestPage";
import { getArticleRecords } from "../helpers/getArticleRecords";
import { getApiRecords } from "../helpers/getApiRecords";
import {
  analyzeSortOrder,
  formatViolationReport,
  type ArticleRecord,
  type SortAnalysis,
} from "../helpers/sortAnalysis";

async function attachEvidence(
  testInfo: TestInfo,
  records: ArticleRecord[],
  analysis: SortAnalysis,
): Promise<void> {
  await testInfo.attach("article-records.json", {
    body: JSON.stringify(records, null, 2),
    contentType: "application/json",
  });
  await testInfo.attach("sort-analysis.json", {
    body: JSON.stringify(analysis, null, 2),
    contentType: "application/json",
  });
}

test("first 100 HN newest articles are sorted from newest to oldest", async ({
  page,
}, testInfo) => {
  const hn = new HNNewestPage(page);
  await hn.goto();
  await expect(page).toHaveURL(/newest/);
  const { records, driftEvents } = await getArticleRecords(page, 100);
  const analysis = analyzeSortOrder(records);
  await attachEvidence(testInfo, records, analysis);
  await testInfo.attach("pagination-drift.json", {
    body: JSON.stringify(driftEvents, null, 2),
    contentType: "application/json",
  });
  if (!analysis.sorted) {
    await testInfo.attach("newest-page.png", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  }
  expect(
    records,
    `Expected 100 articles from /newest but collected ${records.length}`,
  ).toHaveLength(100);
  expect(analysis.violations.length, formatViolationReport(analysis)).toBe(0);
});

test("HN API returns newest stories in descending order", async ({}, testInfo) => {
  const records = await getApiRecords(100);
  const analysis = analyzeSortOrder(records);
  await attachEvidence(testInfo, records, analysis);
  expect(
    records,
    `Expected 100 stories from the HN API but collected ${records.length}`,
  ).toHaveLength(100);
  expect(analysis.violations.length, formatViolationReport(analysis)).toBe(0);
});
