import { type Locator } from "@playwright/test";

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

  async getId(): Promise<string | null> {
    return this.titleRow.getAttribute("id");
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
