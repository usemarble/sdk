import { describe, it, expect, vi, beforeEach } from "vitest";
import { MarbleClient } from "../../src/client";
import type {
  MarbleOptions,
  RetryPolicy,
  RetryDecision,
  RetryContext,
} from "../../src/types";

describe("MarbleClient retry logic", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  it("retries once on a network error and then succeeds", async () => {
    mockFetch
      .mockImplementationOnce(async () => {
        throw new Error("netfail");
      })
      .mockImplementationOnce(
        async () =>
          ({
            ok: true,
            json: async () => ({
              posts: [],
              pagination: {
                limit: 10,
                currentPage: 1,
                nextPage: null,
                previousPage: null,
                totalItems: 0,
                totalPages: 1,
              },
            }),
          }) as any
      );

    const retryPolicy: RetryPolicy = {
      maxRetries: 1,
      baseDelayMs: 0,
      maxDelayMs: 0,
      shouldRetry: (ctx: RetryContext): RetryDecision | undefined => {
        if (ctx.error) return { delayMs: 0 };
        return undefined;
      },
    };

    const client = new MarbleClient({
      baseUrl: "https://api.test",
      fetchImpl: mockFetch,
      retryPolicy,
    } satisfies MarbleOptions);

    const res = await client.listPosts();
    expect(res.posts).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries on 429 respecting Retry-After header", async () => {
    mockFetch
      .mockImplementationOnce(
        async () =>
          ({
            ok: false,
            status: 429,
            statusText: "Too Many Requests",
            headers: {
              get: (k: string) =>
                k.toLowerCase() === "retry-after" ? "0" : null,
            },
            json: async () => ({ error: "rate" }),
            text: async () => "rate",
          }) as any
      )
      .mockImplementationOnce(
        async () =>
          ({
            ok: true,
            json: async () => ({
              posts: [],
              pagination: {
                limit: 10,
                currentPage: 1,
                nextPage: null,
                previousPage: null,
                totalItems: 0,
                totalPages: 1,
              },
            }),
          }) as any
      );

    const retryPolicy: RetryPolicy = {
      maxRetries: 1,
      baseDelayMs: 0,
      maxDelayMs: 0,
      shouldRetry: (ctx) => {
        if (ctx.response?.status === 429) return { delayMs: 0 };
        return undefined;
      },
    };

    const client = new MarbleClient({
      baseUrl: "https://api.test",
      fetchImpl: mockFetch,
      retryPolicy,
    } satisfies MarbleOptions);

    const res = await client.listPosts();
    expect(res.posts).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
