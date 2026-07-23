# Selector Stability Report — /newest (curated excerpt)

Curated from treeLine's full selector stability report (410 KB covering 5 pages; raw crawl output is gitignored). For every interactive element, treeLine emits up to three candidate selectors — role, CSS path, XPath — and marks each as stable/unstable and unique/ambiguous. This excerpt keeps the /newest summary statistics and a representative slice: the navigation links plus one complete story row.

## Summary statistics for /newest (261 elements)

| Strategy | Stable | Unstable | Notes |
| --- | --- | --- | --- |
| role | 229 | 0 | 114 unique, 115 ambiguous (repeated names like "hide", "past", "discuss" need `.nth()`) |
| css | 30 | 231 | the 30 "stable" CSS selectors are all `#up_<storyid>` vote anchors — see COMPARISON.md for why that ranking is wrong |
| xpath | 0 | 261 | every absolute XPath correctly marked unstable |

The headline finding: on a table-layout site with zero test ids, treeLine correctly rejects every positional CSS path and absolute XPath as unstable and top-ranks role-based selectors — the same locator philosophy the hand-written suite uses.

## Excerpt: navigation and the first story row

| Element | Strategy | Selector | Stable | Unique |
| --- | --- | --- | --- | --- |
| link 'Hacker News' | role | role=link[name="Hacker News"] | Yes | Yes |
| link 'Hacker News' | css | center > table > tbody > tr:nth-of-type(1) > td > table > tbody > tr > td:nth-of-type(2) > span.pagetop > b.hnname > a | No | Yes |
| link 'Hacker News' | xpath | /html/body/center/table/tbody/tr[1]/td/table/tbody/tr/td[2]/span/b/a | No | Yes |
| link 'new' | role | role=link[name="new"] | Yes | Yes |
| link 'past' | role | role=link[name="past"] | Yes | No |
| link 'comments' | role | role=link[name="comments"] | Yes | Yes |
| link 'ask' | role | role=link[name="ask"] | Yes | Yes |
| link 'show' | role | role=link[name="show"] | Yes | Yes |
| link 'jobs' | role | role=link[name="jobs"] | Yes | Yes |
| link 'submit' | role | role=link[name="submit"] | Yes | Yes |
| link 'login' | role | role=link[name="login"] | Yes | Yes |
| a (vote arrow) | css | #up_49000525 | Yes | Yes |
| a (vote arrow) | xpath | /html/body/center/table/tbody/tr[3]/td/table/tbody/tr[1]/td[2]/center/a | No | Yes |
| link 'SEAM-V: A Hybrid-Decoupled RISC-V Vector Processor' | role | role=link[name="SEAM-V: A Hybrid-Decoupled RISC-V Vector Processor"] | Yes | Yes |
| link 'SEAM-V: A Hybrid-Decoupled RISC-V Vector Processor' | css | center > table > tbody > tr:nth-of-type(3) > td > table > tbody > tr.athing.submission:nth-of-type(1) > td.title:nth-of-type(3) > span.titleline > a | No | Yes |
| link 'arxiv.org' | role | role=link[name="arxiv.org"] | Yes | No |
| link 'arxiv.org' | css | center > table > tbody > tr:nth-of-type(3) > td > table > tbody > tr.athing.submission:nth-of-type(1) > td.title:nth-of-type(3) > span.titleline > span.sitebit.comhead > a | No | Yes |
| link 'Jimmc414' | role | role=link[name="Jimmc414"] | Yes | No |
| link 'Jimmc414' | css | center > table > tbody > tr:nth-of-type(3) > td > table > tbody > tr:nth-of-type(2) > td.subtext:nth-of-type(2) > span.subline > a.hnuser:nth-of-type(1) | No | Yes |
| link '3 minutes ago' | role | role=link[name="3 minutes ago"] | Yes | No |
| link '3 minutes ago' | css | center > table > tbody > tr:nth-of-type(3) > td > table > tbody > tr:nth-of-type(2) > td.subtext:nth-of-type(2) > span.subline > span.age:nth-of-type(2) > a | No | Yes |
| link 'hide' | role | role=link[name="hide"] | Yes | No |
| link 'past' | role | role=link[name="past"] | Yes | No |
| link 'discuss' | role | role=link[name="discuss"] | Yes | No |

Note the two-row structure visible in the raw CSS paths: the title link lives under `tr.athing.submission:nth-of-type(1)` while the author, age, and discuss links for the same story live under the *sibling* `tr:nth-of-type(2) > td.subtext`. treeLine records both paths faithfully but never connects them — that structural comprehension gap is the core of COMPARISON.md.
