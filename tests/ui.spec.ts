import { test, expect } from "@playwright/test";
import { HNNewestPage } from "../pages/HNNewestPage";
import { getArticleRecords } from "../helpers/getArticleRecords";
import { attachEvidence } from "../helpers/attachEvidence";
import { analyzeSortOrder, formatViolationReport } from "../helpers/sortAnalysis";

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
