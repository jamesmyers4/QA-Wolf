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
