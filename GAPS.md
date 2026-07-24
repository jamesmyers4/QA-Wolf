# GAPS.md — codebase review findings (2026-07-24)

Findings from a full-repo pass measuring this suite against what a senior SDET would expect in a production-grade test suite. Nothing here has been actioned — this is a punch list for Jimmy to triage, not a session brief. Each item ties back to one of the three review criteria from CLAUDE.md.

## Real gaps

## Minor / optional

### 4. No `test.step()` segmentation in specs

Traces read as one flat block per test rather than named phases (goto → scrape → analyze → attach). Low priority since `clientSummaryReporter` already tells the client-readable story — this would only sharpen the raw Playwright trace viewer.

### 5. No supply-chain hygiene automation

No Dependabot config, no `npm audit` step in `.github/workflows/tests.yml`. Consistent with the "treat it like production" framing but easy to skip for a take-home of this size.

### 6. Partial branch coverage on `a11yAnalysis.ts`

Noticed while closing gap 6 (2026-07-24, now removed — see SESSION_LOG.md's "GAPS Item 6" entry): `a11yAnalysis.ts` sits at 100% statement/line/function coverage but only 77.77% branch coverage. Untested branches include the array-vs-non-array ternary in `serializeTarget` (line 33), the nullish-coalescing fallbacks for `impact`/`help` in `extractFindings` (lines 56–57), and the singular/plural wording branch in `formatA11yComparison` (line 104). Out of scope for that session because it named only `sortAnalysis.ts` and `structureAnalysis.ts`.

**Criterion:** Technical ability — same reasoning as the fixed gap: pure, Playwright-free logic is exactly what the unit layer should fully exercise.
**Fix:** add cases to `unit/a11yAnalysis.spec.ts` covering a non-array target part, a violation missing `impact`/`help`, and a single-finding `formatA11yComparison` call; then the global branch threshold in `vitest.config.ts` can likely be raised close to 100%.

### 7. Defensive-but-unreachable guard in `reconcileRecencyOrder`

`helpers/sortAnalysis.ts:93` (`if (!bFirst || !bSecond) continue;`) can never be true: `shared` is already filtered to ids present in `bById`, so both lookups always succeed. Noticed while writing the reconciliation specs for gap 6 — it's the one branch left uncovered in that function's coverage report. Not a bug, just defensive code with no live path; left untouched since removing it wasn't part of that session's task.

**Criterion:** Technical ability (code clarity) — very low priority, purely cosmetic.
**Fix:** either delete the guard (the `RecencyDisagreement`/`Map` types already guarantee both are defined) or leave it as intentional defense-in-depth and accept the coverage gap as permanent — either way, worth a one-line decision the next time this file is touched.

