[![Tests](https://github.com/jamesmyers4/QA-Wolf/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/jamesmyers4/QA-Wolf/actions/workflows/tests.yml)
# 🐺 QA Wolf Take Home Assignment (Jimmy Myers)

The assignment: validate that exactly the first 100 articles on [Hacker News /newest](https://news.ycombinator.com/newest) are sorted newest to oldest. This repo treats that one check the way I'd treat a client's production suite — full-pyramid coverage (unit → API → UI → data layer), deterministic waits, bounded backoff against a live site, and failure output a non-technical client could act on. Every decision has a written rationale in [SESSION_LOG.md](SESSION_LOG.md).

## Guided tour — mapped to your three criteria

### Technical ability

- **Full testing pyramid.** 50 Vitest unit tests over the suite's own pure logic, backed by an enforced `v8` coverage threshold (`npm run test:unit` fails the build if it regresses) so the test-count claim is backed by data instead of asserted — see [Unit coverage](#unit-coverage) below. API validation runs against two independent oracles (HN's Firebase API reconciled with Algolia's `search_by_date`), UI validation through a Page Object Model, and a SQLite mirror that re-validates the sort in raw SQL. The June submission deemed a DB layer out of scope ("Requires internal database access — outside scope of this exercise") — I disagreed, so this version builds the database: every run ingests both layers into `artifacts/hn-mirror.db` and asserts sort integrity, uniqueness, data quality, and cross-layer agreement at the SQL level.
- **Zero non-deterministic waits.** No `networkidle`, no sleeps. Pagination waits on the first story row's id changing — an auto-retrying assertion on the thing we actually need.
- **Deliberate resilience.** Exponential backoff with jitter and a hard attempt cap (`helpers/withBackoff.ts`) handles HN's "Sorry" rate-limit page and transient network errors; a persistently blocked run fails loudly with a clear message instead of hanging.
- **Pagination drift classification.** HN inserts new stories mid-run, shifting items across page boundaries. Story-id tracking distinguishes that environmental drift from an actual sort defect, classifies it in the diagnostics, and excludes it from analysis — flake source and product defect are never conflated.
- **Style rules are enforced, not just documented.** `npm run lint` runs ESLint with two local rules (`eslint-rules/`) that mechanically check this repo's own conventions — zero comments, zero blank lines inside a function — instead of leaving them to depend on code review; wired into CI alongside `typecheck`.

### Customer service orientation

- **A client-language reporter.** `reporters/clientSummaryReporter.ts` prints a plain-English summary block and writes `artifacts/results-summary.md` — pass or fail, in sentences, not stack traces.
- **Per-violation diagnostics.** A failure reads `Sort violation at rank 4: "Article title" (posted 2026-07-21T14:09:27 UTC) appears 94s newer than rank 3` — every violation, with drift in seconds, not just the first bad pair.
- **`npm run demo:fail`.** A fixture with engineered inversions runs the real analysis → report path on demand, so the failure diagnostics can be seen without waiting for HN to actually break. It exits 1 by design — the red exit is part of the demonstration.
- **Evidence attached everywhere.** Raw article records, sort analysis, drift events, and failure screenshots land in the HTML report via `testInfo.attach`. `trace: "retain-on-failure"` in `playwright.config.ts` means a failing run keeps a full Playwright trace locally — not just on CI retries — so debugging a failure never depends on it happening twice.

### Mission & values alignment

- **[SESSION_LOG.md](SESSION_LOG.md)** is the paper trail of intentionality: every session's decisions, trade-offs, and the two rate-limit encounters reported honestly instead of retried into silence.
- **Accessibility with a baseline, not noise.** HN is a table-layout site from 2007; a raw axe scan fails everything. The suite freezes 22 known legacy findings in a committed baseline (selector-normalized to survive a live feed) and fails only on new violations — how a11y actually gets adopted on legacy client sites.
- **Knowing what not to assert.** /front, /ask, and /show are score-ranked, so they get structural and data-quality checks, never newest→oldest assertions that would fail on correct behavior.
- **Read-only etiquette.** Single worker, strictly read-only traffic (no votes, logins, or submissions), Firebase item fetches bounded to 10 concurrent, and CI never hits HN automatically.
- **[AI proposed, human reviewed](docs/treeline-appendix/COMPARISON.md).** I independently built [treeLine](https://github.com/jamesmyers4/treeLine), an open-source version of the crawl → AI-generate → human-review pipeline QA Wolf's platform uses, and published the human-review step against this very assignment: treeLine's generated HN page object, compared line by line with the hand-written one.

## Architecture

```
┌─ tests/        thin specs: ui, api, list-pages, a11y, db, demo-fail
├─ pages/        HNListPage base class + one-line-per-page subclasses, shared StoryRow
├─ helpers/      scraping, sort/structure/a11y analysis, backoff, rate-limit settling
├─ db/           SQLite mirror: schema, ingestion, SQL sort assertions (node:sqlite)
├─ reporters/    clientSummaryReporter → console block + artifacts/results-summary.md
├─ unit/         Vitest over the pure helpers — the suite's own logic, tested
└─ artifacts/    gitignored output: HTML report, JSON evidence, hn-mirror.db, a11y report
```

Complexity lives in `pages/`, `helpers/`, and `db/`; every spec file reads in one screen. Adding a fifth HN list page is one subclass with a URL string. `/jobs` has no page object — job rows carry no author, score, or comment count, so it doesn't fit the shared `StoryRow` shape the other four list pages use. Chromium-only on purpose: sort validation isn't rendering-dependent, and one browser keeps run time and HN traffic down. Two more deliberate exclusions: visual regression (HN's layout is static — screenshot diffs would add flake without signal) and a standalone results web UI (the client-summary reporter covers the "simple user interface" suggestion with far less surface area).

## Run it

Requires Node ≥ 22.5 (the SQLite mirror uses the built-in `node:sqlite` — no native builds; developed on Node 24).

```
npm i
npx playwright install chromium
npm run test:all
```

HN rate-limits per IP. If the /newest scrape reports HN's rate-limit ("Sorry") page, the suite fails loudly by design after bounded retries — wait a few minutes and rerun.

| Script                  | What it does                                                        |
| ----------------------- | ------------------------------------------------------------------- |
| `npm test`              | Full Playwright suite: UI, API, list pages, a11y, DB mirror         |
| `npm run test:all`      | Unit layer first (free, fails fastest), then the full suite         |
| `npm run test:unit`     | Vitest over the pure helpers, with `v8` coverage enforced           |
| `npm run test:ui`       | /newest UI sort validation only                                     |
| `npm run test:api`      | Firebase + Algolia API validation only                              |
| `npm run test:db`       | SQLite mirror ingestion + SQL assertions only                       |
| `npm run test:list`     | Structural checks on /front, /ask, /show, /newest                   |
| `npm run test:a11y`     | Axe scan of /newest against the committed baseline                  |
| `npm run demo:fail`     | On-demand failure diagnostics from a shuffled fixture (exits 1)     |
| `npm run typecheck`     | `tsc --noEmit` under strict mode                                    |
| `npm run lint`          | ESLint — mechanically enforces the style rules in CLAUDE.md         |

CI runs typecheck + lint + unit tests on every push; the full suite is manual-dispatch only so CI never hammers a live production site.

## Unit coverage

`npm run test:unit` runs Vitest with the `@vitest/coverage-v8` provider against the five files that hold this suite's pure logic (`helpers/sortAnalysis.ts`, `helpers/structureAnalysis.ts`, `helpers/a11yAnalysis.ts`, `helpers/withBackoff.ts`, `helpers/settleRateLimit.ts`) and fails the build below a global threshold (`vitest.config.ts`). `helpers/getAlgoliaRecords.ts`, `getApiRecords.ts`, `getArticleRecords.ts`, `getListRows.ts`, and `attachEvidence.ts` are excluded from that scope on purpose — they orchestrate a live Playwright `Page`/`APIRequestContext` and are exercised by the Playwright specs in `tests/`, not by Vitest.

The threshold is set at the current measured baseline, not an aspirational number: all five files now carry dedicated Vitest specs, including `sortAnalysis.ts`'s cross-source reconciliation functions (`reconcileRecencyOrder`, `formatReconciliation`, `formatViolation`, `formatViolationReport`), `structureAnalysis.ts`'s `analyzeListStructure`/`formatStructureIssues`, and `a11yAnalysis.ts`'s nested-target, missing-metadata, and plural-wording branches. The global baseline sits at 99%/99%/100%/100% (statements/branches/functions/lines); the one remaining uncovered branch is a genuinely unreachable defensive guard in `reconcileRecencyOrder`, left as-is rather than chased with a contrived test — see [GAPS.md](GAPS.md) item 7.

## Decisions worth reading

- [Bounded backoff replacing an unbounded rate-limit loop](SESSION_LOG.md#2026-07-21--session-1-foundation--hygiene) — Session 1
- [A Firebase eventual-consistency race the diagnostics caught on day one](SESSION_LOG.md#2026-07-21--session-2-diagnostics--client-facing-reporting) — Session 2
- [Pagination drift: environment vs defect, and the "14:9:27" mystery](SESSION_LOG.md#2026-07-21--session-3-data-layer--sqlite-mirror) — Session 3
- [What not to assert on score-ranked pages](SESSION_LOG.md#2026-07-21--session-4-coverage-expansion-across-hn) — Session 4
- [The a11y baseline, and making it stable on a page that changes every minute](SESSION_LOG.md#2026-07-22--session-5-accessibility-audit--unit-layer) — Session 5
- [Closing the June ECONNRESET prediction with bounded concurrency](SESSION_LOG.md#2026-07-22--pending-fixes-pre-session-6-transient-retries-bounded-concurrency-honest-reporter-wording) — pre-Session 6

---ORIGINAL README.md---

# 🐺 QA Wolf Take Home Assignment

Welcome to the QA Wolf take home assignment for our [QA Engineer](https://www.task-wolf.com/apply-qae) role! We appreciate your interest and look forward to seeing what you come up with.

## Instructions

This assignment has two questions as outlined below. When you are done, upload your assignment to our [application page](https://www.task-wolf.com/apply-qae):

### Question 1

In this assignment, you will create a script on [Hacker News](https://news.ycombinator.com/) using JavaScript and Microsoft's [Playwright](https://playwright.dev/) framework.

1. Install node modules by running `npm i`.

2. Edit the `index.js` file in this project to go to [Hacker News/newest](https://news.ycombinator.com/newest) and validate that EXACTLY the first 100 articles are sorted from newest to oldest. You can run your script with the `node index.js` command.

Note that you are welcome to update Playwright or install other packages as you see fit, however you must utilize Playwright in this assignment.

### Question 2

Why do you want to work at QA Wolf? Please record a short, ~2 min video using [Loom](https://www.loom.com/) that includes:

1. Your answer

2. A walk-through demonstration of your code, showing a successful execution

The answer and walkthrough should be combined into _one_ video, and must be recorded using Loom as the submission page only accepts Loom links.

## Frequently Asked Questions

### What is your hiring process? When will I hear about next steps?

This take home assignment is the first step in our hiring process, followed by a final round interview if it goes well. **We review every take home assignment submission and promise to get back to you either way within two weeks (usually sooner).** The only caveat is if we are out of the office, in which case we will get back to you when we return. If it has been more than two weeks and you have not heard from us, please do follow up.

The final round interview is a 2-hour technical work session that reflects what it is like to work here. We provide a $150 stipend for your time for the final round interview regardless of how it goes. After that, there may be a short chat with our director about your experience and the role.

Our hiring process is rolling where we review candidates until we have filled our openings. If there are no openings left, we will keep your contact information on file and reach out when we are hiring again.

### Having trouble uploading your assignment?

Be sure to delete your `node_modules` file, then zip your assignment folder prior to upload.

### How do you decide who to hire?

We evaluate candidates based on three criteria:

- Technical ability (as demonstrated in the take home and final round)
- Customer service orientation (as this role is customer facing)
- Alignment with our mission and values (captured [here](https://qawolf.notion.site/Mission-and-Values-859c7d0411ba41349e1b318f4e7abc8f))

This means whether we hire you is based on how you do during our interview process, not on your previous experience (or lack thereof). Note that you will also need to pass a background check to work here as our customers require this.

### How can I help my application stand out?

While the assignment has clear requirements, we encourage applicants to treat it as more than a checklist. If you're genuinely excited about QA Wolf, consider going a step further—whether that means building a simple user interface, adding detailed error handling or reporting, improving the structure of the script, or anything else that showcases your unique perspective.

There's no "right" answer—we're curious to see what you choose to do when given freedom and ambiguity. In a world where tools can help generate working code quickly and make it easier than ever to complete technical take-homes, we value originality and intentionality. If that resonates with you, use this assignment as a chance to show us how you think.

Applicants who approach the assignment as a creative challenge, not just a checklist, tend to perform best in our process.
