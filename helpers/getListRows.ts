import { expect, type Page } from "@playwright/test";
import type { HNListPage } from "../pages/HNListPage";
import { settleRateLimit } from "./settleRateLimit";
import type { ListRowFacts } from "./structureAnalysis";

export async function getListRows(
  page: Page,
  list: HNListPage,
  count = 30,
  startPosition = 1,
): Promise<ListRowFacts[]> {
  await settleRateLimit(page);
  await expect(page.locator("tr.athing").first()).toBeVisible();
  const stories = await list.getStories(count);
  const rows: ListRowFacts[] = [];
  for (const [index, story] of stories.entries()) {
    const idAttr = await story.getId();
    const rankLabel = (await story.rank.count())
      ? await story.rank.innerText()
      : null;
    const ageTitle = (await story.age.count())
      ? await story.age.getAttribute("title")
      : null;
    const hasAuthor = (await story.author.count()) > 0;
    rows.push({
      position: startPosition + index,
      id: idAttr === null ? null : Number(idAttr),
      rankLabel,
      ageTitle,
      hasAuthor,
    });
  }
  return rows;
}

export async function gotoNextPage(page: Page, list: HNListPage): Promise<void> {
  const firstRow = page.locator("tr.athing").first();
  const previousId = await firstRow.getAttribute("id");
  if (!previousId)
    throw new Error("Missing story id on first row before pagination");
  await list.clickMore();
  await settleRateLimit(page);
  await expect(firstRow).not.toHaveAttribute("id", previousId);
}
