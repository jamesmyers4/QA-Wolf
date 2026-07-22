import type { DatabaseSync } from "node:sqlite";

export type RankLayer = "ui_rank" | "api_rank";

export interface RankOrderViolation {
  prevRank: number;
  prevTitle: string;
  prevIso: string;
  rank: number;
  title: string;
  iso: string;
  driftSeconds: number;
}

export interface DuplicateId {
  id: number;
  occurrences: number;
}

export interface DataQualityIssue {
  id: number;
  title: string;
  iso: string;
  issue: string;
}

export interface LayerOverlap {
  uiCount: number;
  apiCount: number;
  sharedCount: number;
}

export interface CrossLayerInversion {
  titleA: string;
  uiRankA: number;
  apiRankA: number;
  titleB: string;
  uiRankB: number;
  apiRankB: number;
}

const layerLabel: Record<RankLayer, string> = {
  ui_rank: "the /newest page",
  api_rank: "the HN API",
};

export function findRankOrderViolations(
  db: DatabaseSync,
  layer: RankLayer,
): RankOrderViolation[] {
  return db
    .prepare(
      `SELECT a.${layer} AS prevRank, a.title AS prevTitle, a.iso_time AS prevIso,
              b.${layer} AS rank, b.title AS title, b.iso_time AS iso,
              b.unix_time - a.unix_time AS driftSeconds
       FROM stories a JOIN stories b ON b.${layer} = a.${layer} + 1
       WHERE b.unix_time > a.unix_time
       ORDER BY b.${layer}`,
    )
    .all() as unknown as RankOrderViolation[];
}

export function formatRankOrderViolations(
  layer: RankLayer,
  violations: RankOrderViolation[],
): string {
  if (violations.length === 0)
    return `SQL check passed: every story from ${layerLabel[layer]} is older than or tied with the one ranked above it`;
  const lines = violations.map(
    (v, index) =>
      `${index + 1}. Sort violation at rank ${v.rank}: "${v.title}" (posted ${v.iso} UTC) appears ${v.driftSeconds}s newer than rank ${v.prevRank}: "${v.prevTitle}" (posted ${v.prevIso} UTC)`,
  );
  return `${violations.length} stories from ${layerLabel[layer]} are stored out of timestamp order in the mirror database:\n${lines.join("\n")}`;
}

export function findDuplicateIds(db: DatabaseSync): DuplicateId[] {
  return db
    .prepare(
      `SELECT id, COUNT(*) AS occurrences FROM stories GROUP BY id HAVING occurrences > 1`,
    )
    .all() as unknown as DuplicateId[];
}

export function findDataQualityIssues(
  db: DatabaseSync,
  nowUnix: number,
  clockSkewSeconds = 300,
): DataQualityIssue[] {
  const ceiling = nowUnix + clockSkewSeconds;
  return db
    .prepare(
      `SELECT id, title, iso_time AS iso,
              CASE
                WHEN unix_time <= 0 THEN 'missing or invalid timestamp'
                WHEN TRIM(title) = '' THEN 'empty title'
                WHEN unix_time > ? THEN 'timestamp is in the future'
              END AS issue
       FROM stories
       WHERE unix_time <= 0 OR TRIM(title) = '' OR unix_time > ?
       ORDER BY id`,
    )
    .all(ceiling, ceiling) as unknown as DataQualityIssue[];
}

export function formatDataQualityIssues(issues: DataQualityIssue[]): string {
  if (issues.length === 0)
    return "SQL check passed: every mirrored story has a valid timestamp and a non-empty title";
  const lines = issues.map(
    (issue, index) =>
      `${index + 1}. Story ${issue.id} "${issue.title}" (${issue.iso}): ${issue.issue}`,
  );
  return `${issues.length} mirrored stories have data quality problems:\n${lines.join("\n")}`;
}

export function getLayerOverlap(db: DatabaseSync): LayerOverlap {
  return db
    .prepare(
      `SELECT SUM(CASE WHEN ui_rank IS NOT NULL THEN 1 ELSE 0 END) AS uiCount,
              SUM(CASE WHEN api_rank IS NOT NULL THEN 1 ELSE 0 END) AS apiCount,
              SUM(CASE WHEN ui_rank IS NOT NULL AND api_rank IS NOT NULL THEN 1 ELSE 0 END) AS sharedCount
       FROM stories`,
    )
    .get() as unknown as LayerOverlap;
}

export function findCrossLayerInversions(
  db: DatabaseSync,
): CrossLayerInversion[] {
  return db
    .prepare(
      `SELECT a.title AS titleA, a.ui_rank AS uiRankA, a.api_rank AS apiRankA,
              b.title AS titleB, b.ui_rank AS uiRankB, b.api_rank AS apiRankB
       FROM stories a JOIN stories b
         ON a.ui_rank < b.ui_rank AND a.api_rank > b.api_rank AND a.unix_time <> b.unix_time
       ORDER BY a.ui_rank`,
    )
    .all() as unknown as CrossLayerInversion[];
}

export function formatCrossLayerInversions(
  inversions: CrossLayerInversion[],
): string {
  if (inversions.length === 0)
    return "SQL check passed: wherever a story appears in both layers, the /newest page and the HN API agree on relative order (timestamp ties exempt)";
  const lines = inversions.map(
    (inv, index) =>
      `${index + 1}. The /newest page ranks "${inv.titleA}" (UI rank ${inv.uiRankA}) above "${inv.titleB}" (UI rank ${inv.uiRankB}), but the HN API ranks them the other way around (API ranks ${inv.apiRankA} vs ${inv.apiRankB}) despite different timestamps`,
  );
  return `${inversions.length} story pairs are ordered differently by the /newest page and the HN API:\n${lines.join("\n")}`;
}
