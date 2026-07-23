import { describe, expect, it } from "vitest";
import {
  compareToBaseline,
  extractFindings,
  formatA11yComparison,
  normalizeTarget,
  toBaselineEntries,
  type BaselineComparison,
  type RawAxeViolation,
} from "../helpers/a11yAnalysis";

function violation(
  id: string,
  targets: string[],
  impact = "serious",
): RawAxeViolation {
  return {
    id,
    impact,
    help: `${id} help text`,
    nodes: targets.map((target) => ({ target: [target] })),
  };
}

describe("normalizeTarget", () => {
  it("replaces attribute values so per-story hrefs, usernames, and timestamps cannot fake new violations", () => {
    expect(normalizeTarget('.subline > a[href="item?id=49004732"]')).toBe(
      '.subline > a[href="*"]',
    );
    expect(normalizeTarget('.hnuser[href="user?id=pg"]')).toBe(
      '.hnuser[href="*"]',
    );
    expect(normalizeTarget('span[title="2026-07-22T07:14:03 1784704443"]')).toBe(
      'span[title="*"]',
    );
    expect(normalizeTarget('.topsel > a[href$="newest"]')).toBe(
      '.topsel > a[href$="*"]',
    );
  });

  it("replaces numeric, prefixed, and CSS-escaped id selectors", () => {
    expect(normalizeTarget("#49004732 > td > a")).toBe("#* > td > a");
    expect(normalizeTarget("#\\34 9004736 > .title > .titleline")).toBe(
      "#* > .title > .titleline",
    );
    expect(normalizeTarget("#score_49005509")).toBe("#score_*");
  });

  it("replaces nth-child positions because which row shows a legacy finding is feed noise", () => {
    expect(normalizeTarget("tr:nth-child(83) > .subtext > .subline")).toBe(
      "tr:nth-child(*) > .subtext > .subline",
    );
  });

  it("leaves classes, elements, and combinators untouched", () => {
    expect(normalizeTarget("table > tbody > tr > td.title .sitebit.comhead")).toBe(
      "table > tbody > tr > td.title .sitebit.comhead",
    );
  });
});

describe("extractFindings", () => {
  it("collapses the same rule across many story rows into one finding", () => {
    const findings = extractFindings([
      violation("color-contrast", [
        '.subline > a[href="item?id=1001"]',
        '.subline > a[href="item?id=1002"]',
        '.subline > a[href="item?id=1003"]',
      ]),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].target).toBe('.subline > a[href="*"]');
  });

  it("keeps findings distinct when rule or normalized target differ", () => {
    const findings = extractFindings([
      violation("color-contrast", [".subline > a", ".pagetop > a"]),
      violation("link-name", [".subline > a"]),
    ]);
    expect(findings).toHaveLength(3);
  });
});

describe("compareToBaseline", () => {
  const baseline = toBaselineEntries(
    extractFindings([
      violation("color-contrast", ['.subline > a[href="item?id=1001"]']),
      violation("landmark-one-main", ["html"]),
    ]),
  );

  it("passes when today's findings are the same legacy findings on different stories", () => {
    const current = extractFindings([
      violation("color-contrast", ['.subline > a[href="item?id=9999"]']),
      violation("landmark-one-main", ["html"]),
    ]);
    const comparison = compareToBaseline(current, baseline);
    expect(comparison.newFindings).toEqual([]);
    expect(comparison.knownCount).toBe(2);
    expect(comparison.resolvedCount).toBe(0);
  });

  it("flags a rule that is not in the baseline as new", () => {
    const current = extractFindings([
      violation("landmark-one-main", ["html"]),
      violation("image-alt", ["img.hnlogo"]),
    ]);
    const comparison = compareToBaseline(current, baseline);
    expect(comparison.newFindings).toHaveLength(1);
    expect(comparison.newFindings[0].ruleId).toBe("image-alt");
    expect(comparison.resolvedCount).toBe(1);
  });

  it("flags a known rule at a new structural location as new", () => {
    const current = extractFindings([
      violation("color-contrast", [".pagetop > a"]),
    ]);
    const comparison = compareToBaseline(current, baseline);
    expect(comparison.newFindings).toHaveLength(1);
    expect(comparison.newFindings[0].target).toBe(".pagetop > a");
  });

  it("reports an empty scan against a populated baseline as all resolved", () => {
    const comparison = compareToBaseline([], baseline);
    expect(comparison.newFindings).toEqual([]);
    expect(comparison.knownCount).toBe(0);
    expect(comparison.resolvedCount).toBe(2);
  });
});

describe("formatA11yComparison", () => {
  function comparison(overrides: Partial<BaselineComparison>): BaselineComparison {
    return {
      newFindings: [],
      knownCount: 22,
      resolvedCount: 0,
      baselineCount: 22,
      ...overrides,
    };
  }

  it("uses singular grammar for one resolved baseline finding", () => {
    const summary = formatA11yComparison(comparison({ resolvedCount: 1 }));
    expect(summary).toContain("1 baseline finding no longer occurs");
  });

  it("uses plural grammar for multiple resolved baseline findings", () => {
    const summary = formatA11yComparison(comparison({ resolvedCount: 3 }));
    expect(summary).toContain("3 baseline findings no longer occur");
  });

  it("uses singular grammar for one known legacy finding and omits the resolved note at zero", () => {
    const summary = formatA11yComparison(comparison({ knownCount: 1 }));
    expect(summary).toContain("1 known legacy finding tracked");
    expect(summary).not.toContain("no longer occur");
  });

  it("uses singular grammar for one new violation and lists it with impact and target", () => {
    const finding = {
      ruleId: "image-alt",
      target: "img.hnlogo",
      impact: "critical",
      help: "Images must have alternative text",
    };
    const summary = formatA11yComparison(comparison({ newFindings: [finding] }));
    expect(summary).toContain("1 new accessibility violation on /newest");
    expect(summary).toContain(
      '1. New "image-alt" violation (impact: critical) at img.hnlogo — Images must have alternative text',
    );
  });
});
