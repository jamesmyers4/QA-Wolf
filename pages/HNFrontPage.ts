import type { Page } from "@playwright/test";
import { HNListPage } from "./HNListPage";

export class HNFrontPage extends HNListPage {
  constructor(page: Page) {
    super(page, "https://news.ycombinator.com/front");
  }
}
