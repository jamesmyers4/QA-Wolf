import type { TestInfo } from "@playwright/test";
import type { ArticleRecord, SortAnalysis } from "./sortAnalysis";

export async function attachEvidence(
  testInfo: TestInfo,
  records: ArticleRecord[],
  analysis: SortAnalysis,
): Promise<void> {
  await testInfo.attach("article-records.json", {
    body: JSON.stringify(records, null, 2),
    contentType: "application/json",
  });
  await testInfo.attach("sort-analysis.json", {
    body: JSON.stringify(analysis, null, 2),
    contentType: "application/json",
  });
}
