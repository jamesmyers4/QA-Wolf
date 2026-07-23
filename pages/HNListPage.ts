import { type Page, type Locator, expect } from "@playwright/test";
import { StoryRow } from "./StoryRow";
import { settleRateLimit } from "../helpers/settleRateLimit";

export class HNListPage {
  readonly moreLink: Locator;

  constructor(
    private readonly page: Page,
    readonly url: string,
  ) {
    this.moreLink = page.locator("a.morelink");
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await settleRateLimit(this.page);
    await expect(this.page.locator("tr.athing").first()).toBeVisible();
  }

  async getStories(count = 30): Promise<StoryRow[]> {
    const available = await this.getStoryCount();
    const safeCount = Math.min(count, available);
    const titleRows = this.page.locator("tr.athing");
    return Array.from(
      { length: safeCount },
      (_, i) => new StoryRow(titleRows.nth(i)),
    );
  }

  async getStoryCount(): Promise<number> {
    return this.page.locator("tr.athing").count();
  }

  async clickMore(): Promise<void> {
    await this.moreLink.click();
  }
}
