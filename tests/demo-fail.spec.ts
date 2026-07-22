import { test, expect } from "@playwright/test";
import {
  analyzeSortOrder,
  formatViolationReport,
  type ArticleRecord,
} from "../helpers/sortAnalysis";

function record(
  rank: number,
  id: number,
  title: string,
  isoTimestamp: string,
): ArticleRecord {
  return {
    rank,
    id,
    title,
    isoTimestamp,
    unixTime: Math.floor(Date.parse(`${isoTimestamp}Z`) / 1000),
  };
}

const shuffledFixture: ArticleRecord[] = [
  record(1, 44710001, "Show HN: I built a keyboard for my left hand only", "2026-07-21T14:12:44"),
  record(2, 44710002, "Postgres 19 beta release notes", "2026-07-21T14:11:03"),
  record(3, 44710003, "The forgotten history of the fax machine", "2026-07-21T14:09:27"),
  record(4, 44710004, "Why our startup moved back to bare metal", "2026-07-21T14:11:01"),
  record(5, 44710005, "A gentle introduction to B-tree internals", "2026-07-21T14:08:12"),
  record(6, 44710006, "Ask HN: Best way to learn systems programming in 2026?", "2026-07-21T14:06:55"),
  record(7, 44710007, "Rust in the Linux kernel: year three retrospective", "2026-07-21T14:05:40"),
  record(8, 44710008, "CSS container queries changed how I build layouts", "2026-07-21T14:08:47"),
  record(9, 44710009, "The economics of running a solo SaaS in 2026", "2026-07-21T14:03:29"),
  record(10, 44710010, "Understanding TCP slow start with animations", "2026-07-21T14:02:58"),
];

test("demo: shuffled fixture produces client-readable sort diagnostics", async ({}, testInfo) => {
  const analysis = analyzeSortOrder(shuffledFixture);
  await testInfo.attach("article-records.json", {
    body: JSON.stringify(shuffledFixture, null, 2),
    contentType: "application/json",
  });
  await testInfo.attach("sort-analysis.json", {
    body: JSON.stringify(analysis, null, 2),
    contentType: "application/json",
  });
  expect(analysis.violations, formatViolationReport(analysis)).toEqual([]);
});
