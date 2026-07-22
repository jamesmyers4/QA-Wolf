# SESSION-TREELINE.md — treeLine Evidence & Cross-Validation

Read CLAUDE.md first. All hard rules apply. This session slots AFTER Session 5 and BEFORE Session 6 (the README/Loom session needs this session's output to reference). If Session 6 already ran, execute the "Session 6 patch" block at the end instead of skipping it.

## Why this session exists

QA Wolf's platform crawls a client's application, captures DOM snapshots, runs them through multi-agent AI to generate Playwright code, and gates everything behind human review. Jimmy independently built treeLine (github.com/jamesmyers4/treeLine) — an open-source AI-powered site comprehension engine with the same architecture: hardened Playwright crawl, DOM + accessibility-tree capture, tiered AI interpretation, generated POMs and specs, selector stability ranking, and a human-review gate (skip-wrapped proposed specs, hard-pages escalation queue). Committing curated treeLine output for Hacker News into this repo, with a written comparison against the hand-written POM, is direct evidence for all three of their criteria — especially mission alignment. The framing sentence this session must land: "AI proposed, human reviewed and overrode where the human knew better" — which is QA Wolf's own operating model.

Towards the end, I would also like for you to prepare a section for any bugs you find with treeLine's output OR any improvements that would help a qa engineer write test code more efficiently. This is going to be feedback going directly towards treeLine to make it better.

## Pre-session manual step (Jimmy, not Claude Code)

Before starting this session, run ONE polite crawl from the treeLine checkout:

```
cd packages/cli
pnpm exec tsx src/index.ts crawl https://news.ycombinator.com --max-pages 5 --output ../../treeline-output/hn-crawl
```

One run only, max-pages 5, unauthenticated, no request/response body capture. HN rate-limits aggressively and CLAUDE.md's read-only etiquette applies to treeLine traffic same as test traffic. If the crawl gets rate-limited, wait and retry later rather than re-running back-to-back. Copy the resulting `reports/` directory somewhere Claude Code can read (paste the path at session start).

## Tasks (Claude Code)

1. Create `docs/treeline-appendix/` in the QA-Wolf repo. Copy in a CURATED subset of the crawl reports — markdown only, no screenshots, no SQLite db, no raw JSON dumps (zip size matters for submission):
   - the site atlas
   - the selector stability report
   - the testid coverage audit (HN will show ~zero testid coverage — that finding is itself the point: a 2007 table-layout site with no test attributes is exactly the hostile-selector environment where ranked stability analysis earns its keep)
   - the axe-core findings
   - the generated POM/spec for /newest if the crawl produced one
     Add a short `docs/treeline-appendix/README.md` explaining what treeLine is (two sentences), linking the repo, and stating explicitly that nothing in the test suite depends on it — these are committed evidence artifacts from a one-time crawl.
2. Write `docs/treeline-appendix/COMPARISON.md` — the centerpiece. A hand-written analysis (Claude Code drafts, Jimmy edits before commit) comparing treeLine's generated HN POM/selector choices against `pages/HNNewestPage.ts`:
   - Where the tool's top-ranked selectors agree with the hand-written POM → independent validation of the locator strategy.
   - Where the hand-written POM is better and WHY the tool couldn't get there: the two-row `tr.athing` + sibling subtext-row bridge (structural insight requiring DOM comprehension across elements), the `.age` title-attribute timestamp source vs the render-time relative text (a data-quality judgment, not a selector ranking), the `.age` vs `.age a` distinction.
   - One honest limitation of treeLine surfaced by this exercise, stated plainly — self-critique of one's own tooling is the senior signal, not a weakness.
   - Closing paragraph tying it to QA Wolf's model: AI generation gated by human review is how both treeLine and QA Wolf work, and this comparison is that review, performed in public.
3. Cross-check the Session 5 a11y baseline: diff treeLine's axe findings against `a11y-baseline.json` (rule ids should substantially overlap since both run axe-core; environment/version differences may produce deltas). Add a short section to COMPARISON.md noting the agreement level. Two independent scanners agreeing on the violation set strengthens the baseline's credibility.
4. Update SESSION_LOG.md with the session entry, including the deliberate decision NOT to wire treeLine into the test pipeline (submission must run standalone with npm) and the one-crawl politeness constraint.

## Session 6 patch (only if Session 6 already ran)

1. README guided-tour section: add a fourth row/subsection under mission-values alignment pointing to `docs/treeline-appendix/COMPARISON.md` with one sentence: independently built an open-source version of the crawl → AI-generate → human-review pipeline QA Wolf's platform uses, and published the human-review step against this very assignment.
2. LOOM-OUTLINE.md: replace part of the 1:15–1:45 architecture flyover with a ~10-second beat — flash COMPARISON.md on screen and deliver the framing sentence from "Why this session exists" above. Do not spend more than 10-15 seconds of Loom time on treeLine; the appendix carries the depth, the Loom just points at it.

## Acceptance criteria

- `docs/treeline-appendix/` contains only markdown, total size small enough to be a rounding error in the zip.
- COMPARISON.md covers agreement, override-with-reasons, one honest tool limitation, and the QA Wolf model tie-in.
- `npm run test:all` still green — zero runtime coupling to treeLine.
- SESSION_LOG.md entry appended.

**STOP BLOCK:** "treeLine session complete. Read COMPARISON.md carefully and edit it in your own voice before committing — this document will be read closely, and it must sound like you. Commit, then proceed to (or re-verify) Session 6."
