# GAPS.md — codebase review findings (2026-07-24)

Findings from a full-repo pass measuring this suite against what a senior SDET would expect in a production-grade test suite. Nothing here has been actioned — this is a punch list for Jimmy to triage, not a session brief. Each item ties back to one of the three review criteria from CLAUDE.md.

## Real gaps

### 2. Style rules are documented but not mechanically enforced

CLAUDE.md hard-codes real conventions (no comments, no blank lines mid-function, one blank line between blocks). Nothing enforces them — `tsc --noEmit` only checks types. No ESLint/Prettier appears in `package.json` or CI.

**Criterion:** Technical ability — a suite that claims production-grade discipline should have that discipline survive past code review, not depend on it.
**Fix:** add an ESLint config (or a lightweight custom rule) and a `typecheck`-adjacent CI step.

### 3. No coverage signal on the unit layer

43 Vitest tests exist over the pure-logic helpers, but there's no `--coverage` run or threshold anywhere (`vitest.config.ts` has none, `package.json` has no coverage script).

**Criterion:** Technical ability — the README cites test count as evidence of rigor; coverage would back that claim with data instead of asserting it.
**Fix:** add `vitest run --coverage` with a threshold, surfaced in `npm run test:unit` or a dedicated script.

## Minor / optional

### 4. No `test.step()` segmentation in specs

Traces read as one flat block per test rather than named phases (goto → scrape → analyze → attach). Low priority since `clientSummaryReporter` already tells the client-readable story — this would only sharpen the raw Playwright trace viewer.

### 5. No supply-chain hygiene automation

No Dependabot config, no `npm audit` step in `.github/workflows/tests.yml`. Consistent with the "treat it like production" framing but easy to skip for a take-home of this size.
