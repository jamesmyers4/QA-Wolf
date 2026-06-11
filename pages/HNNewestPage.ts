import { expect, type Page, type Locator } from "@playwright/test";

export class HNNewestPage {
  readonly url = "https://news.ycombinator.com/newest";
  readonly navLinks: Locator;
  readonly loginLink: Locator;
  readonly moreLink: Locator;

  constructor(private readonly page: Page) {
    this.navLinks = page.locator("#hnmain .pagetop a");
    this.loginLink = page.locator('a[href^="login"]');
    this.moreLink = page.locator("a.morelink");
  }

  async goto(): Promise<void> {
    await this.page.goto(this.url);
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
    return new StoryRow(this.page.locator(`tr.athing`).nth(rank - 1));
  }

  async clickMore(): Promise<void> {
    await this.moreLink.click();
  }

  async isLoggedIn(): Promise<boolean> {
    return !(await this.loginLink.isVisible());
  }
}

export class StoryRow {
  readonly titleLink: Locator;
  readonly sourceDomain: Locator;
  readonly voteButton: Locator;
  readonly rank: Locator;
  readonly score: Locator;
  readonly author: Locator;
  readonly age: Locator;
  readonly commentsLink: Locator;
  readonly hideLink: Locator;

  constructor(private readonly titleRow: Locator) {
    this.rank = titleRow.locator(".rank");
    this.voteButton = titleRow.locator(".votearrow");
    this.titleLink = titleRow.locator(".titleline > a").first();
    this.sourceDomain = titleRow.locator(".sitestr");

    const subtextRow = titleRow.locator("xpath=following-sibling::tr[1]");
    this.score = subtextRow.locator(".score");
    this.author = subtextRow.locator(".hnuser");
    this.age = subtextRow.locator(".age");
    this.commentsLink = subtextRow
      .locator("a")
      .filter({ hasText: /comment|discuss/i })
      .last();
    this.hideLink = subtextRow.locator('a[href^="hide"]');
  }

  async getAge(): Promise<string> {
    return this.age.innerText();
  }

  async getTitle(): Promise<string> {
    return this.titleLink.innerText();
  }

  async getScore(): Promise<number> {
    const text = await this.score.innerText();
    return parseInt(text);
  }

  async clickTitle(): Promise<void> {
    await this.titleLink.click();
  }

  async clickComments(): Promise<void> {
    await this.commentsLink.click();
  }

  async hide(): Promise<void> {
    await this.hideLink.click();
  }
}
