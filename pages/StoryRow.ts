import { type Locator } from "@playwright/test";

export class StoryRow {
  readonly titleLink: Locator;
  readonly rank: Locator;
  readonly author: Locator;
  readonly age: Locator;

  constructor(private readonly titleRow: Locator) {
    this.rank = titleRow.locator(".rank");
    this.titleLink = titleRow.locator(".titleline > a").first();
    const subtextRow = titleRow.locator("xpath=following-sibling::tr[1]");
    this.author = subtextRow.locator(".hnuser");
    this.age = subtextRow.locator(".age");
  }

  async getId(): Promise<string | null> {
    return this.titleRow.getAttribute("id");
  }

  async getTitle(): Promise<string> {
    return this.titleLink.innerText();
  }
}
