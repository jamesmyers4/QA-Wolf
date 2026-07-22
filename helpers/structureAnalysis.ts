export interface ListRowFacts {
  position: number;
  id: number | null;
  rankLabel: string | null;
  ageTitle: string | null;
  hasAuthor: boolean;
}

export interface StructureIssue {
  position: number;
  problem: string;
}

export function parseAgeTitle(ageTitle: string | null): number | null {
  if (!ageTitle) return null;
  const [isoPart, unixPart] = ageTitle.split(" ");
  const unixTime = unixPart
    ? Number(unixPart)
    : Math.floor(new Date(`${isoPart}Z`).getTime() / 1000);
  if (!Number.isFinite(unixTime) || unixTime <= 0) return null;
  return unixTime;
}

export function analyzeListStructure(
  rows: ListRowFacts[],
  requireAuthor: boolean,
): StructureIssue[] {
  const issues: StructureIssue[] = [];
  const seenIds = new Map<number, number>();
  for (const row of rows) {
    const expectedLabel = `${row.position}.`;
    if (row.rankLabel !== expectedLabel) {
      issues.push({
        position: row.position,
        problem: `rank label reads "${row.rankLabel ?? "missing"}" but the story sits at position ${row.position} — expected "${expectedLabel}"`,
      });
    }
    if (row.id === null || !Number.isFinite(row.id)) {
      issues.push({
        position: row.position,
        problem: "story row is missing its id attribute",
      });
    } else if (seenIds.has(row.id)) {
      issues.push({
        position: row.position,
        problem: `story id ${row.id} already appeared at position ${seenIds.get(row.id)} of the same page`,
      });
    } else {
      seenIds.set(row.id, row.position);
    }
    if (parseAgeTitle(row.ageTitle) === null) {
      issues.push({
        position: row.position,
        problem:
          row.ageTitle === null
            ? "story has no age cell timestamp"
            : `age cell timestamp "${row.ageTitle}" is unparseable`,
      });
    }
    if (requireAuthor && !row.hasAuthor) {
      issues.push({
        position: row.position,
        problem: "story has no author link",
      });
    }
  }
  return issues;
}

export function formatStructureIssues(
  pageName: string,
  issues: StructureIssue[],
): string {
  if (issues.length === 0) {
    return `All structural checks passed on ${pageName}`;
  }
  const lines = issues.map(
    (issue, index) =>
      `${index + 1}. Position ${issue.position} on ${pageName}: ${issue.problem}`,
  );
  return `${issues.length} structural problems found on ${pageName}:\n${lines.join("\n")}`;
}
