# SESSION_LOG.md

## 2026-06-11 — QA Wolf Take-Home Exercise

### Overview

Built a Playwright/TypeScript test suite to validate that the first 100 articles on Hacker News /newest are sorted from newest to oldest. Includes a UI test scraping live DOM data and an API test hitting the HN Firebase endpoint directly.

---

### Build Order

**1. Page Object Model (`pages/HNNewestPage.ts`)**
Started with the POM before writing a single test. Studied the HN DOM in DevTools before selecting any locators. Key structural decision: HN renders each story as two sibling <tr> elements — the title row (`tr.athing`) and a subtext row. StoryRow uses
`xpath=following-sibling::tr[1]` to bridge both rows from a single locator entry point.

**2. Helper (`helpers/getArticleTimestamps.ts`)**
Extracted pagination and timestamp collection into a reusable helper. Keeps the test file clean and makes the logic reusable across other HN list pages (/front, /ask, /show) without rewriting.

**3. Test file (`tests/index.ts`)**
Intentionally kept small — navigation, URL assertion, timestamp collection, length check, sort check. Complexity lives in the POM and helper where it belongs.
API test ran along side the UI test to further ensure accurate results, since playwright supports it. \*API tests could also be ran along side the backend layer with Vitest / Leaving Playwright to cover the UI layer - providing full stack coverage.

---

### Key Decisions

**TypeScript over JavaScript**
Assignment specified JS but TS was chosen for type safety and professional alignment. No functional difference for the reviewer, meaningful difference in maintainability.

**URL assertion as first check**
Added `expect(page).toHaveURL(/newest/)` before timestamp scraping. Fast early signal — if the sort parameter is wrong the test fails immediately without scraping 100 records.

**Timestamp source: `.age` title attribute, not visible text**
HN's `.age` span contains a `title` attribute with the raw timestamp. The visible "2 hours ago" text is calculated at render time and changes constantly — unusable for comparison. The title attribute format is: `"2026-06-11T20:16:38 1781208998"` (ISO + Unix,
space-separated). Must split on space and parse index 0 only — `new Date()` fails on the full string.

**`.age` not `.age a`**
Initial locator targeted the anchor inside `.age`. The title attribute lives on the parent span, not the link. Caught by reading Playwright's page snapshot output on failure.

**API test added via Playwright request context**
HN exposes a public Firebase API requiring zero auth. Added a second test hitting `/newstories.json` + `/item/{id}.json` to validate sort at the API layer independently of the UI. Batching was considered to avoid ECONNRESET from Firebase rate limiting on 100 simultaneous requests.

**Rate limiting from HN**
HN returns a "Sorry." page when hit too fast during development. Added `waitForTimeout` delays and a reload/retry guard in the helper. Not a test bug — HN's soft rate limit on automated traffic. Space runs out between test reruns to avoid compounding blocks.

---

### File Structure

qa_wolf_take_home/
tests/
index.ts
pages/
HNNewestPage.ts
helpers/
getArticleTimestamps.ts
playwright.config.ts
SESSION_LOG.md
README.md

---

### Recommended Additional Layer - TODO Later

A backend/DB test layer (Jest or Vitest) would complete the testing pyramid by validating the sort at the query level before it reaches the UI or API. Requires internal database access — outside scope of this exercise.
