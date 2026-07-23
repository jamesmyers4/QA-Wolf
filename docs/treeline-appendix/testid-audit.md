# data-testid Coverage Audit (curated excerpt)

Curated from treeLine's full audit (27 KB; the full version enumerates every uncovered element on all 5 pages — raw crawl output is gitignored).

Generated: 2026-07-22T01:09:40.044Z

Overall coverage: **0%**

| URL | Coverage % | Missing Count |
| --- | --- | --- |
| https://news.ycombinator.com/ | 0% | 227 |
| https://news.ycombinator.com/news | 0% | 227 |
| https://news.ycombinator.com/newest | 0% | 261 |
| https://news.ycombinator.com/front | 0% | 205 |
| https://news.ycombinator.com/newcomments | 0% | 201 |

Every gap entry looks like the /newest excerpt below — 261 interactive elements, not one test attribute among them:

```
- link 'Hacker News'
- link 'new'
- link 'SEAM-V: A Hybrid-Decoupled RISC-V Vector Processor'
- link 'arxiv.org'
- link 'Jimmc414'
- link '3 minutes ago'
- link 'hide'
- link 'past'
- link 'discuss'
- link 'More'
- textbox ''
```

Zero coverage is the point of committing this file: Hacker News is a 2007 table-layout site with no test attributes at all, which is exactly the hostile-selector environment where ranked stability analysis — and careful hand-written locator strategy — earns its keep. On a client site, this audit doubles as the list of `data-testid` additions to request from the client's engineers.
