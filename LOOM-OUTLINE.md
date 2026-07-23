# LOOM-OUTLINE.md — 2-Minute Video Script

Target: ~2:00. Pre-warm before recording: run `npm run test:all` once so browsers, caches, and HN's rate limiter are settled, and have `artifacts/results-summary.md` plus a terminal ready. If HN rate-limits during recording, cut to the pre-recorded pass — never re-run back-to-back on camera.

## 0:00–0:25 — Why QA Wolf

- Before AI-native QA was mainstream, I independently built an agentic AI test framework at my last company — Claude API planning loops generating and maintaining test coverage. QA Wolf is the company-shaped version of the bet I already made on my own; the mission fit isn't aspirational, it's a track record.
- One sentence on the customer-facing background: formal technical trainer for military and civilian audiences — explaining complex systems to non-technical people is the job I've already done for years.

## 0:25–1:15 — Demo

- Run (or cut to pre-recorded) `npm run test:all`: unit layer flashes green in under a second, then the full suite — point at the client-summary block: "100/100 articles on /newest verified newest → oldest, in plain English, written to results-summary.md."
- Then `npm run demo:fail`: rank-level violation diagnostics with titles, timestamps, and drift in seconds. Line to land: **"This is the difference between a red X and something your client can act on."**
- Note the exit code stays honest — the demo fails on purpose, because a failure report you can't see until production breaks is a failure report you can't trust.

## 1:15–1:45 — Architecture flyover

- The pyramid on screen (README diagram): unit → API (two independent oracles: Firebase + Algolia) → UI → SQLite mirror.
- Line to land: **"The original README said a DB layer needs internal database access — I disagreed, so I built the database."** Every run ingests both layers into SQLite and re-validates the sort in raw SQL.
- ~10 seconds, no more: flash `docs/treeline-appendix/COMPARISON.md` on screen — my open-source treeLine engine ran QA Wolf's own crawl → AI-generate → human-review pipeline against this assignment. Line to land: **"AI proposed, human reviewed and overrode where the human knew better — which is QA Wolf's own operating model."** The appendix carries the depth; don't linger.

## 1:45–2:00 — Close

- SESSION_LOG.md is the paper trail of intentionality: every decision, every trade-off, both rate-limit encounters reported honestly.
- Invite: "The decisions are the interesting part — the pagination-drift classification and the a11y baseline are the two I'd read first."

---

# Submission checklist

1. Commit everything; verify `git status` clean.
2. Fresh-clone test (verifies no machine-local assumptions):
   - `git clone <repo> <temp-dir>` (fresh directory, not the working copy)
   - `cd <temp-dir>` → `npm i` → `npx playwright install chromium`
   - `npm run test:all` — must be fully green (if HN rate-limits, wait and rerun; don't ship on a blocked run)
3. Record the Loom using the script above; grab the share link.
4. Delete `node_modules/` from the submission copy.
5. Zip the assignment folder (artifacts/ is gitignored and stays out; the zip should be tiny).
6. Upload the zip + Loom link at https://www.task-wolf.com/apply-qae
