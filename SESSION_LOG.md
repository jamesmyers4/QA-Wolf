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

---

## 2026-07-21 — Session 1: Foundation & Hygiene

### Overview

Resubmission buildout begins. This session modernized the toolchain and removed every non-deterministic wait from the suite before new layers get built on top of it. Playwright upgraded 1.39 → 1.61.1, config rewritten as real TypeScript, strict tsconfig added, package.json filled out with scripts, and the rate-limit handling rebuilt around a bounded exponential backoff.

### Key Decisions

**Config rewritten with `defineConfig` import, boilerplate stripped**
The old config was `@ts-check` JavaScript-in-a-.ts-file using `require`. Rewrote with `import { defineConfig, devices }` and deleted every commented-out boilerplate block (mobile projects, branded browsers, webServer, dotenv). Kept the deliberate choices: workers 1 and fullyParallel false (serial runs keep HN request volume polite and output readable), retries on CI only, trace on-first-retry. Reporter is now `[["list"], ["html", { open: "never" }]]` with HTML output routed to `artifacts/html-report/` — a custom client-facing reporter replaces nothing here, it gets added alongside in Session 2.

**`withBackoff` helper with `backoffDelay` as a separate pure export**
Exponential backoff with 25% jitter and a hard attempt cap (default 5 attempts, 2s base, 30s ceiling). `backoffDelay` is exported separately and has zero Playwright dependency on purpose — the Session 5 unit layer will test the growth curve and cap directly. The `shouldRetry` predicate keeps retry policy at the call site: only errors the caller classifies as transient get retried, everything else throws immediately.

**Unbounded rate-limit loop replaced with bounded backoff**
The old helper looped `while (body includes "Sorry") { wait 8s; reload }` forever — a persistently blocked run would spin until the 180s test timeout with no explanation. New `settleRateLimit` throws a typed `RateLimitError` when HN serves its "Sorry" page and retries through `withBackoff`: delay first (cooling-off period), then reload, then re-check. After 5 attempts it fails loudly with `Exhausted 5 attempts: RateLimitError...` — a message that says exactly what happened instead of an opaque timeout.

**Deterministic pagination wait: first-row story ID change**
Removed both `waitForLoadState("networkidle")` calls and both bare `waitForTimeout` calls. After `clickMore()`, the helper captures the first `tr.athing` id before clicking and asserts `expect(firstRow).not.toHaveAttribute("id", previousId)` after. Chose the id-change signal over URL matching because it verifies the thing we actually need — new story rows are in the DOM — not just that navigation started. `expect` auto-retries until the new page renders, so there is no fixed sleep to tune and no networkidle flake on a page that fires late requests.

**Rate-limit check ordered before the id assertion**
After clickMore the helper runs `settleRateLimit` first, then the id-change assertion. If HN serves the "Sorry" page mid-pagination, the reload path restores the real page before we assert on story rows; asserting first would burn timeout waiting on rows that were never going to render.

**TypeScript 7.0.2 and `nodenext` module resolution**
`typescript@latest` now resolves to 7.x, which deprecates `moduleResolution: "node"`. Went with `module`/`moduleResolution` `nodenext` — matches how Playwright actually loads these files under Node and keeps the config warning-free on the current compiler.

**Scripts use `-g` title filters, not file paths**
`test:ui` and `test:api` filter by test title because both tests currently live in `tests/index.ts`. Session 4 splits the spec files; the scripts get repointed to paths then. Verified each filter matches exactly one test via `--list` (no extra HN traffic to check).

### Verification

`npm test` green: both tests passed in 6.5s total on Playwright 1.61.1, no rate-limiting encountered. `npm run typecheck` clean under strict mode. Zero comments in any .ts file, zero `networkidle`/`waitForTimeout` anywhere. `.DS_Store` was already untracked from a prior commit; `artifacts/` added to .gitignore. README typo fixes above the divider only ("conveneint", "minimzing").

---

## 2026-07-21 — Session 2: Diagnostics & Client-Facing Reporting

### Overview

This session makes the suite speak client language. Sort validation now runs through a pure analysis model (`helpers/sortAnalysis.ts`) that collects every violation with per-pair drift, both specs attach their raw evidence to the HTML report, a custom reporter writes a plain-English summary to `artifacts/results-summary.md`, and a `demo:fail` script shows the failure diagnostics on demand without waiting for HN to actually break.

### Key Decisions

**`analyzeSortOrder` is pure and collects every violation, not just the first**
Zero Playwright imports — the Session 5 unit layer will test it directly. The old loop of per-pair `toBeLessThanOrEqual` assertions stopped at the first bad pair and reported two bare numbers. The analysis walks all adjacent pairs, records each inversion with both full records and the drift in seconds, and summarizes the timestamp span. One out-of-order article and a wholesale shuffle are different conversations to have with a client; the report now distinguishes them. Newest/oldest are computed by scanning all records rather than trusting positions 0 and n-1, so the span stays correct even when the input is the thing that's broken. Ties are legal: two stories posted the same second are not a violation, so the comparison is strictly `>`.

**Violation detail IS the assertion message**
`expect(analysis.violations, formatViolationReport(analysis)).toEqual([])` — on failure the first thing in the output is `Sort violation at rank 4: "Why our startup moved back to bare metal" (2026-07-21T14:11:01) appears 94s newer than rank 3...`, followed by the full violation objects in the diff. The formatting functions live in `sortAnalysis.ts` so the specs, the reporter, and the demo all speak with one voice.

**Scraper upgraded to `getArticleRecords`, old helper deleted rather than wrapped**
Records now carry rank, story id (the `tr.athing` id attribute, via a new `StoryRow.getId()`), title, ISO timestamp, and unix time. The unix time comes from the second half of the `.age` title attribute (`"2026-07-21T14:03:11 1784642591"`) instead of re-parsing the ISO string — HN already did the conversion. A `getArticleTimestamps` wrapper wasn't kept: the only call site was the UI spec, which was being rewritten anyway, so the wrapper would have been dead code with a maintenance cost and no reader benefit. Story ids in every record also sets up Session 3's pagination-drift detection.

**Evidence attached via `testInfo.attach`, screenshot only on sort failure**
Both specs attach `article-records.json` and `sort-analysis.json`; the UI spec adds a full-page screenshot only when the analysis finds violations. Attaching before asserting matters — evidence must land even (especially) when the assertion throws. The attachments serve double duty: they appear in the HTML report for humans, and the custom reporter reads `sort-analysis.json` back from `result.attachments` to build its summary, which keeps the reporter decoupled from the specs — any future spec that attaches a `sort-analysis.json` gets client reporting for free.

**Custom reporter anchored to the config file directory, not `rootDir`**
First run wrote `results-summary.md` to `tests/artifacts/` — Playwright's `FullConfig.rootDir` resolves to `testDir`, not the config location. Switched to `dirname(config.configFile)` with a `process.cwd()` fallback. The reporter prints a bordered console block (pass: one line per check with count, UTC span, violation count; fail: each violation in client language, or a pointer to the HTML report when a test died before analysis) and writes the same content as markdown. It's registered alongside `list` and `html` — it complements the technical reporters, it doesn't replace them.

**`demo:fail` isolated via a separate Playwright project, honest exit code kept**
`tests/demo-fail.spec.ts` feeds a 10-record fixture with two engineered inversions (94s and 187s drift) through the same `analyzeSortOrder` → attach → assert path the real specs use. Isolation is by project (`chromium` has `testMatch: index.ts`, `demo-fail` has its own), because a config-level `testMatch` exclusion would make `playwright test tests/demo-fail.spec.ts` report "no tests found" — projects keep both runnable and mutually invisible. `npm test` now pins `--project=chromium`. The demo deliberately exits 1: masking the exit code with `|| exit 0` would misrepresent a failing run as passing, and the red exit is part of what the demo demonstrates.

**Firebase eventual-consistency race found and fixed**
First live run failed: story id 49000656 appeared in `/newstories.json` but `/item/49000656.json` still returned null — HN publishes the id list before the item record is readable. The old spec would have pushed `undefined` into the timestamp array and failed with a meaningless comparison error; the rewritten spec's strict item validation surfaced it immediately with the item id and rank. Fixed by wrapping each item fetch in `withBackoff` with a typed `PendingItemError` as the retryable condition (4 attempts, 1s base, 8s cap — the record populates within seconds). This is the diagnostics layer paying for itself on day one: better error messages turned a mystery flake into a one-line root cause.

### Verification

`npm run typecheck` clean. `npm test` green twice (before and after the reporter path fix), no rate-limiting encountered; console shows the client summary block and `artifacts/results-summary.md` is written with both checks at 100/100, 0 violations. `npm run demo:fail` prints the two engineered violations in client language and exits 1 as designed. Zero comments in any .ts file; `tsconfig.json` include extended to cover `reporters/`.
