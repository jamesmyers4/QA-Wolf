import { request } from "@playwright/test";
import { withBackoff } from "./withBackoff";
import type { ArticleRecord } from "./sortAnalysis";

const HN_API = "https://hacker-news.firebaseio.com/v0";

export class PendingItemError extends Error {
  constructor(id: number, rank: number) {
    super(
      `HN API item ${id} (rank ${rank}) has no data yet — the story id is published in /newstories.json before the item record is readable`,
    );
    this.name = "PendingItemError";
  }
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
    return await Promise.all(
      firstIds.map(async (id, index) =>
        withBackoff(
          async () => {
            const res = await context.get(`${HN_API}/item/${id}.json`);
            const item = (await res.json()) as {
              title?: string;
              by?: string;
              time?: number;
            } | null;
            if (!item || typeof item.time !== "number")
              throw new PendingItemError(id, index + 1);
            return {
              rank: index + 1,
              id,
              title: item.title ?? "(untitled)",
              author: item.by,
              isoTimestamp: new Date(item.time * 1000).toISOString().slice(0, 19),
              unixTime: item.time,
            };
          },
          (err) => err instanceof PendingItemError,
          { maxAttempts: 4, baseMs: 1000, maxMs: 8000 },
        ),
      ),
    );
  } finally {
    await context.dispose();
  }
}
