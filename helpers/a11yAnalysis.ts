export interface RawAxeNode {
  target: unknown[];
}

export interface RawAxeViolation {
  id: string;
  impact?: string | null;
  help?: string;
  nodes: RawAxeNode[];
}

export interface A11yFinding {
  ruleId: string;
  target: string;
  impact: string;
  help: string;
}

export interface BaselineEntry {
  ruleId: string;
  target: string;
}

export interface BaselineComparison {
  newFindings: A11yFinding[];
  knownCount: number;
  resolvedCount: number;
  baselineCount: number;
}

function serializeTarget(target: unknown[]): string {
  return target
    .map((part) => (Array.isArray(part) ? part.join(" >> ") : String(part)))
    .join(" ");
}

export function normalizeTarget(selector: string): string {
  return selector
    .replace(/\[([-\w]+)([$^*~|]?=)"[^"]*"\]/g, '[$1$2"*"]')
    .replace(/:nth-child\(\d+\)/g, ":nth-child(*)")
    .replace(/#\\3\d \d*/g, "#*")
    .replace(/#([A-Za-z_-]*)\d+/g, "#$1*");
}

function findingKey(entry: BaselineEntry): string {
  return `${entry.ruleId}::${entry.target}`;
}

export function extractFindings(violations: RawAxeViolation[]): A11yFinding[] {
  const byKey = new Map<string, A11yFinding>();
  for (const violation of violations) {
    for (const node of violation.nodes) {
      const finding = {
        ruleId: violation.id,
        target: normalizeTarget(serializeTarget(node.target)),
        impact: violation.impact ?? "unknown",
        help: violation.help ?? violation.id,
      };
      const key = findingKey(finding);
      if (!byKey.has(key)) byKey.set(key, finding);
    }
  }
  return [...byKey.values()];
}

export function toBaselineEntries(findings: A11yFinding[]): BaselineEntry[] {
  return findings
    .map((finding) => ({ ruleId: finding.ruleId, target: finding.target }))
    .sort((a, b) => findingKey(a).localeCompare(findingKey(b)));
}

export function compareToBaseline(
  current: A11yFinding[],
  baseline: BaselineEntry[],
): BaselineComparison {
  const baselineKeys = new Set(baseline.map(findingKey));
  const currentKeys = new Set(current.map(findingKey));
  const newFindings = current.filter(
    (finding) => !baselineKeys.has(findingKey(finding)),
  );
  const resolvedCount = baseline.filter(
    (entry) => !currentKeys.has(findingKey(entry)),
  ).length;
  return {
    newFindings,
    knownCount: current.length - newFindings.length,
    resolvedCount,
    baselineCount: baseline.length,
  };
}

export function formatA11yComparison(comparison: BaselineComparison): string {
  if (comparison.newFindings.length === 0) {
    const resolvedNote =
      comparison.resolvedCount > 0
        ? `; ${comparison.resolvedCount} baseline ${comparison.resolvedCount === 1 ? "finding" : "findings"} no longer occur, so the baseline can be tightened`
        : "";
    return `Accessibility: 0 new violations vs baseline (${comparison.knownCount} known legacy ${comparison.knownCount === 1 ? "finding" : "findings"} tracked${resolvedNote})`;
  }
  const lines = comparison.newFindings.map(
    (finding, index) =>
      `${index + 1}. New "${finding.ruleId}" violation (impact: ${finding.impact}) at ${finding.target} — ${finding.help}`,
  );
  return `${comparison.newFindings.length} new accessibility ${comparison.newFindings.length === 1 ? "violation" : "violations"} on /newest not present in the tracked baseline (${comparison.baselineCount} known legacy findings are exempt):\n${lines.join("\n")}`;
}
