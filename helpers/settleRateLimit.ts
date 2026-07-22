import type { Page } from "@playwright/test";
import { withBackoff } from "./withBackoff";

export class RateLimitError extends Error {
  constructor() {
    super("Hacker News served its rate-limit page ('Sorry')");
    this.name = "RateLimitError";
  }
}

export async function settleRateLimit(page: Page): Promise<void> {
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
