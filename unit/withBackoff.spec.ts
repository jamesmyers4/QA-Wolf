import { afterEach, describe, expect, it, vi } from "vitest";
import {
  backoffDelay,
  isTransientNetworkError,
  withBackoff,
  type BackoffOptions,
} from "../helpers/withBackoff";

class RetryableError extends Error {}

const opts: BackoffOptions = { maxAttempts: 4, baseMs: 100, maxMs: 400 };

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("backoffDelay", () => {
  it("doubles the delay each attempt until the cap", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(backoffDelay(0, opts)).toBe(100);
    expect(backoffDelay(1, opts)).toBe(200);
    expect(backoffDelay(2, opts)).toBe(400);
  });

  it("caps the raw delay at maxMs for all later attempts", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(backoffDelay(3, opts)).toBe(400);
    expect(backoffDelay(10, opts)).toBe(400);
    expect(backoffDelay(50, opts)).toBe(400);
  });

  it("adds at most 25% jitter on top of the raw delay", () => {
    for (let run = 0; run < 200; run++) {
      const delay = backoffDelay(2, opts);
      expect(delay).toBeGreaterThanOrEqual(400);
      expect(delay).toBeLessThanOrEqual(500);
    }
  });
});

describe("isTransientNetworkError", () => {
  it("classifies each transient marker in the message as retryable", () => {
    expect(isTransientNetworkError(new Error("read ECONNRESET"))).toBe(true);
    expect(isTransientNetworkError(new Error("connect ETIMEDOUT 1.2.3.4:443"))).toBe(true);
    expect(isTransientNetworkError(new Error("getaddrinfo EAI_AGAIN hacker-news.firebaseio.com"))).toBe(true);
    expect(isTransientNetworkError(new Error("socket hang up"))).toBe(true);
  });

  it("classifies a wrapped Playwright request error as retryable", () => {
    expect(
      isTransientNetworkError(
        new Error("apiRequestContext.get: read ECONNRESET"),
      ),
    ).toBe(true);
  });

  it("classifies an error carrying only a transient code property as retryable", () => {
    const err = new Error("request to firebase failed");
    (err as { code?: string }).code = "ECONNRESET";
    expect(isTransientNetworkError(err)).toBe(true);
  });

  it("rejects non-transient failures so they still fail immediately", () => {
    expect(isTransientNetworkError(new Error("HN API request for /newstories.json failed with status 404"))).toBe(false);
    expect(isTransientNetworkError(new Error("Unexpected token < in JSON at position 0"))).toBe(false);
    expect(isTransientNetworkError(new Error("ENOTDIR: not a directory"))).toBe(false);
  });

  it("rejects non-Error values", () => {
    expect(isTransientNetworkError("ECONNRESET")).toBe(false);
    expect(isTransientNetworkError(undefined)).toBe(false);
    expect(isTransientNetworkError({ code: "ECONNRESET" })).toBe(false);
  });
});

describe("withBackoff", () => {
  it("returns immediately on first success without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withBackoff(fn, () => true, opts)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries a retryable failure and returns the eventual success", async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new RetryableError("rate limited"))
      .mockResolvedValue("ok");
    const promise = withBackoff(
      fn,
      (err) => err instanceof RetryableError,
      opts,
    );
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("rethrows immediately when shouldRetry rejects the error", async () => {
    const fatal = new Error("not found");
    const fn = vi.fn().mockRejectedValue(fatal);
    await expect(
      withBackoff(fn, (err) => err instanceof RetryableError, opts),
    ).rejects.toBe(fatal);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries a simulated connection reset when classified by isTransientNetworkError", async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("apiRequestContext.get: read ECONNRESET"))
      .mockResolvedValue("recovered");
    const promise = withBackoff(fn, isTransientNetworkError, opts);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("fails immediately on a non-transient error under isTransientNetworkError", async () => {
    const fatal = new Error("HN API request failed with status 404");
    const fn = vi.fn().mockRejectedValue(fatal);
    await expect(withBackoff(fn, isTransientNetworkError, opts)).rejects.toBe(fatal);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after maxAttempts and names the exhaustion in the error", async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockRejectedValue(new RetryableError("rate limited"));
    const promise = withBackoff(fn, () => true, opts);
    const outcome = promise.catch((err: unknown) => err);
    await vi.runAllTimersAsync();
    const error = await outcome;
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).toContain("Exhausted 4 attempts");
    expect(String(error)).toContain("rate limited");
    expect(fn).toHaveBeenCalledTimes(4);
  });
});
