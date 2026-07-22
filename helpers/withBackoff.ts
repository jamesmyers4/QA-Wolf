export interface BackoffOptions {
  maxAttempts: number;
  baseMs: number;
  maxMs: number;
}

const TRANSIENT_NETWORK_MARKERS = [
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "socket hang up",
];

export function isTransientNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as { code?: unknown }).code;
  const haystacks = [err.message, typeof code === "string" ? code : ""];
  return TRANSIENT_NETWORK_MARKERS.some((marker) =>
    haystacks.some((haystack) => haystack.includes(marker)),
  );
}

export function backoffDelay(attempt: number, opts: BackoffOptions): number {
  const raw = Math.min(opts.baseMs * 2 ** attempt, opts.maxMs);
  const jitter = Math.random() * 0.25 * raw;
  return Math.round(raw + jitter);
}

export async function withBackoff<T>(
  fn: () => Promise<T>,
  shouldRetry: (err: unknown) => boolean,
  opts: BackoffOptions = { maxAttempts: 5, baseMs: 2000, maxMs: 30000 },
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!shouldRetry(err)) throw err;
      await new Promise((resolve) =>
        setTimeout(resolve, backoffDelay(attempt, opts)),
      );
    }
  }
  throw new Error(
    `Exhausted ${opts.maxAttempts} attempts: ${String(lastError)}`,
  );
}
