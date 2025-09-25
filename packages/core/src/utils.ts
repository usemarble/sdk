export function q(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      if (k === "tags") usp.set(k, v.join(","));
      else v.forEach((val) => usp.append(k, String(val)));
    } else {
      usp.set(k, String(v));
    }
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

export function toDateStrict(v: unknown, field: string): Date {
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  throw new Error(`Invalid date for ${field}`);
}

export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function mergeHeaders(
  a: Record<string, string>,
  b?: Record<string, string>
): Record<string, string> {
  return { ...a, ...(b ?? {}) };
}

export function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

export function isString(x: unknown): x is string {
  return typeof x === "string";
}

export function isNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export function asString(x: unknown, fallback = ""): string {
  return isString(x) ? x : String(x ?? fallback);
}

export function asNullableNumber(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  if (isNumber(x)) return x;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

export function asArray<T>(x: unknown, map: (item: unknown) => T): T[] {
  if (!Array.isArray(x)) return [];
  const out: T[] = [];
  for (const item of x) out.push(map(item));
  return out;
}
