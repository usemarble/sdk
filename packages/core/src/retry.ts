import type { RetryDecision, RetryPolicy, RetryContext } from "./types";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function parseRetryAfter(h: string): number | null {
  const secs = Number(h);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const d = new Date(h);
  const ms = d.getTime() - Date.now();
  return Number.isFinite(ms) ? Math.max(0, ms) : null;
}

export function computeJitteredBackoff(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  const exp = baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
  const capped = clamp(exp, baseDelayMs, maxDelayMs);
  return Math.floor(Math.random() * (capped + 1));
}

export const defaultRetryPolicy: Required<RetryPolicy> = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 8000,
  shouldRetry: (ctx: RetryContext): RetryDecision | undefined => {
    if (ctx.error) {
      const delayMs = computeJitteredBackoff(ctx.attempt, 250, 8000);
      return { delayMs };
    }
    const res = ctx.response!;
    if (res.status === 429) {
      const ra = res.headers.get("retry-after");
      if (ra) {
        const p = parseRetryAfter(ra);
        if (p != null) return { delayMs: p };
      }
      return { delayMs: computeJitteredBackoff(ctx.attempt, 250, 8000) };
    }
    if (res.status >= 500 && res.status <= 599) {
      return { delayMs: computeJitteredBackoff(ctx.attempt, 250, 8000) };
    }
    return undefined;
  },
};

export async function sleep(ms: number, signal: AbortSignal | null | undefined): Promise<void> {
  if (ms <= 0) return;
  if (signal?.aborted) throw new Error("Aborted");
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(t);
      signal?.removeEventListener("abort", onAbort);
      reject(new Error("Aborted"));
    };
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
  });
}
