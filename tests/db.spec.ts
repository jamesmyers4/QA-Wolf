import { test, expect } from "@playwright/test";
import { join } from "path";
import type { DatabaseSync } from "node:sqlite";
import { HNNewestPage } from "../pages/HNNewestPage";
import { getArticleRecords } from "../helpers/getArticleRecords";
import { getApiRecords } from "../helpers/getApiRecords";
import { createMirrorDb, ingestUiStories, ingestApiStories } from "../db/ingest";
import {
  findRankOrderViolations,
  formatRankOrderViolations,
  findDuplicateIds,
  findDataQualityIssues,
  formatDataQualityIssues,
  getLayerOverlap,
  findCrossLayerInversions,
  formatCrossLayerInversions,
} from "../db/queries";

const DB_PATH = join(__dirname, "..", "artifacts", "hn-mirror.db");
const MIN_SHARED_STORIES = 80;

let db: DatabaseSync;

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  const hn = new HNNewestPage(page);
  await hn.goto();
  const scrape = await getArticleRecords(page, 100);
  await page.close();
  const apiRecords = await getApiRecords(100);
  db = createMirrorDb(DB_PATH);
  ingestUiStories(db, scrape.records);
  ingestApiStories(db, apiRecords);
});

test.afterAll(() => {
  db?.close();
});

test("mirror db: API stories are stored newest to oldest", () => {
  const violations = findRankOrderViolations(db, "api_rank");
  expect(
    violations.length,
    formatRankOrderViolations("api_rank", violations),
  ).toBe(0);
});

test("mirror db: UI stories are stored newest to oldest", () => {
  const violations = findRankOrderViolations(db, "ui_rank");
  expect(
    violations.length,
    formatRankOrderViolations("ui_rank", violations),
  ).toBe(0);
});

test("mirror db: no story id appears twice", () => {
  const duplicates = findDuplicateIds(db);
  expect(
    duplicates.length,
    `${duplicates.length} story ids appear more than once in the mirror: ${duplicates.map((d) => `${d.id} (${d.occurrences}x)`).join(", ")}`,
  ).toBe(0);
});

test("mirror db: every story has a valid timestamp and title", () => {
  const issues = findDataQualityIssues(db, Math.floor(Date.now() / 1000));
  expect(issues.length, formatDataQualityIssues(issues)).toBe(0);
});

test("mirror db: UI and API layers agree on the stories and their order", () => {
  const overlap = getLayerOverlap(db);
  expect(
    overlap.sharedCount,
    `Only ${overlap.sharedCount} of ${overlap.uiCount} UI stories were also in the API's newest 100 (expected at least ${MIN_SHARED_STORIES}) — /newest moves between the two fetches, but an overlap this low suggests the layers looked at different data`,
  ).toBeGreaterThanOrEqual(MIN_SHARED_STORIES);
  const inversions = findCrossLayerInversions(db);
  expect(inversions.length, formatCrossLayerInversions(inversions)).toBe(0);
});
