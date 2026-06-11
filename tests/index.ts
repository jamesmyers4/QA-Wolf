import { test, expect, request } from "@playwright/test";
import { HNNewestPage } from "../pages/HNNewestPage";
import { getArticleTimestamps } from "../helpers/getArticleTimestamps";

const HN_API = "https://hacker-news.firebaseio.com/v0";

test("first 100 HN newest articles are sorted from newest to oldest", async ({
  page,
}) => {
  const hn = new HNNewestPage(page);
  await hn.goto();
  await page.waitForSelector("tr.athing");
  await expect(page).toHaveURL(/newest/);

  const timestamps = await getArticleTimestamps(page, 100);
  expect(timestamps).toHaveLength(100);

  for (let i = 1; i < timestamps.length; i++) {
    expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i - 1]);
  }
});

test("HN API returns newest stories in descending order", async () => {
  const context = await request.newContext();

  const storiesRes = await context.get(`${HN_API}/newstories.json`);
  expect(storiesRes.ok()).toBeTruthy();

  const storyIds: number[] = await storiesRes.json();
  const first100Ids = storyIds.slice(0, 100);

  const timestamps = await Promise.all(
    first100Ids.map(async (id) => {
      const res = await context.get(`${HN_API}/item/${id}.json`);
      const item = await res.json();
      return item.time as number;
    }),
  );

  expect(timestamps).toHaveLength(100);

  for (let i = 1; i < timestamps.length; i++) {
    expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i - 1]);
  }

  await context.dispose();
});
