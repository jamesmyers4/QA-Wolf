import { request } from "@playwright/test";
import { withBackoff } from "./withBackoff";
import type { ArticleRecord } from "./sortAnalysis";

const ALGOLIA_URL =
  "https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=100";

export class AlgoliaUnavailableError extends Error {
  constructor(status: number) {
    super(
      `Algolia search API responded with status ${status} — an availability problem with the cross-check oracle, not a sort defect`,
    );
    this.name = "AlgoliaUnavailableError";
  }
}

interface AlgoliaHit {
  objectID: string;
  title?: string;
  author?: string;
  created_at: string;
  created_at_i: number;
}

export async function getAlgoliaRecords(count = 100): Promise<ArticleRecord[]> {
  const context = await request.newContext();
  try {
    return await withBackoff(
      async () => {
        const res = await context.get(ALGOLIA_URL);
        if (!res.ok()) throw new AlgoliaUnavailableError(res.status());
        const body = (await res.json()) as { hits: AlgoliaHit[] };
        return body.hits.slice(0, count).map((hit, index) => ({
          rank: index + 1,
          id: Number(hit.objectID),
          title: hit.title ?? "(untitled)",
          author: hit.author,
          isoTimestamp: hit.created_at.slice(0, 19),
          unixTime: hit.created_at_i,
        }));
      },
      (err) => err instanceof AlgoliaUnavailableError,
      { maxAttempts: 4, baseMs: 1000, maxMs: 8000 },
    );
  } finally {
    await context.dispose();
  }
}
