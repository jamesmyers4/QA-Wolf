# GAPS.md — codebase review findings (2026-07-24)

Findings from a full-repo pass measuring this suite against what a senior SDET would expect in a production-grade test suite. Nothing here has been actioned — this is a punch list for Jimmy to triage, not a session brief. Each item ties back to one of the three review criteria from CLAUDE.md.

## Real gaps

## Minor / optional

### 4. No `test.step()` segmentation in specs

Traces read as one flat block per test rather than named phases (goto → scrape → analyze → attach). Low priority since `clientSummaryReporter` already tells the client-readable story — this would only sharpen the raw Playwright trace viewer.

### 5. No supply-chain hygiene automation

No Dependabot config, no `npm audit` step in `.github/workflows/tests.yml`. Consistent with the "treat it like production" framing but easy to skip for a take-home of this size.

### 6. Partial Vitest coverage on two pure-logic files

Discovered while fixing gap 3 (2026-07-24): the new coverage report shows `sortAnalysis.ts`'s cross-source reconciliation functions (`reconcileRecencyOrder`, `formatReconciliation`, `formatViolation`, `formatViolationReport`) and `structureAnalysis.ts`'s `analyzeListStructure`/`formatStructureIssues` are pure, Playwright-free, and exercised by `tests/api.spec.ts` and `tests/list-pages.spec.ts` end-to-end — but have no dedicated Vitest specs, dragging the coverage threshold in `vitest.config.ts` down to its current (real, not aspirational) baseline of ~61%/52%/71%/60%.

**Criterion:** Technical ability — these are exactly the kind of pure functions the unit layer exists to cover.
**Fix:** add `unit/sortAnalysis.spec.ts` cases for the reconciliation/formatting functions and `unit/structureAnalysis.spec.ts` cases for `analyzeListStructure`/`formatStructureIssues`, then raise the thresholds in `vitest.config.ts` to match.
