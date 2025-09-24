// Universal HMAC-SHA256 verifier using Web Crypto (Node 18+, Bun, Edge)

function hex(bytes: Uint8Array) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return hex(new Uint8Array(sig));
}

export async function verifySignature(params: {
  signatureHeader: string | null;
  rawBody: string;
  secret: string;
}): Promise<boolean> {
  if (!params.signatureHeader) return false;
  const expected = params.signatureHeader.replace(/^sha256=/, "");
  const computed = await hmacSha256Hex(params.secret, params.rawBody);
  return constantTimeEqualHex(expected, computed);
}

// Backwards-compatible aliases if you referenced edge/node variants:
export const verifySignatureEdge = verifySignature;
export const verifySignatureNode = verifySignature;
