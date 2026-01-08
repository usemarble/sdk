import type { RetryContext, RetryDecision, RetryPolicy } from "./types";

/** @internal Clamp a number between min and max (inclusive). */
function clamp(n: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, n));
}

/**
 * @internal Parse an HTTP `Retry-After` header into milliseconds.
 * Supports both delta-seconds (e.g. `"3"`) and HTTP-date values.
 * Returns `null` when the value cannot be parsed.
 */
function parseRetryAfter(h: string): number | null {
	const secs = Number(h);
	if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
	const d = new Date(h);
	const ms = d.getTime() - Date.now();
	return Number.isFinite(ms) ? Math.max(0, ms) : null;
}

/**
 * Compute an exponential backoff delay with full jitter.
 *
 * Formula:
 * - raw: `baseDelayMs * 2^(attempt-1)` (attempt is 1-based)
 * - capped to `[baseDelayMs, maxDelayMs]`
 * - randomized uniformly in `[0, capped]`
 */
export function computeJitteredBackoff(
	attempt: number,
	baseDelayMs: number,
	maxDelayMs: number,
): number {
	const exp = baseDelayMs * 2 ** Math.max(0, attempt - 1);
	const capped = clamp(exp, baseDelayMs, maxDelayMs);
	return Math.floor(Math.random() * (capped + 1));
}

/**
 * Default retry policy:
 * - Retries on network errors
 * - Retries on `429` (honors `Retry-After`)
 * - Retries on `5xx`
 * - Jittered exponential backoff
 *
 * Limits:
 * - `maxRetries`: 3
 * - `baseDelayMs`: 250
 * - `maxDelayMs`: 8000
 */
export const defaultRetryPolicy: Required<RetryPolicy> = {
	maxRetries: 3,
	baseDelayMs: 250,
	maxDelayMs: 8000,
	shouldRetry: (ctx: RetryContext): RetryDecision | undefined => {
		// Network / fetch errors (no response available)
		if (ctx.error) {
			const delayMs = computeJitteredBackoff(ctx.attempt, 250, 8000);
			return { delayMs };
		}

		const res = ctx.response;
		if (!res) return undefined;

		// 429: honor Retry-After when present
		if (res.status === 429) {
			const ra = res.headers.get("retry-after");
			if (ra) {
				const p = parseRetryAfter(ra);
				if (p != null) return { delayMs: p };
			}
			return { delayMs: computeJitteredBackoff(ctx.attempt, 250, 8000) };
		}

		// 5xx series
		if (res.status >= 500 && res.status <= 599) {
			return { delayMs: computeJitteredBackoff(ctx.attempt, 250, 8000) };
		}

		return undefined;
	},
};

/**
 * Sleep for the given duration, abortable via `AbortSignal`.
 *
 * Rejects with `"Aborted"` if the signal fires before the timeout completes.
 */
export async function sleep(
	ms: number,
	signal: AbortSignal | null | undefined,
): Promise<void> {
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
