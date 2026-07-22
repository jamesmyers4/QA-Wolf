import { describe, expect, it } from "vitest";
import { parseAgeTitle } from "../helpers/structureAnalysis";

describe("parseAgeTitle", () => {
  it("prefers the unix part when the title has both ISO and unix", () => {
    expect(parseAgeTitle("2026-07-21T14:09:27 1753106967")).toBe(1753106967);
  });

  it("falls back to parsing the ISO part as UTC when no unix part exists", () => {
    const expected = Math.floor(Date.parse("2026-07-21T14:09:27Z") / 1000);
    expect(parseAgeTitle("2026-07-21T14:09:27")).toBe(expected);
  });

  it("returns null for a null title", () => {
    expect(parseAgeTitle(null)).toBeNull();
  });

  it("returns null for an empty title", () => {
    expect(parseAgeTitle("")).toBeNull();
  });

  it("returns null for human-readable text like 'just now'", () => {
    expect(parseAgeTitle("just now")).toBeNull();
  });

  it("returns null for a zero unix timestamp", () => {
    expect(parseAgeTitle("1970-01-01T00:00:00 0")).toBeNull();
  });

  it("returns null for a negative unix timestamp", () => {
    expect(parseAgeTitle("1969-12-31T23:59:00 -60")).toBeNull();
  });

  it("returns null for an unparseable ISO-only title", () => {
    expect(parseAgeTitle("yesterday")).toBeNull();
  });
});
