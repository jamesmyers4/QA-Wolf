# Generated POM and specs for /newest (excerpts)

treeLine generated a 531-line page object (`newest.page.ts`, 30 KB), a smoke spec, and a skip-wrapped proposed spec for /newest. Embedded here as markdown excerpts (the appendix ships markdown only; raw crawl output is gitignored). All code below is treeLine's output, unedited — including its bugs, which are reviewed in [COMPARISON.md](COMPARISON.md).

## newest.page.ts — field declarations (first story rows of ~260 fields)

```ts
import { Page, Locator } from '@playwright/test'

export class NewestPage {
  readonly page: Page
  readonly hackerNewsLink: Locator
  readonly newLink: Locator
  readonly pastLink1: Locator
  readonly commentsLink: Locator
  readonly askLink: Locator
  readonly showLink: Locator
  readonly jobsLink: Locator
  readonly submitLink: Locator
  readonly loginLink: Locator
  readonly linkA1: Locator
  readonly sEAMVAHybridDecoupledRISCVVectorProcessorLink: Locator
  readonly arxivOrgLink1: Locator
  readonly jimmc414Link1: Locator
  readonly 3MinutesAgoLink1: Locator
  readonly hideLink1: Locator
  readonly pastLink2: Locator
  readonly discussLink1: Locator
  readonly linkA2: Locator
  readonly anExplosionOfSurveillanceTowersIsComingToUSBordersCosting1BLink: Locator
  readonly effOrgLink: Locator
  readonly jimmc414Link2: Locator
  readonly 3MinutesAgoLink2: Locator
  ...
```

## newest.page.ts — constructor (first two story rows of ~30)

```ts
  constructor(page: Page) {
    this.page = page
    this.hackerNewsLink = page.getByRole("link", { name: "Hacker News" })
    this.newLink = page.getByRole("link", { name: "new" })
    this.pastLink1 = page.getByRole("link", { name: "past" }).nth(0)
    this.commentsLink = page.getByRole("link", { name: "comments" })
    this.askLink = page.getByRole("link", { name: "ask" })
    this.showLink = page.getByRole("link", { name: "show" })
    this.jobsLink = page.getByRole("link", { name: "jobs" })
    this.submitLink = page.getByRole("link", { name: "submit" })
    this.loginLink = page.getByRole("link", { name: "login" })
    this.linkA1 = page.locator("#up_49000525")
    this.sEAMVAHybridDecoupledRISCVVectorProcessorLink = page.getByRole("link", { name: "SEAM-V: A Hybrid-Decoupled RISC-V Vector Processor" })
    this.arxivOrgLink1 = page.getByRole("link", { name: "arxiv.org" }).nth(0)
    this.jimmc414Link1 = page.getByRole("link", { name: "Jimmc414" }).nth(0)
    this.3MinutesAgoLink1 = page.getByRole("link", { name: "3 minutes ago" }).nth(0)
    this.hideLink1 = page.getByRole("link", { name: "hide" }).nth(0)
    this.pastLink2 = page.getByRole("link", { name: "past" }).nth(1)
    this.discussLink1 = page.getByRole("link", { name: "discuss" }).nth(0)
    this.linkA2 = page.locator("#up_49000520")
    this.anExplosionOfSurveillanceTowersIsComingToUSBordersCosting1BLink = page.getByRole("link", { name: "An Explosion of Surveillance Towers Is Coming to US Borders, Costing $1B+" })
    this.effOrgLink = page.getByRole("link", { name: "eff.org" })
    this.jimmc414Link2 = page.getByRole("link", { name: "Jimmc414" }).nth(1)
    this.3MinutesAgoLink2 = page.getByRole("link", { name: "3 minutes ago" }).nth(1)
    ...
  }

  async goto(): Promise<void> {
    await this.page.goto("https://news.ycombinator.com/newest")
  }
```

## newest.spec.ts — generated smoke spec (complete)

```ts
import { test, expect } from '@playwright/test'
import { NewestPage } from './newest.page'

test('NewestPage loads', async ({ page }) => {
  const newestPage = new NewestPage(page)
  await newestPage.goto()
  await expect(page).toHaveURL("https://news.ycombinator.com/newest")
})
```

## newest.proposed.spec.ts — AI-proposed spec, skip-wrapped behind the human-review gate (complete)

```ts
// AI-PROPOSED TEST — UNVERIFIED, NOT RUN AGAINST THE REAL PAGE.
// treeline never fills or submits real forms during generation; the scenario,
// fill values, and success assertion below are a model guess based only on
// the page's captured aria snapshot and form structure. Review every line
// against the real page before removing test.skip.

import { test, expect } from '@playwright/test'

test.skip("A user wants to search Hacker News for stories mentioning a generic placeholder topic, \"Test Example\", using the search box on the New Links page, which submits to the HN Algolia search engine.", async ({ page }) => {
  await page.goto("https://news.ycombinator.com/newest")
  await page.locator("center > table > tbody > tr:nth-of-type(4) > td > center:nth-of-type(2) > form > input").fill("Test Example")
  await page.getByRole("button", { name: /submit|create|save|continue|send/i }).click()

  // Unverified guess — treeline has not observed this page's real post-submission behavior:
  // After submitting, the page navigates to hn.algolia.com with the query reflected in the URL (e.g., a "query=Test+Example" parameter), and a results list of matching stories becomes visible on the page.
  // This success assertion is an unverified guess: treeline never fills or submits real forms, so it has not observed this page's actual post-submission behavior.
})
```
