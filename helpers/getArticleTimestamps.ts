import { Page } from "@playwright/test";
import { HNNewestPage } from "../pages/HNNewestPage";

export async function getArticleTimestamps(
  page: Page,
  count = 100,
): Promise<number[]> {
  const hn = new HNNewestPage(page);
  // HN paginates at 30 - clickMore() handles pagination, getStories()
  // scoped to current page only, loop accumulates across pages
  const timestamps: number[] = [];

  while (
    await page
      .locator("body")
      .innerText()
      .then((t) => t.includes("Sorry"))
  ) {
    await page.waitForTimeout(5000);
    await page.reload();
    await page.waitForLoadState("networkidle");
  }
  await page.waitForSelector("tr.athing");

  while (timestamps.length < count) {
    const stories = hn.getStories();
    for (const story of stories) {
      if (timestamps.length >= count) break;
      // title attribute format: "2026-06-11T20:16:38 1781208998" (ISO + Unix, space-separated)
      // split and take index 0 — new Date() fails on the full string
      const ageText = await story.age.getAttribute("title");
      if (!ageText)
        throw new Error(
          `Missing timestamp at position ${timestamps.length + 1}`,
        );
      // title attribute contains ISO timestamp + Unix timestamp separated by space
      // e.g. "2026-06-11T20:16:38 1781208998" - split and take first part only
      const isoTimestamp = ageText.split(" ")[0];
      timestamps.push(new Date(isoTimestamp).getTime());
    }
    if (timestamps.length < count) {
      await hn.clickMore();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(4000);
    }
  }

  return timestamps;
}
