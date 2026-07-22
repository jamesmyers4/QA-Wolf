import { expect, type Page } from "@playwright/test";
import { HNNewestPage } from "../pages/HNNewestPage";
import { withBackoff } from "./withBackoff";
import type { ArticleRecord } from "./sortAnalysis";

class RateLimitError extends Error {
  constructor() {
    super("Hacker News served its rate-limit page ('Sorry')");
    this.name = "RateLimitError";
  }
}

async function settleRateLimit(page: Page): Promise<void> {
  let blocked = false;
  await withBackoff(
    async () => {
      if (blocked) await page.reload();
      const bodyText = await page.locator("body").innerText();
      if (bodyText.includes("Sorry")) {
        blocked = true;
        throw new RateLimitError();
      }
    },
    (err) => err instanceof RateLimitError,
  );
}

export async function getArticleRecords(
  page: Page,
  count = 100,
): Promise<ArticleRecord[]> {
  const hn = new HNNewestPage(page);
  const records: ArticleRecord[] = [];
  const firstRow = page.locator("tr.athing").first();
  await settleRateLimit(page);
  await expect(firstRow).toBeVisible();
  while (records.length < count) {
    const stories = hn.getStories();
    for (const story of stories) {
      if (records.length >= count) break;
      const rank = records.length + 1;
      const idAttr = await story.getId();
      if (!idAttr) throw new Error(`Missing story id at rank ${rank}`);
      const title = await story.getTitle();
      const ageTitle = await story.age.getAttribute("title");
      if (!ageTitle)
        throw new Error(`Missing timestamp for "${title}" at rank ${rank}`);
      const [isoTimestamp, unixPart] = ageTitle.split(" ");
      const unixTime = unixPart
        ? Number(unixPart)
        : Math.floor(new Date(`${isoTimestamp}Z`).getTime() / 1000);
      if (!Number.isFinite(unixTime))
        throw new Error(
          `Unparseable timestamp "${ageTitle}" for "${title}" at rank ${rank}`,
        );
      records.push({ rank, id: Number(idAttr), title, isoTimestamp, unixTime });
    }
    if (records.length < count) {
      const previousId = await firstRow.getAttribute("id");
      if (!previousId)
        throw new Error(
          `Missing story id on first row after rank ${records.length}`,
        );
      await hn.clickMore();
      await settleRateLimit(page);
      await expect(firstRow).not.toHaveAttribute("id", previousId);
    }
  }
  return records;
}
