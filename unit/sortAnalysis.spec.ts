import { describe, expect, it } from "vitest";
import {
  analyzeSortOrder,
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
