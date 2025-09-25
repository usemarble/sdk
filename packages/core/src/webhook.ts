import { createHmac, timingSafeEqual } from "node:crypto";
import { isRecord, toDateStrict } from "./utils";

export type WebhookEvent<T = unknown> = {
  id: string;
  type: string; 
  createdAt: Date;
  data: T;
};

export type WebhookHeaders = {
  "x-marble-signature": string;
  "x-marble-timestamp"?: string;
} & Record<string, string>;

function computeSignature(secret: string, signedPayload: string): Buffer {
  const h = createHmac("sha256", secret);
  h.update(signedPayload, "utf8");
  return Buffer.from(h.digest("hex"), "hex");
}

function parseProvidedSignature(sigHeader: string): {
  ts?: string;
  sigHex: string;
} {
  if (sigHeader.includes(",")) {
    const parts = sigHeader.split(",").map((s) => s.trim());
    let ts: string | undefined;
    let sigHex = "";
    for (const p of parts) {
      if (p.startsWith("t=")) ts = p.slice(2);
      if (p.startsWith("v1=")) sigHex = p.slice(3);
    }
    return ts !== undefined ? { ts, sigHex } : { sigHex };
  }
  return { sigHex: sigHeader };
}

export type VerifyOptions = {
  includeTimestampInPayload?: boolean;
  toleranceSeconds?: number;
};

export function verifyMarbleSignature(
  rawBody: string,
  headers: WebhookHeaders,
  secret: string,
  opts: VerifyOptions = {}
): true {
  const sigHeader = headers["x-marble-signature"];
  if (!sigHeader) throw new Error("Missing x-marble-signature header");

  const { ts, sigHex } = parseProvidedSignature(sigHeader);
  const timestampHeader = headers["x-marble-timestamp"] ?? ts;

  const includeTs = opts.includeTimestampInPayload ?? Boolean(timestampHeader);
  const tolerance = Math.max(0, opts.toleranceSeconds ?? 300); 

  let signedPayload = rawBody;
  if (includeTs) {
    const t = timestampHeader ?? "";
    if (!t) throw new Error("Timestamp required for timestamped signatures");
    signedPayload = `${t}.${rawBody}`;

    if (tolerance > 0) {
      const tsDate = Number.isFinite(Number(t))
        ? new Date(Number(t) * 1000)
        : new Date(t);
      const now = Date.now();
      const skew = Math.abs(now - tsDate.getTime());
      if (Number.isNaN(tsDate.getTime()) || skew > tolerance * 1000) {
        throw new Error("Timestamp outside tolerance window");
      }
    }
  }

  const expected = computeSignature(secret, signedPayload);
  const provided = Buffer.from(sigHex, "hex");
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    throw new Error("Invalid webhook signature");
  }
  return true;
}

export function parseWebhookEvent<T>(
  jsonBody: string,
  mapData: (u: unknown) => T
): WebhookEvent<T> {
  const parsed = JSON.parse(jsonBody) as unknown;
  if (!isRecord(parsed)) throw new Error("Invalid webhook envelope");

  const id = String(parsed["id"] ?? "");
  const type = String(parsed["type"] ?? "");
  const createdAt = toDateStrict(parsed["createdAt"], "createdAt");
  const dataUnknown = parsed["data"];

  return {
    id,
    type,
    createdAt,
    data: mapData(dataUnknown),
  };
}
