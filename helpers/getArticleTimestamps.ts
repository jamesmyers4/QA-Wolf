import { expect, type Page } from "@playwright/test";
import { HNNewestPage } from "../pages/HNNewestPage";
import { withBackoff } from "./withBackoff";

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

export async function getArticleTimestamps(
  page: Page,
  count = 100,
): Promise<number[]> {
  const hn = new HNNewestPage(page);
  const timestamps: number[] = [];
  const firstRow = page.locator("tr.athing").first();
  await settleRateLimit(page);
  await expect(firstRow).toBeVisible();
  while (timestamps.length < count) {
    const stories = hn.getStories();
    for (const story of stories) {
      if (timestamps.length >= count) break;
      const ageText = await story.age.getAttribute("title");
      if (!ageText)
        throw new Error(
          `Missing timestamp at position ${timestamps.length + 1}`,
        );
      const isoTimestamp = ageText.split(" ")[0];
      timestamps.push(new Date(isoTimestamp).getTime());
    }
    if (timestamps.length < count) {
      const previousId = await firstRow.getAttribute("id");
      if (!previousId)
        throw new Error(
          `Missing story id on first row at position ${timestamps.length + 1}`,
        );
      await hn.clickMore();
      await settleRateLimit(page);
      await expect(firstRow).not.toHaveAttribute("id", previousId);
    }
  }
  return timestamps;
}
