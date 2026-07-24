# CLAUDE.md — QA-Wolf Take-Home Buildout

## What this repo is

Resubmission of the QA Wolf QA Engineer take-home (task-wolf.com/apply-qae). The core assignment: validate that EXACTLY the first 100 articles on https://news.ycombinator.com/newest are sorted newest to oldest, using Playwright. The submission is reviewed by humans against three criteria, verbatim from their README:

1. Technical ability
2. Customer service orientation (the role is customer facing)
3. Alignment with mission and values

Their FAQ explicitly invites going beyond the checklist: "building a simple user interface, adding detailed error handling or reporting, improving the structure of the script" — and explicitly warns that AI-generated bulk without intentionality does not impress. Every change in this buildout must be explainable in one sentence tied to one of the three criteria. If a proposed change can't be, don't make it.

## Buildout status (as of 2026-07-22)

The planned buildout is COMPLETE: Sessions 1–6, a pending-fixes pass, the treeLine evidence session, and a pages-hardening pass (dead POM trim, `settleRateLimit` false-positive fix, `getStories()` row-count clamp, and four loose ends) all ran and are logged with full reasoning in SESSION_LOG.md. The working session briefs (BUILDOUT-SESSIONS.md and SESSION-TREELINE.md) were executed in full and deleted; everything durable from them lives here, in README.md, or in SESSION_LOG.md. The narrative the repo tells a reviewer: "I treated a 100-article sort check the way I'd treat a client's production suite — full-pyramid coverage (UI, API, data layer, unit), client-readable reporting, deliberate resilience patterns, and documented reasoning for every decision." Remaining pre-submission work is in "Outstanding TODOs" at the bottom of this file; the mechanical submission steps (fresh-clone check, Loom recording, zip, upload) are in LOOM-OUTLINE.md's submission checklist.

## Hard rules

- Playwright + TypeScript everywhere. Vitest is permitted only for the pure-function unit layer (Session 5). No other test frameworks.
- NEVER run `git commit`, `git push`, or any git write operation. Jimmy commits manually between sessions. `git status` and `git diff` are fine.
- Execute ONLY the single session or task Jimmy names at the start of the conversation. When its acceptance criteria are met, STOP. The original session briefs are complete and deleted (see Buildout status); do not start unnamed work, do not "quickly also" fix things outside scope. If you notice an out-of-scope issue, list it under "Noticed but not touched" in your final summary.
- Preserve the ORIGINAL QA Wolf README content below the `---ORIGINAL README.md---` divider in README.md exactly as-is. Never edit below that line.
- Append to SESSION_LOG.md at the end of every session (dated entry, decisions + reasoning, same voice as existing entries). Never rewrite prior entries.
- Hacker News etiquette: this suite hits a live production site. Keep request volume minimal — never add tests that create accounts, log in, vote, hide, flag, or submit. Read-only traffic only. Respect the existing rate-limit handling; never remove it.
- Run the relevant test command and confirm green before declaring a session done. If HN rate-limits during verification, say so explicitly rather than claiming a pass.

## Code style (Jimmy's preferences — non-negotiable)

- No comments in code. None. Reasoning goes in SESSION_LOG.md, not inline.
- No blank lines between statements inside a function.
- One blank line after a function or major block ends.
- Strict TypeScript: no `any` unless unavoidable, explicit return types on exported functions.
- Prefer web-first assertions and auto-waiting locators. No `waitForLoadState('networkidle')`, no bare `waitForTimeout` except inside the deliberate backoff utility.

The no-comments and no-blank-lines-inside-a-function rules above are mechanically enforced by `npm run lint` (`eslint.config.js` + two local rules in `eslint-rules/`), wired into CI — see SESSION_LOG.md's 2026-07-24 entry for why the setup uses a Babel parser instead of `typescript-eslint`. The `describe()` callback body in Vitest spec files is treated as top-level, organizational grouping, not "inside a function" — blank lines between sibling `it()` calls are allowed there, matching the existing style of every file in `unit/`.

## Architecture conventions

```
tests/        spec files only — thin, readable, assertion-focused
pages/        Page Object Models (one class per page, StoryRow shared)
helpers/      reusable logic (scraping, backoff, sort analysis, ingestion)
reporters/    custom Playwright reporter(s)
db/           SQLite mirror layer (schema + ingestion + SQL assertions)
unit/         Vitest tests for pure helpers
docs/         committed evidence artifacts (treeline-appendix — markdown only, zero runtime coupling)
artifacts/    gitignored test output (reports, JSON dumps, axe results)
```

- Complexity lives in pages/ and helpers/. Test files stay short enough to read in one screen.
- Pure logic (sort analysis, backoff math, timestamp parsing) must be extracted into functions with no Playwright dependency so the unit layer can cover them.
- Every failure path must produce diagnostics a non-technical client could read: what broke, where, and the surrounding evidence. "expect(received).toBeLessThanOrEqual" alone is a failure of this repo's purpose.

## Consciously excluded (do not add)

- Visual regression (Percy-style): HN's layout is static; screenshot diffs would add flake without signal.
- Multi-browser projects: sort validation isn't rendering-dependent; chromium-only keeps run time and HN traffic down. The README owns this decision.
- Login/auth flows: read-only etiquette against a live production site (hard rule above).
- A standalone results web UI: the custom reporter + results-summary.md covers the FAQ's "simple user interface" suggestion with far less surface area.
- A `/jobs` page object: job rows carry no author, score, or comment count, so they don't fit the shared `StoryRow` shape the other four list pages use. Rationale also lives in README.md next to the `pages/` architecture line.

## treeLine appendix

`docs/treeline-appendix/` is committed evidence from a ONE-TIME polite crawl (5 pages, unauthenticated, read-only) by treeLine (github.com/jamesmyers4/treeLine) — Jimmy's independently built open-source version of the crawl → AI-generate → human-review pipeline QA Wolf's platform uses. `COMPARISON.md` is the centerpiece: the human review of treeLine's generated /newest page object against the hand-written POM, including a numbered feedback section of treeLine bugs/improvements found during the exercise. The framing sentence: "AI proposed, human reviewed and overrode where the human knew better." Nothing in the test suite imports, shells out to, or reads from treeLine or the appendix — the submission runs standalone with npm, and that zero-coupling guarantee must never be traded away. Raw crawl output (`treeLine-output/`) stays gitignored; never re-crawl HN from a session.

## Definition of done (every session)

1. Acceptance criteria in the session brief all pass.
2. Test suite runs green locally (or rate-limit interference is explicitly reported).
3. `npx tsc --noEmit` passes.
4. SESSION_LOG.md entry appended.
5. Final summary printed: what changed, file list, anything noticed but not touched, exact stop block.

## Outstanding TODOs (pre-submission, from the retired session briefs)

- [ ] Jimmy: edit `docs/treeline-appendix/COMPARISON.md` into his own voice before committing — it will be read closely and must sound like him (treeLine session stop block).
- [ ] File the seven treeLine findings from COMPARISON.md's feedback section on treeLine's issue tracker.
- [ ] After the final commit: fresh-clone check, record the Loom, delete node_modules, zip, submit — full checklist in LOOM-OUTLINE.md.
