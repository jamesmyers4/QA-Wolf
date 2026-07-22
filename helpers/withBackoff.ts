export interface BackoffOptions {
  maxAttempts: number;
  baseMs: number;
  maxMs: number;
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
