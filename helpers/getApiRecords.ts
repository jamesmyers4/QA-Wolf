import { request, type APIRequestContext } from "@playwright/test";
import { isTransientNetworkError, withBackoff } from "./withBackoff";
import type { ArticleRecord } from "./sortAnalysis";

const HN_API = "https://hacker-news.firebaseio.com/v0";
const ITEM_FETCH_CONCURRENCY = 10;

export class PendingItemError extends Error {
  constructor(id: number, rank: number) {
    super(
      `HN API item ${id} (rank ${rank}) has no data yet — the story id is published in /newstories.json before the item record is readable`,
    );
    this.name = "PendingItemError";
  }
}

async function fetchItemRecord(
  context: APIRequestContext,
  id: number,
  rank: number,
): Promise<ArticleRecord> {
  return withBackoff(
    async () => {
      const res = await context.get(`${HN_API}/item/${id}.json`);
      const item = (await res.json()) as {
        title?: string;
        by?: string;
        time?: number;
      } | null;
      if (!item || typeof item.time !== "number")
        throw new PendingItemError(id, rank);
      return {
        rank,
        id,
        title: item.title ?? "(untitled)",
        author: item.by,
        isoTimestamp: new Date(item.time * 1000).toISOString().slice(0, 19),
        unixTime: item.time,
      };
    },
    (err) => err instanceof PendingItemError || isTransientNetworkError(err),
    { maxAttempts: 4, baseMs: 1000, maxMs: 8000 },
  );
}

export async function getApiRecords(count = 100): Promise<ArticleRecord[]> {
  const context = await request.newContext();
  try {
    const storiesRes = await context.get(`${HN_API}/newstories.json`);
    if (!storiesRes.ok())
      throw new Error(
        `HN API request for /newstories.json failed with status ${storiesRes.status()} — this is an API availability problem, not a sort defect`,
      );
    const storyIds: number[] = await storiesRes.json();
    const firstIds = storyIds.slice(0, count);
    const records: ArticleRecord[] = [];
    for (let start = 0; start < firstIds.length; start += ITEM_FETCH_CONCURRENCY) {
      const chunk = firstIds.slice(start, start + ITEM_FETCH_CONCURRENCY);
      const chunkRecords = await Promise.all(
        chunk.map((id, offset) => fetchItemRecord(context, id, start + offset + 1)),
      );
      records.push(...chunkRecords);
    }
    return records;
  } finally {
    await context.dispose();
  }
}
