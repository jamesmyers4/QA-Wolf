export interface ArticleRecord {
  rank: number;
  id: number;
  title: string;
  author?: string;
  isoTimestamp: string;
  unixTime: number;
}

export interface SortViolation {
  rank: number;
  previous: ArticleRecord;
  current: ArticleRecord;
  driftSeconds: number;
}

export interface SortAnalysis {
  total: number;
  sorted: boolean;
  violations: SortViolation[];
  newestIso: string;
  oldestIso: string;
  spanMinutes: number;
}

export function analyzeSortOrder(articles: ArticleRecord[]): SortAnalysis {
  const violations: SortViolation[] = [];
  for (let i = 1; i < articles.length; i++) {
    const previous = articles[i - 1];
    const current = articles[i];
    if (current.unixTime > previous.unixTime) {
      violations.push({
        rank: current.rank,
        previous,
        current,
        driftSeconds: current.unixTime - previous.unixTime,
      });
    }
  }
  if (articles.length === 0) {
    return {
      total: 0,
      sorted: true,
      violations: [],
      newestIso: "",
      oldestIso: "",
      spanMinutes: 0,
    };
  }
  let newest = articles[0];
  let oldest = articles[0];
  for (const article of articles) {
    if (article.unixTime > newest.unixTime) newest = article;
    if (article.unixTime < oldest.unixTime) oldest = article;
  }
  return {
    total: articles.length,
    sorted: violations.length === 0,
    violations,
    newestIso: newest.isoTimestamp,
    oldestIso: oldest.isoTimestamp,
    spanMinutes: Math.round((newest.unixTime - oldest.unixTime) / 60),
  };
}

export interface RecencyDisagreement {
  first: ArticleRecord;
  second: ArticleRecord;
  firstRankInB: number;
  secondRankInB: number;
}

export interface SourceReconciliation {
  totalA: number;
  totalB: number;
  sharedCount: number;
  disagreements: RecencyDisagreement[];
}

export function reconcileRecencyOrder(
  a: ArticleRecord[],
  b: ArticleRecord[],
): SourceReconciliation {
  const bById = new Map(b.map((record) => [record.id, record]));
  const shared = a.filter((record) => bById.has(record.id));
  const disagreements: RecencyDisagreement[] = [];
  for (let i = 0; i < shared.length; i++) {
    for (let j = i + 1; j < shared.length; j++) {
      const first = shared[i];
      const second = shared[j];
      const bFirst = bById.get(first.id);
      const bSecond = bById.get(second.id);
      if (!bFirst || !bSecond) continue;
      if (first.unixTime === second.unixTime) continue;
      if (bFirst.unixTime === bSecond.unixTime) continue;
      if (bFirst.rank > bSecond.rank) {
        disagreements.push({
          first,
          second,
          firstRankInB: bFirst.rank,
          secondRankInB: bSecond.rank,
        });
      }
    }
  }
  return {
    totalA: a.length,
    totalB: b.length,
    sharedCount: shared.length,
    disagreements,
  };
}

export function formatReconciliation(
  nameA: string,
  nameB: string,
  reconciliation: SourceReconciliation,
): string {
  if (reconciliation.disagreements.length === 0) {
    return `${nameA} and ${nameB} agree on recency order for all ${reconciliation.sharedCount} stories they both list (timestamp ties exempt)`;
  }
  const shown = reconciliation.disagreements.slice(0, 10);
  const lines = shown.map(
    (disagreement, index) =>
      `${index + 1}. ${nameA} ranks "${disagreement.first.title}" (posted ${disagreement.first.isoTimestamp} UTC, rank ${disagreement.first.rank}) above "${disagreement.second.title}" (posted ${disagreement.second.isoTimestamp} UTC, rank ${disagreement.second.rank}), but ${nameB} ranks them the other way around (${disagreement.firstRankInB} vs ${disagreement.secondRankInB}) despite different timestamps`,
  );
  const remaining = reconciliation.disagreements.length - shown.length;
  const tail = remaining > 0 ? `\n…and ${remaining} more pairs` : "";
  return `${reconciliation.disagreements.length} story pairs are ordered differently by ${nameA} and ${nameB}:\n${lines.join("\n")}${tail}`;
}

export function formatViolation(violation: SortViolation): string {
  return `Sort violation at rank ${violation.rank}: "${violation.current.title}" (posted ${violation.current.isoTimestamp} UTC) appears ${violation.driftSeconds}s newer than rank ${violation.previous.rank}: "${violation.previous.title}" (posted ${violation.previous.isoTimestamp} UTC)`;
}

export function formatViolationReport(analysis: SortAnalysis): string {
  if (analysis.sorted) {
    return `All ${analysis.total} articles verified newest to oldest`;
  }
  const lines = analysis.violations.map(
    (violation, index) => `${index + 1}. ${formatViolation(violation)}`,
  );
  return `${analysis.violations.length} of ${analysis.total} articles appear out of order (each listed article is newer than the one ranked above it):\n${lines.join("\n")}`;
}

export function formatRecordsTable(records: ArticleRecord[]): string {
  const header = "| Rank | Title | Posted (UTC) |\n| --- | --- | --- |";
  const rows = records.map(
    (record) =>
      `| ${record.rank} | ${record.title.replace(/\|/g, "\\|")} | ${record.isoTimestamp} |`,
  );
  return [header, ...rows].join("\n");
}
