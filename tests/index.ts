import { test, expect, request } from "@playwright/test";
import type { TestInfo } from "@playwright/test";
import { HNNewestPage } from "../pages/HNNewestPage";
import { getArticleRecords } from "../helpers/getArticleRecords";
import { withBackoff } from "../helpers/withBackoff";
import {
  analyzeSortOrder,
  formatViolationReport,
  type ArticleRecord,
  type SortAnalysis,
} from "../helpers/sortAnalysis";

const HN_API = "https://hacker-news.firebaseio.com/v0";

class PendingItemError extends Error {
  constructor(id: number, rank: number) {
    super(
      `HN API item ${id} (rank ${rank}) has no data yet — the story id is published in /newstories.json before the item record is readable`,
    );
    this.name = "PendingItemError";
  }
}

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
  const records = await getArticleRecords(page, 100);
  const analysis = analyzeSortOrder(records);
  await attachEvidence(testInfo, records, analysis);
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
  expect(analysis.violations, formatViolationReport(analysis)).toEqual([]);
});

test("HN API returns newest stories in descending order", async ({}, testInfo) => {
  const context = await request.newContext();
  const storiesRes = await context.get(`${HN_API}/newstories.json`);
  expect(
    storiesRes.ok(),
    `HN API request for /newstories.json failed with status ${storiesRes.status()} — this is an API availability problem, not a sort defect`,
  ).toBeTruthy();
  const storyIds: number[] = await storiesRes.json();
  const first100Ids = storyIds.slice(0, 100);
  const records: ArticleRecord[] = await Promise.all(
    first100Ids.map(async (id, index) =>
      withBackoff(
        async () => {
          const res = await context.get(`${HN_API}/item/${id}.json`);
          const item = (await res.json()) as {
            title?: string;
            time?: number;
          } | null;
          if (!item || typeof item.time !== "number")
            throw new PendingItemError(id, index + 1);
          return {
            rank: index + 1,
            id,
            title: item.title ?? "(untitled)",
            isoTimestamp: new Date(item.time * 1000).toISOString(),
            unixTime: item.time,
          };
        },
        (err) => err instanceof PendingItemError,
        { maxAttempts: 4, baseMs: 1000, maxMs: 8000 },
      ),
    ),
  );
  const analysis = analyzeSortOrder(records);
  await attachEvidence(testInfo, records, analysis);
  expect(
    records,
    `Expected 100 stories from the HN API but collected ${records.length}`,
  ).toHaveLength(100);
  expect(analysis.violations, formatViolationReport(analysis)).toEqual([]);
  await context.dispose();
});
