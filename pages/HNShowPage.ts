import type { Page } from "@playwright/test";
import { HNListPage } from "./HNListPage";

export class HNShowPage extends HNListPage {
  constructor(page: Page) {
    super(page, "https://news.ycombinator.com/show");
  }
}
