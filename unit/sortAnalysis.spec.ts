import { describe, expect, it } from "vitest";
import {
  analyzeSortOrder,
  formatRecordsTable,
  formatReconciliation,
  formatViolation,
  formatViolationReport,
  reconcileRecencyOrder,
  type ArticleRecord,
} from "../helpers/sortAnalysis";

function record(rank: number, unixTime: number): ArticleRecord {
  return {
    rank,
    id: 44700000 + rank,
    title: `Story ${rank}`,
    isoTimestamp: new Date(unixTime * 1000).toISOString().slice(0, 19),
    unixTime,
  };
}

function descending(count: number, stepSeconds = 60): ArticleRecord[] {
  const start = 1753100000;
  return Array.from({ length: count }, (_, i) =>
    record(i + 1, start - i * stepSeconds),
  );
}

describe("analyzeSortOrder", () => {
  it("reports a correctly sorted list as sorted with zero violations", () => {
    const analysis = analyzeSortOrder(descending(100));
    expect(analysis.sorted).toBe(true);
    expect(analysis.violations).toEqual([]);
    expect(analysis.total).toBe(100);
  });

  it("catches a single adjacent swap at exactly the right rank with correct drift", () => {
    const articles = descending(10);
    const swapped = articles[4].unixTime;
    articles[4] = { ...articles[4], unixTime: articles[5].unixTime };
    articles[5] = { ...articles[5], unixTime: swapped };
    const analysis = analyzeSortOrder(articles);
    expect(analysis.sorted).toBe(false);
    expect(analysis.violations).toHaveLength(1);
    expect(analysis.violations[0].rank).toBe(6);
    expect(analysis.violations[0].driftSeconds).toBe(60);
    expect(analysis.violations[0].previous.rank).toBe(5);
    expect(analysis.violations[0].current.rank).toBe(6);
  });

  it("reports n-1 violations for a fully reversed list", () => {
    const reversed = descending(10)
      .reverse()
      .map((article, index) => ({ ...article, rank: index + 1 }));
    const analysis = analyzeSortOrder(reversed);
    expect(analysis.sorted).toBe(false);
    expect(analysis.violations).toHaveLength(9);
    expect(analysis.violations.map((violation) => violation.rank)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  it("treats equal timestamps as legal ties, not violations", () => {
    const tied = descending(5).map((article) => ({
      ...article,
      unixTime: 1753100000,
    }));
    const analysis = analyzeSortOrder(tied);
    expect(analysis.sorted).toBe(true);
    expect(analysis.violations).toEqual([]);
    expect(analysis.spanMinutes).toBe(0);
  });

  it("handles an empty list", () => {
    const analysis = analyzeSortOrder([]);
    expect(analysis.total).toBe(0);
    expect(analysis.sorted).toBe(true);
    expect(analysis.violations).toEqual([]);
    expect(analysis.spanMinutes).toBe(0);
  });

  it("handles a single-element list", () => {
    const analysis = analyzeSortOrder(descending(1));
    expect(analysis.total).toBe(1);
    expect(analysis.sorted).toBe(true);
    expect(analysis.violations).toEqual([]);
    expect(analysis.spanMinutes).toBe(0);
  });

  it("computes newest, oldest, and span from the timestamps themselves", () => {
    const articles = descending(5);
    const analysis = analyzeSortOrder(articles);
    expect(analysis.newestIso).toBe(articles[0].isoTimestamp);
    expect(analysis.oldestIso).toBe(articles[4].isoTimestamp);
    expect(analysis.spanMinutes).toBe(4);
  });
});

describe("formatRecordsTable", () => {
  it("renders one markdown row per record in rank order", () => {
    const table = formatRecordsTable(descending(3));
    const lines = table.split("\n");
    expect(lines[0]).toBe("| Rank | Title | Posted (UTC) |");
    expect(lines[1]).toBe("| --- | --- | --- |");
    expect(lines).toHaveLength(5);
    expect(lines[2]).toContain("| 1 | Story 1 |");
    expect(lines[4]).toContain("| 3 | Story 3 |");
  });

  it("escapes pipe characters in titles so they don't break the table", () => {
    const [record] = descending(1);
    const table = formatRecordsTable([{ ...record, title: "A | B" }]);
    expect(table).toContain("A \\| B");
  });

  it("returns just the header for an empty list", () => {
    expect(formatRecordsTable([]).split("\n")).toHaveLength(2);
  });
});

describe("reconcileRecencyOrder", () => {
  it("reports zero disagreements when both sources agree on order", () => {
    const a = descending(5);
    const b = descending(5);
    const reconciliation = reconcileRecencyOrder(a, b);
    expect(reconciliation.totalA).toBe(5);
    expect(reconciliation.totalB).toBe(5);
    expect(reconciliation.sharedCount).toBe(5);
    expect(reconciliation.disagreements).toEqual([]);
  });

  it("only compares stories present in both sources", () => {
    const a = descending(5);
    const b = descending(3);
    const reconciliation = reconcileRecencyOrder(a, b);
    expect(reconciliation.totalA).toBe(5);
    expect(reconciliation.totalB).toBe(3);
    expect(reconciliation.sharedCount).toBe(3);
  });

  it("flags a pair whose relative order differs between sources", () => {
    const a = descending(3);
    const b = [a[1], a[0], a[2]].map((article, index) => ({ ...article, rank: index + 1 }));
    const reconciliation = reconcileRecencyOrder(a, b);
    expect(reconciliation.disagreements).toHaveLength(1);
    expect(reconciliation.disagreements[0].first.id).toBe(a[0].id);
    expect(reconciliation.disagreements[0].second.id).toBe(a[1].id);
    expect(reconciliation.disagreements[0].firstRankInB).toBe(2);
    expect(reconciliation.disagreements[0].secondRankInB).toBe(1);
  });

  it("exempts a pair tied in source A from disagreement", () => {
    const a = descending(2).map((article) => ({ ...article, unixTime: 1753100000 }));
    const b = [a[1], a[0]].map((article, index) => ({ ...article, rank: index + 1 }));
    expect(reconcileRecencyOrder(a, b).disagreements).toEqual([]);
  });

  it("exempts a pair tied in source B from disagreement even though A differs", () => {
    const a = descending(2);
    const b = [a[1], a[0]].map((article, index) => ({
      ...article,
      rank: index + 1,
      unixTime: 1753100000,
    }));
    expect(reconcileRecencyOrder(a, b).disagreements).toEqual([]);
  });
});

describe("formatReconciliation", () => {
  it("reports full agreement by name", () => {
    const reconciliation = reconcileRecencyOrder(descending(4), descending(4));
    const formatted = formatReconciliation("API", "Algolia", reconciliation);
    expect(formatted).toBe(
      "API and Algolia agree on recency order for all 4 stories they both list (timestamp ties exempt)",
    );
  });

  it("lists each disagreement with both sources' ranks and titles", () => {
    const a = descending(2);
    const b = [a[1], a[0]].map((article, index) => ({ ...article, rank: index + 1 }));
    const reconciliation = reconcileRecencyOrder(a, b);
    const formatted = formatReconciliation("API", "Algolia", reconciliation);
    expect(formatted).toContain("1 story pairs are ordered differently by API and Algolia:");
    expect(formatted).toContain('1. API ranks "Story 1"');
    expect(formatted).toContain("but Algolia ranks them the other way around");
  });

  it("truncates to 10 disagreements and reports the remaining count", () => {
    const a = descending(30);
    const b = [...a].reverse().map((article, index) => ({ ...article, rank: index + 1 }));
    const reconciliation = reconcileRecencyOrder(a, b);
    const formatted = formatReconciliation("API", "Algolia", reconciliation);
    const lines = formatted.split("\n").filter((line) => /^\d+\./.test(line));
    expect(lines).toHaveLength(10);
    expect(formatted).toContain(`…and ${reconciliation.disagreements.length - 10} more pairs`);
  });
});

describe("formatViolation", () => {
  it("names both ranks, both titles, and the drift", () => {
    const articles = descending(2);
    const swapped = { ...articles[1], unixTime: articles[0].unixTime + 30 };
    const formatted = formatViolation({
      rank: swapped.rank,
      previous: articles[0],
      current: swapped,
      driftSeconds: 30,
    });
    expect(formatted).toBe(
      `Sort violation at rank 2: "Story 2" (posted ${swapped.isoTimestamp} UTC) appears 30s newer than rank 1: "Story 1" (posted ${articles[0].isoTimestamp} UTC)`,
    );
  });
});

describe("formatViolationReport", () => {
  it("reports a clean pass with the total count", () => {
    const analysis = analyzeSortOrder(descending(100));
    expect(formatViolationReport(analysis)).toBe("All 100 articles verified newest to oldest");
  });

  it("numbers each violation and includes the total counts", () => {
    const articles = descending(10);
    const swapped = articles[4].unixTime;
    articles[4] = { ...articles[4], unixTime: articles[5].unixTime };
    articles[5] = { ...articles[5], unixTime: swapped };
    const analysis = analyzeSortOrder(articles);
    const formatted = formatViolationReport(analysis);
    expect(formatted).toContain("1 of 10 articles appear out of order");
    expect(formatted).toContain("1. Sort violation at rank 6:");
  });
});
