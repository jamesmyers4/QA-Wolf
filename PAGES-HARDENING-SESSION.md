# PAGES-HARDENING-SESSION.md

## Source

Claude Code review of `pages/` against the live site (2026-07-22). Full review text is not reproduced here — this doc turns its findings into an executable task list. I independently re-verified every claim against the current repo (`git clone` + `grep`) before writing this, and expanded the dead-code list slightly beyond what the review caught (see Task 1).

## Objective

Trim dead POM surface, close two silent-failure paths (`settleRateLimit` false-positive, `getStories()` fabricating rows), and fix one style inconsistency — without touching selectors, which are already confirmed correct against production.

## Non-goals

- No new tests, no new pages, no new selectors.
- No `/jobs` page object — the review confirms omitting it is correct given `requireAuthor: false` handling elsewhere; this session just adds the one-sentence rationale the repo's own conventions ask for.
- No change to `titleLink`/`author`/`age`/`rank`/`getId`/`getTitle` — all confirmed live and in use.

---

## Task 1 — Trim dead POM surface (`pages/StoryRow.ts`, `pages/HNListPage.ts`)

**Problem.** `StoryRow.hide()` and `voteButton` are write-action surface in a suite whose own hard rule (`CLAUDE.md`) is strictly read-only traffic against live HN — never vote, hide, flag, or submit. Beyond that pair, several other members are defined and never called anywhere in `helpers/`, `tests/`, or `unit/`.

I grepped every symbol individually against the whole repo (excluding the two definition files) to confirm actual usage rather than trust the list at a glance. Result — two more dead members than the review named: `getAge()` and the `.commentsLink`/`.score` locators become fully orphaned once their only callers (`hide()`, `clickComments()`, `getScore()`) are removed.

**Confirmed dead (zero external references):**

- `StoryRow.sourceDomain`, `.voteButton`, `.score`, `.commentsLink`, `.hideLink`
- `StoryRow.getScore()`, `.clickTitle()`, `.clickComments()`, `.hide()`, `.getAge()`
- `HNListPage.navLinks`, `.loginLink`, `.getStoryByRank()`, `.isLoggedIn()`

**Confirmed live (keep as-is):** `titleLink`, `rank`, `author`, `age`, `getId()`, `getTitle()` on `StoryRow`; `url`, `moreLink`, `goto()`, `getStoryCount()`, `clickMore()` on `HNListPage`.

**Fix — `pages/StoryRow.ts`, full replacement:**

```typescript
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
```

**Fix — `pages/HNListPage.ts`:** see Task 3, which replaces this file in full (the trim and the `getStories()` clamp land in the same file, so there's no point editing it twice).

**Verify.** `npx tsc --noEmit` passes. `grep -rn "sourceDomain\|voteButton\|hideLink\|commentsLink\|getScore\|clickTitle\|clickComments\|\.hide(\|getAge(\|navLinks\|loginLink\|getStoryByRank\|isLoggedIn" pages/ helpers/ tests/ unit/` returns nothing.

---

## Task 2 — `settleRateLimit` false-positive on story titles

**Problem.** `helpers/settleRateLimit.ts` reads `body.innerText()` and checks `.includes("Sorry")`. Body text includes all 30 story titles, and `/newest` churns constantly — a submission titled _"Sorry, I quit my job"_ (a plausible HN title) trips the same branch as HN's real rate-limit page, forcing a reload/backoff loop that can fail the entire run with `RateLimitError` against a perfectly healthy page. This runs inside `goto()` for every single test, so it's the highest-leverage fix in this session.

**Why this shape of fix over an exact-sentence match.** The review's alternative (match HN's full block-page sentence instead of the word "Sorry") works today but is fragile to HN changing that copy. Checking for the _absence of `tr.athing` rows first_ is structurally reliable — a title like "Sorry, I quit my job" can only ever appear _inside_ a `tr.athing` row, so if any story rows are present, the page cannot be the block page, and body text never even gets inspected. The rate-limit page is confirmed to have zero `tr.athing` rows.

**Fix — `helpers/settleRateLimit.ts`, full replacement:**

```typescript
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
      const hasStories = (await page.locator("tr.athing").count()) > 0;
      if (hasStories) return;
      const bodyText = await page.locator("body").innerText();
      if (bodyText.includes("Sorry")) {
        blocked = true;
        throw new RateLimitError();
      }
    },
    (err) => err instanceof RateLimitError,
  );
}
```

**Verify.** Add a unit test (or extend `unit/withBackoff.spec.ts`'s pattern) asserting: a mock page with `tr.athing` rows present and body text containing "Sorry, I quit my job" does **not** throw `RateLimitError`. A mock page with zero `tr.athing` rows and "Sorry" in body text **does** throw.

---

## Task 3 — `getStories()` fabricates rows past the actual DOM count

**Problem.** `HNListPage.getStories(count)` blindly constructs `count` `StoryRow` instances without checking how many `tr.athing` rows actually exist. `helpers/getListRows.ts` guards this correctly with `Math.min(count, available)` — but `helpers/getArticleRecords.ts` (the core 100-article scrape) calls `hn.getStories()` bare. If HN ever serves a short page mid-pagination — exactly the moment it's degrading — the first interaction with a phantom row stalls for the full 45s `actionTimeout` and dies with a generic "waiting for locator" error, violating the repo's own rule that every failure path must produce diagnostics a client can read.

**Why fix it inside `getStories()` rather than at each call site.** Clamping in the method itself protects every current and future caller automatically, and lets `getListRows.ts` drop its now-redundant `getStoryCount()` call — net simpler at both call sites, not just safer.

**Fix — `pages/HNListPage.ts`, full replacement** (also carries the Task 1 trim and the Task 4 `goto()` fix, so this is the final state of the file):

```typescript
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
```

**Downstream edit — `helpers/getArticleRecords.ts` line 33.** `getStories()` is now async, so the bare call needs an `await`:

```typescript
const stories = await hn.getStories();
```

**Downstream edit — `helpers/getListRows.ts`, full replacement** (drops the now-redundant manual clamp since `getStories()` clamps internally):

```typescript
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

export async function gotoNextPage(
  page: Page,
  list: HNListPage,
): Promise<void> {
  const firstRow = page.locator("tr.athing").first();
  const previousId = await firstRow.getAttribute("id");
  if (!previousId)
    throw new Error("Missing story id on first row before pagination");
  await list.clickMore();
  await settleRateLimit(page);
  await expect(firstRow).not.toHaveAttribute("id", previousId);
}
```

**Verify.** `npx tsc --noEmit` passes (catches any other bare `.getStories(` call left un-awaited). `npm run test:list` and `npm run test:unit` stay green.

---

## Task 4 — Style nit: `goto()` should use a web-first assertion

**Problem.** `HNListPage.goto()` used `page.waitForSelector("tr.athing")` while every other wait in the repo uses `expect(...).toBeVisible()`, and `CLAUDE.md`'s own style rules call for the latter (no `waitForLoadState('networkidle')`, prefer web-first assertions and auto-waiting locators). It's the kind of inconsistency a Playwright-fluent reviewer greps for.

**Status.** Already folded into the Task 3 replacement of `pages/HNListPage.ts` above — no separate edit needed. Listed here only so it's checked off independently.

---

## Task 5 — Noticed elsewhere (small, independent, do in one pass) (CURRENT SESSION!!)

**5a. `npx playwright test` runs `demo-fail` and goes red on a healthy site.** `playwright.config.ts` has no default project filter, so a bare invocation runs `chromium`, `db`, and `demo-fail` together. `npm test` already scopes correctly (`--project=chromium --project=db`); the risk is a reviewer running Playwright out of habit. Add an opt-in guard to `tests/demo-fail.spec.ts`:

```typescript
test.skip(
  !process.env.RUN_DEMO_FAIL,
  "opt-in only — run via npm run demo:fail",
);
```

Place it as the first line inside the existing `test(...)` callback.

**5b. `package.json` has a redundant dependency.** `@playwright/test` (devDependencies) already includes the `playwright` library — the standalone `"playwright": "^1.61.1"` in `dependencies` is dead weight. Remove that one line from `dependencies`.

**5c. `a11y-baseline.json` fresh-clone risk.** `tests/a11y.spec.ts` self-seeds its baseline if the file is missing, so a clone without the committed baseline would trivially pass against a baseline it just wrote. The file is currently committed, so this is a **checklist item, not a code change**: confirm `a11y-baseline.json` survives the fresh-clone check in your submission checklist (`LOOM-OUTLINE.md`).

**5d. `/jobs` coverage rationale isn't written down anywhere.** The four subclasses (`/newest`, `/front`, `/ask`, `/show`) deliberately omit `/jobs` because job rows lack author/score/comments — which is also why `requireAuthor: false` exists on the other pages. Add one sentence to `README.md` (near the pages/ section) or a `SESSION_LOG.md` entry:

> `/jobs` has no page object — job rows carry no author, score, or comment count, so it doesn't fit the shared `StoryRow` shape the other four list pages use.

---

## Acceptance criteria (mirrors this repo's own Definition of Done)

- [ ] All five tasks above complete
- [ ] `npx tsc --noEmit` passes clean
- [ ] `npm run test:all` green (or rate-limit interference explicitly reported, per existing convention)
- [ ] `grep` sweep from Task 1's Verify step returns nothing
- [ ] SESSION_LOG.md entry appended (dated, decisions + reasoning, same voice as existing entries — do not rewrite prior entries)
- [ ] Final summary: what changed, file list, anything noticed but not touched, exact stop block

## Files touched (expected)

```
pages/StoryRow.ts        rewritten
pages/HNListPage.ts       rewritten
helpers/settleRateLimit.ts   rewritten
helpers/getListRows.ts       rewritten
helpers/getArticleRecords.ts one-line edit (line 33: add await)
tests/demo-fail.spec.ts      one-line edit (skip guard)
package.json                 one-line removal
README.md or SESSION_LOG.md  one sentence added
```
