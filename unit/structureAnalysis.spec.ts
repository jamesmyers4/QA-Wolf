import { describe, expect, it } from "vitest";
import {
  analyzeListStructure,
  formatStructureIssues,
  parseAgeTitle,
  type ListRowFacts,
} from "../helpers/structureAnalysis";

function row(position: number, overrides: Partial<ListRowFacts> = {}): ListRowFacts {
  return {
    position,
    id: 44700000 + position,
    rankLabel: `${position}.`,
    ageTitle: "2026-07-24T12:00:00 1753358400",
    hasAuthor: true,
    ...overrides,
  };
}

describe("parseAgeTitle", () => {
  it("reads the unix seconds when present after the iso string", () => {
    expect(parseAgeTitle("2026-07-24T12:00:00 1753358400")).toBe(1753358400);
  });

  it("falls back to parsing the iso portion when unix seconds are absent", () => {
    expect(parseAgeTitle("2026-07-24T12:00:00")).toBe(
      Math.floor(new Date("2026-07-24T12:00:00Z").getTime() / 1000),
    );
  });

  it("returns null for a null title", () => {
    expect(parseAgeTitle(null)).toBeNull();
  });

  it("returns null for an unparseable title", () => {
    expect(parseAgeTitle("not a timestamp")).toBeNull();
  });

  it("returns null for a zero or negative unix time", () => {
    expect(parseAgeTitle("2026-07-24T12:00:00 0")).toBeNull();
    expect(parseAgeTitle("2026-07-24T12:00:00 -5")).toBeNull();
  });
});

describe("analyzeListStructure", () => {
  it("reports no issues for a clean set of rows", () => {
    const rows = [row(1), row(2), row(3)];
    expect(analyzeListStructure(rows, true)).toEqual([]);
  });

  it("flags a rank label that doesn't match the row's position", () => {
    const rows = [row(1, { rankLabel: "2." })];
    const issues = analyzeListStructure(rows, false);
    expect(issues).toHaveLength(1);
    expect(issues[0].position).toBe(1);
    expect(issues[0].problem).toContain('expected "1."');
  });

  it("flags a missing rank label distinctly from a wrong one", () => {
    const rows = [row(1, { rankLabel: null })];
    const issues = analyzeListStructure(rows, false);
    expect(issues[0].problem).toContain('reads "missing"');
  });

  it("flags a missing id", () => {
    const rows = [row(1, { id: null })];
    const issues = analyzeListStructure(rows, false);
    expect(issues.some((issue) => issue.problem.includes("missing its id"))).toBe(true);
  });

  it("flags a duplicate id and names the earlier position", () => {
    const rows = [row(1, { id: 555 }), row(2, { id: 555 })];
    const issues = analyzeListStructure(rows, false);
    const duplicate = issues.find((issue) => issue.position === 2);
    expect(duplicate?.problem).toBe("story id 555 already appeared at position 1 of the same page");
  });

  it("flags a missing age cell timestamp", () => {
    const rows = [row(1, { ageTitle: null })];
    const issues = analyzeListStructure(rows, false);
    expect(issues[0].problem).toBe("story has no age cell timestamp");
  });

  it("flags an unparseable age cell timestamp and includes the raw value", () => {
    const rows = [row(1, { ageTitle: "garbage" })];
    const issues = analyzeListStructure(rows, false);
    expect(issues[0].problem).toBe('age cell timestamp "garbage" is unparseable');
  });

  it("flags a missing author only when requireAuthor is true", () => {
    const rows = [row(1, { hasAuthor: false })];
    expect(analyzeListStructure(rows, false)).toEqual([]);
    const issues = analyzeListStructure(rows, true);
    expect(issues).toHaveLength(1);
    expect(issues[0].problem).toBe("story has no author link");
  });

  it("accumulates multiple issues for the same row", () => {
    const rows = [row(1, { rankLabel: "9.", id: null, ageTitle: null, hasAuthor: false })];
    const issues = analyzeListStructure(rows, true);
    expect(issues).toHaveLength(4);
    expect(issues.every((issue) => issue.position === 1)).toBe(true);
  });
});

describe("formatStructureIssues", () => {
  it("reports a clean pass by name", () => {
    expect(formatStructureIssues("newest", [])).toBe("All structural checks passed on newest");
  });

  it("numbers issues and includes the page name and position", () => {
    const issues = analyzeListStructure([row(1, { id: null })], false);
    const formatted = formatStructureIssues("newest", issues);
    expect(formatted).toContain("1 structural problems found on newest:");
    expect(formatted).toContain("1. Position 1 on newest:");
  });
});
