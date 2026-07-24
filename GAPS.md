# GAPS.md — codebase review findings (2026-07-24)

Findings from a full-repo pass measuring this suite against what a senior SDET would expect in a production-grade test suite. This is a punch list for Jimmy to triage, not a session brief. Each item ties back to one of the three review criteria from CLAUDE.md. Actioned items are removed from this list and folded into SESSION_LOG.md.

## Real gaps

## Minor / optional

### 4. No `test.step()` segmentation in specs

Traces read as one flat block per test rather than named phases (goto → scrape → analyze → attach). Low priority since `clientSummaryReporter` already tells the client-readable story — this would only sharpen the raw Playwright trace viewer.

