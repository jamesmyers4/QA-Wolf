import { test, expect } from "@playwright/test";
import type { Page, TestInfo } from "@playwright/test";
import { HNListPage } from "../pages/HNListPage";
import { HNNewestPage } from "../pages/HNNewestPage";
import { HNFrontPage } from "../pages/HNFrontPage";
import { HNAskPage } from "../pages/HNAskPage";
import { HNShowPage } from "../pages/HNShowPage";
import { getListRows, gotoNextPage } from "../helpers/getListRows";
import {
  analyzeListStructure,
  formatStructureIssues,
  type ListRowFacts,
} from "../helpers/structureAnalysis";

async function attachRows(
  testInfo: TestInfo,
  name: string,
  rows: ListRowFacts[],
): Promise<void> {
  await testInfo.attach(name, {
    body: JSON.stringify(rows, null, 2),
    contentType: "application/json",
  });
}

async function checkPageOneStructure(
  page: Page,
  list: HNListPage,
  pageName: string,
  testInfo: TestInfo,
): Promise<void> {
  await list.goto();
  const rows = await getListRows(page, list, 30);
  await attachRows(testInfo, "list-rows.json", rows);
  expect(
    rows.length,
    `Page one of ${pageName} rendered no story rows at all`,
  ).toBeGreaterThan(0);
  const issues = analyzeListStructure(rows, false);
  expect(issues.length, formatStructureIssues(pageName, issues)).toBe(0);
}

test("/ask page one serves well-formed, uniquely identified stories", async ({
  page,
}, testInfo) => {
  await checkPageOneStructure(page, new HNAskPage(page), "/ask", testInfo);
});

test("/show page one serves well-formed, uniquely identified stories", async ({
  page,
}, testInfo) => {
  await checkPageOneStructure(page, new HNShowPage(page), "/show", testInfo);
});

test("/front page one serves well-formed, uniquely identified stories", async ({
  page,
}, testInfo) => {
  await checkPageOneStructure(page, new HNFrontPage(page), "/front", testInfo);
});

test("/newest rank labels track position across pagination and every story is attributed", async ({
  page,
}, testInfo) => {
  const hn = new HNNewestPage(page);
  await hn.goto();
  const pageOne = await getListRows(page, hn, 30, 1);
  await gotoNextPage(page, hn);
  const pageTwo = await getListRows(page, hn, 30, 31);
  await attachRows(testInfo, "newest-page-one-rows.json", pageOne);
  await attachRows(testInfo, "newest-page-two-rows.json", pageTwo);
  expect(
    pageOne.length,
    `Expected 30 stories on page one of /newest but found ${pageOne.length}`,
  ).toBe(30);
  expect(
    pageTwo.length,
    `Expected 30 stories on page two of /newest but found ${pageTwo.length}`,
  ).toBe(30);
  const issues = [
    ...analyzeListStructure(pageOne, true),
    ...analyzeListStructure(pageTwo, true),
  ];
  expect(issues.length, formatStructureIssues("/newest", issues)).toBe(0);
});
