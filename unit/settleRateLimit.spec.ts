import { afterEach, describe, expect, it, vi } from "vitest";
import type { Page } from "@playwright/test";
import { settleRateLimit } from "../helpers/settleRateLimit";

interface PageState {
  storyRowCount: number;
  bodyText: string;
}

function mockPage(states: PageState[]): {
  page: Page;
  reload: ReturnType<typeof vi.fn>;
  readBody: ReturnType<typeof vi.fn>;
} {
  let index = 0;
  const reload = vi.fn(async () => {
    if (index < states.length - 1) index++;
  });
  const readBody = vi.fn(async () => states[index].bodyText);
  const page = {
    reload,
    locator: (selector: string) => ({
      count: async () => (selector === "tr.athing" ? states[index].storyRowCount : 0),
      innerText: readBody,
    }),
  } as unknown as Page;
  return { page, reload, readBody };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("settleRateLimit", () => {
  it("does not treat a story titled 'Sorry, I quit my job' as the block page when rows are present", async () => {
    const { page, reload, readBody } = mockPage([
      { storyRowCount: 30, bodyText: "Sorry, I quit my job | 2 minutes ago" },
    ]);
    await expect(settleRateLimit(page)).resolves.toBeUndefined();
    expect(reload).not.toHaveBeenCalled();
    expect(readBody).not.toHaveBeenCalled();
  });

  it("detects the block page when zero story rows accompany the 'Sorry' text", async () => {
    vi.useFakeTimers();
    const { page, reload } = mockPage([
      { storyRowCount: 0, bodyText: "Sorry, we're not able to serve your requests this quickly." },
    ]);
    const outcome = settleRateLimit(page).catch((err: unknown) => err);
    await vi.runAllTimersAsync();
    const error = await outcome;
    expect(String(error)).toContain("Exhausted 5 attempts");
    expect(String(error)).toContain("rate-limit");
    expect(reload).toHaveBeenCalledTimes(4);
  });

  it("recovers when a reload brings the story rows back", async () => {
    vi.useFakeTimers();
    const { page, reload } = mockPage([
      { storyRowCount: 0, bodyText: "Sorry, we're not able to serve your requests this quickly." },
      { storyRowCount: 30, bodyText: "Sorry, I quit my job | 2 minutes ago" },
    ]);
    const promise = settleRateLimit(page);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeUndefined();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("settles quietly on a page with no rows and no block message", async () => {
    const { page, reload } = mockPage([
      { storyRowCount: 0, bodyText: "No new submissions." },
    ]);
    await expect(settleRateLimit(page)).resolves.toBeUndefined();
    expect(reload).not.toHaveBeenCalled();
  });
});
