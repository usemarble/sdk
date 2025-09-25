import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { parseWebhookEvent, verifyMarbleSignature } from "../../src";

describe("webhooks", () => {
  const secret = "shhh";
  const body = JSON.stringify({
    id: "1",
    type: "post.published",
    createdAt: new Date().toISOString(),
    data: { x: 1 },
  });

  it("valid signature passes", () => {
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = createHmac("sha256", secret)
      .update(`${ts}.${body}`)
      .digest("hex");
    const headers = {
      "x-marble-signature": `t=${ts},v1=${sig}`,
      "x-marble-timestamp": ts,
    };
    expect(() => verifyMarbleSignature(body, headers, secret)).not.toThrow();
  });

  it("invalid signature fails", () => {
    const ts = Math.floor(Date.now() / 1000).toString();
    const headers = {
      "x-marble-signature": `t=${ts},v1=deadbeef`,
      "x-marble-timestamp": ts,
    };
    expect(() => verifyMarbleSignature(body, headers, secret)).toThrowError(
      /Invalid webhook signature/
    );
  });

  it("parseWebhookEvent maps correctly", () => {
    const evt = parseWebhookEvent<{ x: number }>(
      body,
      (d) => d as { x: number }
    );
    expect(evt.type).toBe("post.published");
    expect(evt.data.x).toBe(1);
  });
});
