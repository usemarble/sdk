/**
 * Build a query string from an object of parameters.
 * - Skips `undefined` and `null`.
 * - Joins array values with commas if the key is `"tags"`.
 * - Repeats array keys for other arrays.
 *
 * @example
 * q({ page: 2, tags: ["js", "ts"] })
 * // => "?page=2&tags=js,ts"
 */
export function q(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      if (k === "tags") usp.set(k, v.join(","));
      else {
        for (const val of v) {
          usp.append(k, String(val));
        }
      }
    } else {
      usp.set(k, String(v));
    }
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

/**
 * Strictly coerce an unknown value into a `Date`.
 * Throws if the value cannot be parsed into a valid date.
 *
 * @param v - The value to coerce (Date | string | number).
 * @param field - Field name for better error messages.
 */
export function toDateStrict(v: unknown, field: string): Date {
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  throw new Error(`Invalid date for ${field}`);
}

/**
 * Normalize a base URL by trimming trailing slashes.
 *
 * @example
 * normalizeBaseUrl("https://api.example.com/")
 * // => "https://api.example.com"
 */
export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Merge two header maps. Later headers overwrite earlier ones.
 */
export function mergeHeaders(
  a: Record<string, string>,
  b?: Record<string, string>
): Record<string, string> {
  return { ...a, ...(b ?? {}) };
}

/**
 * Type guard: check if a value is a plain object.
 */
export function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

/**
 * Type guard: check if a value is a string.
 */
export function isString(x: unknown): x is string {
  return typeof x === "string";
}

/**
 * Type guard: check if a value is a finite number.
 */
export function isNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/**
 * Convert a value to string if possible, otherwise use a fallback.
 */
export function asString(x: unknown, fallback = ""): string {
  return isString(x) ? x : String(x ?? fallback);
}

/**
 * Convert a value into a number, returning `null` if conversion fails.
 */
export function asNullableNumber(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  if (isNumber(x)) return x;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/**
 * Safely convert an unknown array into a typed array using a mapper function.
 *
 * @example
 * asArray(["1", "2"], Number) // => [1, 2]
 */
export function asArray<T>(x: unknown, map: (item: unknown) => T): T[] {
  if (!Array.isArray(x)) return [];
  const out: T[] = [];
  for (const item of x) out.push(map(item));
  return out;
}
