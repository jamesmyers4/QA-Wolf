# CLAUDE.md — QA-Wolf Take-Home Buildout

## What this repo is

Resubmission of the QA Wolf QA Engineer take-home (task-wolf.com/apply-qae). The core assignment: validate that EXACTLY the first 100 articles on https://news.ycombinator.com/newest are sorted newest to oldest, using Playwright. The submission is reviewed by humans against three criteria, verbatim from their README:

1. Technical ability
2. Customer service orientation (the role is customer facing)
3. Alignment with mission and values

Their FAQ explicitly invites going beyond the checklist: "building a simple user interface, adding detailed error handling or reporting, improving the structure of the script" — and explicitly warns that AI-generated bulk without intentionality does not impress. Every change in this buildout must be explainable in one sentence tied to one of the three criteria. If a proposed change can't be, don't make it.

## Hard rules

- Playwright + TypeScript everywhere. Vitest is permitted only for the pure-function unit layer (Session 5). No other test frameworks.
- NEVER run `git commit`, `git push`, or any git write operation. Jimmy commits manually between sessions. `git status` and `git diff` are fine.
- Execute ONLY the single session Jimmy names at the start of the conversation. When that session's acceptance criteria are met, STOP and print the stop block from the session brief. Do not start the next session, do not "quickly also" fix things outside scope. If you notice an out-of-scope issue, list it under "Noticed but not touched" in your final summary.
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

## Architecture conventions

```
tests/        spec files only — thin, readable, assertion-focused
pages/        Page Object Models (one class per page, StoryRow shared)
helpers/      reusable logic (scraping, backoff, sort analysis, ingestion)
reporters/    custom Playwright reporter(s)
db/           SQLite mirror layer (schema + ingestion + SQL assertions)
unit/         Vitest tests for pure helpers
artifacts/    gitignored test output (reports, JSON dumps, axe results)
```

- Complexity lives in pages/ and helpers/. Test files stay short enough to read in one screen.
- Pure logic (sort analysis, backoff math, timestamp parsing) must be extracted into functions with no Playwright dependency so the unit layer can cover them.
- Every failure path must produce diagnostics a non-technical client could read: what broke, where, and the surrounding evidence. "expect(received).toBeLessThanOrEqual" alone is a failure of this repo's purpose.

## Definition of done (every session)

1. Acceptance criteria in the session brief all pass.
2. Test suite runs green locally (or rate-limit interference is explicitly reported).
3. `npx tsc --noEmit` passes.
4. SESSION_LOG.md entry appended.
5. Final summary printed: what changed, file list, anything noticed but not touched, exact stop block.
