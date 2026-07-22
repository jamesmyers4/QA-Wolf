import { type Page, type Locator } from "@playwright/test";
import { StoryRow } from "./StoryRow";
import { settleRateLimit } from "../helpers/settleRateLimit";

export class HNListPage {
  readonly navLinks: Locator;
  readonly loginLink: Locator;
  readonly moreLink: Locator;

  constructor(
    private readonly page: Page,
    readonly url: string,
  ) {
    this.navLinks = page.locator("#hnmain .pagetop a");
    this.loginLink = page.locator('a[href^="login"]');
    this.moreLink = page.locator("a.morelink");
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await settleRateLimit(this.page);
    await this.page.waitForSelector("tr.athing");
  }

  getStories(count = 30): StoryRow[] {
    const titleRows = this.page.locator("tr.athing");
    return Array.from(
      { length: count },
      (_, i) => new StoryRow(titleRows.nth(i)),
    );
  }

  async getStoryCount(): Promise<number> {
    return this.page.locator("tr.athing").count();
  }

  getStoryByRank(rank: number): StoryRow {
    return new StoryRow(this.page.locator("tr.athing").nth(rank - 1));
  }

  async clickMore(): Promise<void> {
    await this.moreLink.click();
  }

  async isLoggedIn(): Promise<boolean> {
    return !(await this.loginLink.isVisible());
  }
}
