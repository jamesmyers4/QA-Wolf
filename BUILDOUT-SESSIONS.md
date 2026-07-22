# BUILDOUT-SESSIONS.md — QA-Wolf Resubmission Plan

Read CLAUDE.md first. Execute only the session Jimmy names. Stop when its acceptance criteria pass. Jimmy commits manually between sessions.

The narrative this buildout tells a reviewer: _"I treated a 100-article sort check the way I'd treat a client's production suite — full-pyramid coverage (UI, API, data layer, unit), client-readable reporting, deliberate resilience patterns, and documented reasoning for every decision."_

---

## Session 1 — Foundation & Hygiene

**Criteria mapping:** Technical ability. A QA submission with typos, a script-less package.json, and a stale dependency undercuts everything built on top of it.

**Tasks**

1. Upgrade `@playwright/test` and `playwright` to current stable. Run `npx playwright install chromium`. Verify the existing two tests still pass.
2. Rewrite `playwright.config.ts` as proper TypeScript: `import { defineConfig, devices } from "@playwright/test"`, `export default defineConfig({...})`. Remove `@ts-check` and the require pattern. Strip all commented-out boilerplate blocks (mobile projects, webServer, dotenv). Keep: workers 1, fullyParallel false, retries on CI, trace on-first-retry. Change reporter to `[["list"], ["html", { open: "never" }]]` for now (custom reporter arrives in Session 2). Route HTML report output under `artifacts/`.
3. Create `tsconfig.json` with strict mode if absent.
4. Fill out `package.json`: name/description/author, and scripts:
   - `test` → `playwright test`
   - `test:ui` → UI spec only
   - `test:api` → API spec only
   - `typecheck` → `tsc --noEmit`
5. Remove `.DS_Store` from the repo; add `.DS_Store` and `artifacts/` to `.gitignore`.
6. Create `helpers/withBackoff.ts` — exponential backoff with jitter and a hard attempt cap:

```ts
export interface BackoffOptions {
  maxAttempts: number;
  baseMs: number;
  maxMs: number;
}

export function backoffDelay(attempt: number, opts: BackoffOptions): number {
  const raw = Math.min(opts.baseMs * 2 ** attempt, opts.maxMs);
  const jitter = Math.random() * 0.25 * raw;
  return Math.round(raw + jitter);
}

export async function withBackoff<T>(
  fn: () => Promise<T>,
  shouldRetry: (err: unknown) => boolean,
  opts: BackoffOptions = { maxAttempts: 5, baseMs: 2000, maxMs: 30000 },
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!shouldRetry(err)) throw err;
      await new Promise((resolve) =>
        setTimeout(resolve, backoffDelay(attempt, opts)),
      );
    }
  }
  throw new Error(
    `Exhausted ${opts.maxAttempts} attempts: ${String(lastError)}`,
  );
}
```

`backoffDelay` is deliberately a separate pure export — the Session 5 unit layer tests it. 7. Refactor `helpers/getArticleTimestamps.ts`:

- Replace the unbounded `while ("Sorry")` reload loop with `withBackoff` (rate-limit detection = the retryable condition), so a persistently blocked run fails loudly with a clear message instead of looping forever.
- Remove `waitForLoadState("networkidle")` and both `waitForTimeout` calls. After `clickMore()`, wait deterministically: capture the first story ID before clicking, then `await expect(firstRow).not.toHaveAttribute("id", previousId)` or wait for `tr.athing` count via polling assertion. Choose the cleanest deterministic signal and document the choice in SESSION_LOG.
- Strip all inline comments per CLAUDE.md style rules (move their content into the SESSION_LOG entry).

8. Fix README typos above the divider only ("conveneint" → "convenient", "minimzing" → "minimizing"); full README rewrite waits for Session 6.

**Acceptance criteria**

- Both existing tests pass on current Playwright.
- `npm test`, `npm run typecheck` work.
- Zero `networkidle` / bare `waitForTimeout` outside `withBackoff`.
- No comments remain in any .ts file.

**STOP BLOCK:** "Session 1 complete. Review the diff, run `npm test` yourself, commit, then start a fresh Claude Code session for Session 2."

---

## Session 2 — Diagnostics & Client-Facing Reporting

**Criteria mapping:** Customer service orientation — QA Wolf's core product is telling non-technical clients what broke and why. This session makes the suite speak that language.

**Tasks**

1. Create `helpers/sortAnalysis.ts` with a pure, Playwright-free model:

```ts
export interface ArticleRecord {
  rank: number;
  id: number;
  title: string;
  isoTimestamp: string;
  unixTime: number;
}

export interface SortViolation {
  rank: number;
  previous: ArticleRecord;
  current: ArticleRecord;
  driftSeconds: number;
}

export interface SortAnalysis {
  total: number;
  sorted: boolean;
  violations: SortViolation[];
  newestIso: string;
  oldestIso: string;
  spanMinutes: number;
}

export function analyzeSortOrder(articles: ArticleRecord[]): SortAnalysis {}
```

Implement `analyzeSortOrder` to collect EVERY violation (not just the first), compute drift in seconds per violation, and summarize the timestamp span. 2. Upgrade the scraper: rename/extend `getArticleTimestamps` into `getArticleRecords(page, count)` returning `ArticleRecord[]` — pull rank, story ID (the `tr.athing` id attribute), and title alongside the timestamp. Keep a thin `getArticleTimestamps` wrapper if it keeps the diff readable, otherwise update call sites. 3. Rewrite the UI and API specs to assert through `analyzeSortOrder`. On failure, the assertion message must read like a client report, e.g. `Sort violation at rank 47: "Article title" (2026-07-21T14:03:11) appears 94s newer than rank 46`. Use `expect(analysis.violations, message).toEqual([])` so the violation detail IS the failure output. 4. Attach evidence via `testInfo.attach`: full `ArticleRecord[]` as JSON, the `SortAnalysis` as JSON, and a screenshot on UI failure. All artifacts land in the HTML report automatically. 5. Create `reporters/clientSummaryReporter.ts` implementing Playwright's `Reporter` interface: `onEnd` writes `artifacts/results-summary.md` and prints a plain-language console block — pass example: `✓ 100/100 articles on /newest verified newest → oldest (span 14:03 → 15:41 UTC, 0 violations)`; fail example lists each violation in client language. Register it in the config alongside list + html. 6. Add script `demo:fail` → runs a small spec (`tests/demo-fail.spec.ts`) that feeds a deliberately shuffled fixture array through `analyzeSortOrder` so the failure diagnostics can be shown on demand in the Loom without waiting for HN to actually break. Tag it so it's excluded from the default `npm test` run (separate testMatch or grep tag).

**Acceptance criteria**

- Real suite green with the new reporter; `results-summary.md` generated.
- `npm run demo:fail` produces the client-language violation report.
- `analyzeSortOrder` has zero Playwright imports.

**STOP BLOCK:** "Session 2 complete. Run `npm test` and `npm run demo:fail`, inspect artifacts/results-summary.md, commit, fresh session for Session 3."

---

## Session 3 — Data Layer: SQLite Mirror (Flagship)

**Criteria mapping:** Technical ability + originality. The current README calls the DB layer "outside the scope of this exercise as it requires internal database access." This session removes that excuse by building the database: ingest the live data into a local SQLite mirror and validate at the SQL level. This is the single most differentiating piece of the resubmission.

**Tasks**

1. Add `better-sqlite3` (+ types). DB file at `artifacts/hn-mirror.db`, recreated per run.
2. Create `db/schema.ts` — one statement export creating:

```sql
CREATE TABLE stories (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  unix_time INTEGER NOT NULL,
  iso_time TEXT NOT NULL,
  ui_rank INTEGER,
  api_rank INTEGER
);
```

3. Create `db/ingest.ts`: `ingestApiStories(records)` and `ingestUiStories(records)` upserting into the table (UI scrape populates ui_rank, API fetch populates api_rank, matching on story id). Reuse `getArticleRecords` and the existing API-fetch logic — extract the API fetch into `helpers/getApiRecords.ts` so both the API spec and the ingestion share it, with `withBackoff` wrapping the Firebase calls.
4. Create `tests/db.spec.ts` — a Playwright spec (project or testMatch addition) that ingests once in a `beforeAll`, then asserts via raw SQL:
   - Sort integrity: `SELECT id FROM stories WHERE api_rank IS NOT NULL ORDER BY unix_time DESC` matches the api_rank ordering; same for ui_rank.
   - No duplicates: `SELECT id, COUNT(*) c FROM stories GROUP BY id HAVING c > 1` returns empty.
   - Data quality: no NULL/zero `unix_time`, no empty titles, no future timestamps.
   - Cross-layer reconciliation: overlap between UI and API story sets is high; where both ranks exist, relative order agrees. Document the expected imperfection — /newest moves between the UI scrape and API fetch, so assert on order agreement of the intersection, not exact set equality. This judgment call goes in SESSION_LOG.
5. Pagination drift detection (real-world SDET insight): during UI scraping, HN can shift items between pages mid-pagination, producing duplicate or skipped IDs across page boundaries. Because records now carry story IDs, detect duplicates during scrape; classify a duplicate-ID-across-pages as pagination drift (environmental) versus an actual sort violation (product defect) and surface the classification in diagnostics. An experienced SDET distinguishes flake sources from defects — write that reasoning into SESSION_LOG.
6. Add scripts: `test:db`, and make `npm test` run ui + api + db.

**Acceptance criteria**

- `npm run test:db` green; `artifacts/hn-mirror.db` inspectable via `sqlite3` CLI after a run.
- All SQL assertions produce client-readable failure messages consistent with Session 2 style.
- README divider-top section NOT yet updated (Session 6 handles it).

**STOP BLOCK:** "Session 3 complete. Run `npm test`, poke at artifacts/hn-mirror.db, commit, fresh session for Session 4."

---

## Session 4 — Coverage Expansion Across HN

**Criteria mapping:** Technical ability + structure. Proves the POM/helper architecture pays off: new pages drop in with near-zero duplication, exactly the maintainability story the original README claimed.

**Tasks**

1. Generalize the POM: extract a `HNListPage` base class (url passed in, all existing behavior) with `HNNewestPage` as a thin subclass. Add subclasses for `/front`, `/ask`, `/show`. StoryRow is reused untouched — that reuse IS the demonstration.
2. New spec `tests/list-pages.spec.ts`:
   - /ask and /show: first 30 stories all have valid timestamps, ranks are contiguous 1..30, story IDs unique.
   - /newest structural checks: rank labels match positional order after pagination (catches renumbering bugs), every story has an author and an age cell.
   - Do NOT assert newest→oldest on /front, /ask, /show — they're score-ranked; assert structure and data quality instead. Note the distinction in SESSION_LOG (knowing what NOT to assert is the senior signal here).
3. Algolia API cross-check in `tests/api.spec.ts` (split specs now: `tests/ui.spec.ts`, `tests/api.spec.ts`, `tests/db.spec.ts` — retire the combined `tests/index.ts`, update testMatch): fetch `https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=100` and reconcile against the Firebase newstories intersection — two independent public APIs agreeing on recency ordering is a strong oracle. Wrap in `withBackoff`.
4. Keep total request volume modest: the list-page structural checks need only page one of each list (no pagination beyond /newest).

**Acceptance criteria**

- Full suite green; adding a hypothetical fourth list page would require only a subclass with a url string (state this in SESSION_LOG with a one-line example).
- No sort assertions on score-ranked pages.

**STOP BLOCK:** "Session 4 complete. Run `npm test`, commit, fresh session for Session 5."

---

## Session 5 — Accessibility Audit + Unit Layer (Testing the Tests)

**Criteria mapping:** Technical ability + mission alignment (QA Wolf sells confidence in coverage; this session shows the suite itself is tested, and adds an a11y dimension most take-homes never touch).

**Tasks**

1. Add `@axe-core/playwright`. New spec `tests/a11y.spec.ts` scanning /newest:
   - HN is a table-layout site from 2007 — a raw axe run WILL find violations, and failing the suite on them would be noise, not signal. Instead: run the full scan, write the complete results to `artifacts/a11y-report.json`, and assert against a committed baseline file `a11y-baseline.json` (violation rule id + target selector pairs). The assertion: no NEW violations beyond baseline. First run generates the baseline; document the baseline-vs-hard-fail decision in SESSION_LOG — this is exactly how a11y gets adopted on legacy client sites, which is a very QA Wolf-relevant framing.
   - Reporter/summary integration: a11y results get one plain-language line in results-summary.md (e.g. `Accessibility: 0 new violations vs baseline (12 known legacy findings tracked)`).
2. Add Vitest scoped strictly to `unit/`:
   - `unit/sortAnalysis.spec.ts`: sorted input → zero violations; single swap → exactly one violation at the right rank with correct driftSeconds; fully reversed → n-1 violations; equal timestamps → no violation (ties are legal); empty and single-element inputs.
   - `unit/withBackoff.spec.ts`: `backoffDelay` growth is exponential and capped at maxMs; `withBackoff` retries only when shouldRetry says so, and throws after maxAttempts (use fake timers).
   - `unit/timestampParsing.spec.ts` if timestamp parsing was extracted as a pure function; extract it now if not.
   - The point to capture in SESSION_LOG: mutation-style cases prove the sort validator can actually fail — a test that can't fail is worse than no test.
3. Scripts: `test:unit` → `vitest run`, `test:a11y`, and `test:all` chaining unit → playwright suite. Ensure Vitest and Playwright test globs never overlap.

**Acceptance criteria**

- `npm run test:unit` green with the mutation cases present.
- `npm run test:a11y` green against the committed baseline; artifacts/a11y-report.json produced.
- `npm run test:all` runs everything.

**STOP BLOCK:** "Session 5 complete. Run `npm run test:all`, review the a11y baseline before committing it, commit, fresh session for Session 6."

---

## Session 6 — README, CI, and Submission Package

**Criteria mapping:** All three criteria, compressed into the 5 minutes a reviewer actually spends. This session is the sales layer over the engineering.

**Tasks**

1. Rewrite README.md above the divider (original QA Wolf content below the divider stays byte-identical):
   - Opening: one paragraph, what this is and the one-sentence thesis ("a 100-article sort check, treated like a client's production suite").
   - "Guided tour" section explicitly mapping features to their three published criteria — a table or three short subsections: technical ability (full pyramid: unit → API → UI → data layer via SQLite mirror; deterministic waits; backoff with jitter), customer service orientation (client-language reporter, per-violation diagnostics, results-summary.md, demo:fail), values alignment (documented decisions in SESSION_LOG, a11y baseline approach, knowing what not to assert on score-ranked pages).
   - "Run it" section: node version, `npm i`, `npx playwright install chromium`, every script with one-line descriptions.
   - ASCII architecture diagram of the layers.
   - Short "Decisions worth reading" list linking to specific SESSION_LOG entries (rate-limit backoff, pagination drift classification, a11y baseline, tie-handling in sort analysis).
2. GitHub Actions workflow `.github/workflows/tests.yml`: unit tests + typecheck on every push (fast, no HN traffic), full Playwright suite on manual `workflow_dispatch` only — deliberately NOT on every push, to avoid hammering HN from CI; state that reasoning in a `# comment` in the YAML (YAML comments are exempt from the no-comment rule) and in SESSION_LOG. Green checkmark on the repo matters if reviewers browse GitHub.
3. Create `LOOM-OUTLINE.md` (gitignored or kept — Jimmy's call at commit time) with a timed 2-minute script:
   - 0:00–0:25 Why QA Wolf: mission fit — Jimmy independently built an agentic AI test framework using Claude API planning loops at his last company before AI-native QA was mainstream; QA Wolf is the company-shaped version of the bet he already made on his own. One sentence on customer-facing background (formal technical trainer for military/civilian audiences).
   - 0:25–1:15 Demo: `npm run test:all` pre-recorded or pre-warmed, showing the client-summary output on pass; then `npm run demo:fail` showing rank-level violation diagnostics — "this is the difference between a red X and something your client can act on."
   - 1:15–1:45 Architecture flyover: the pyramid including the SQLite mirror ("the README said a DB layer needs internal access — I disagreed, so I built the database"), exponential backoff mirroring the retry logic from his production agentic framework.
   - 1:45–2:00 Close: SESSION_LOG as the paper trail of intentionality; invite them to read the decisions.
4. Submission checklist appended to LOOM-OUTLINE.md: fresh clone test (`git clone` to temp dir, `npm i`, `npx playwright install chromium`, `npm run test:all` — verifies no machine-local assumptions), delete `node_modules`, zip folder, upload at task-wolf.com/apply-qae with Loom link.
5. Final SESSION_LOG entry summarizing the full buildout arc from the June submission to now.

**Acceptance criteria**

- README reads front-to-back in under 3 minutes; original content below divider untouched (verify with git diff).
- CI workflow valid YAML; unit job would pass.
- Fresh-clone verification steps executed and green.

**STOP BLOCK:** "Session 6 complete — buildout done. Run the fresh-clone check, record the Loom, commit, zip, submit."

---

## Deferred / consciously excluded

- Visual regression (Percy-style): HN's layout is static; screenshot diffs would add flake without signal.
- Multi-browser projects: sort validation isn't rendering-dependent; chromium-only keeps run time and HN traffic down. One line in the README owns this decision.
- Login/auth flows: read-only etiquette against a live production site (CLAUDE.md hard rule).
- A standalone results web UI: the custom reporter + results-summary.md covers the "simple user interface" suggestion with far less surface area; revisit only if time is abundant.
