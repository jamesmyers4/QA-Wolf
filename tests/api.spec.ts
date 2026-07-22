import { test, expect } from "@playwright/test";
import { getApiRecords } from "../helpers/getApiRecords";
import { getAlgoliaRecords } from "../helpers/getAlgoliaRecords";
import { attachEvidence } from "../helpers/attachEvidence";
import {
  analyzeSortOrder,
  formatViolationReport,
  reconcileRecencyOrder,
  formatReconciliation,
  type ArticleRecord,
} from "../helpers/sortAnalysis";

const MIN_SHARED_STORIES = 50;

let firebaseRecords: ArticleRecord[];

test.beforeAll(async () => {
  firebaseRecords = await getApiRecords(100);
});

test("HN API returns newest stories in descending order", async ({}, testInfo) => {
  const analysis = analyzeSortOrder(firebaseRecords);
  await attachEvidence(testInfo, firebaseRecords, analysis);
  expect(
    firebaseRecords,
    `Expected 100 stories from the HN API but collected ${firebaseRecords.length}`,
  ).toHaveLength(100);
  expect(analysis.violations.length, formatViolationReport(analysis)).toBe(0);
});

test("Firebase and Algolia APIs independently agree on recency order", async ({}, testInfo) => {
  const algoliaRecords = await getAlgoliaRecords(100);
  const reconciliation = reconcileRecencyOrder(firebaseRecords, algoliaRecords);
  await testInfo.attach("algolia-records.json", {
    body: JSON.stringify(algoliaRecords, null, 2),
    contentType: "application/json",
  });
  await testInfo.attach("reconciliation.json", {
    body: JSON.stringify(reconciliation, null, 2),
    contentType: "application/json",
  });
  expect(
    reconciliation.sharedCount,
    `Only ${reconciliation.sharedCount} of the Firebase API's 100 newest stories also appear in Algolia's 100 newest (expected at least ${MIN_SHARED_STORIES}) — Algolia indexes new stories with a short lag, but an overlap this low suggests the two oracles looked at different data`,
  ).toBeGreaterThanOrEqual(MIN_SHARED_STORIES);
  expect(
    reconciliation.disagreements.length,
    formatReconciliation(
      "the HN Firebase API",
      "the Algolia search API",
      reconciliation,
    ),
  ).toBe(0);
});
