# treeLine appendix

[treeLine](https://github.com/jamesmyers4/treeLine) is an open-source AI-powered site comprehension engine I built independently: a hardened Playwright crawl captures DOM and accessibility-tree snapshots, tiered AI interpretation generates page objects, specs, and selector stability rankings, and everything AI-proposed sits behind a human-review gate. It is the same crawl → AI-generate → human-review architecture QA Wolf's platform uses, built solo and in the open.

Nothing in this repo's test suite depends on treeLine. The files here are committed evidence artifacts from a single polite crawl of Hacker News (5 pages, unauthenticated, read-only, run once on 2026-07-22) — kept so the human-review step could be performed in public. That review is [COMPARISON.md](COMPARISON.md).

## Contents

| File | What it is |
| --- | --- |
| [COMPARISON.md](COMPARISON.md) | The centerpiece: treeLine's generated /newest page object reviewed against the hand-written `pages/HNNewestPage.ts`, plus feedback filed back against treeLine |
| [site-atlas.md](site-atlas.md) | treeLine's AI interpretation of each crawled page — purpose, page type, key data entities (unedited crawl output) |
| [selector-stability-newest.md](selector-stability-newest.md) | Curated excerpt of the selector stability ranking for /newest, with summary statistics (the full report is 410 KB across 5 pages) |
| [testid-audit.md](testid-audit.md) | Curated excerpt of the data-testid coverage audit: 0% across all 5 pages |
| [axe-report.md](axe-report.md) | treeLine's independent axe-core scan (unedited crawl output) — cross-checked against this suite's `a11y-baseline.json` in COMPARISON.md |
| [generated-pom-newest.md](generated-pom-newest.md) | Excerpts of the POM and specs treeLine generated for /newest, embedded as markdown |

Raw crawl output (SQLite capture db, screenshots, JSON dumps, full reports) is gitignored; only these curated markdown copies ship.
