import { describe, it, expect, vi, beforeEach } from "vitest";
import { MarbleClient } from "../../src/client";
import type {
  MarbleOptions,
  RetryPolicy,
  RetryContext,
  RetryDecision,
} from "../../src/types";

describe("MarbleClient aborts", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  it("propagates abort when fetch rejects with Aborted", async () => {
    mockFetch.mockImplementationOnce(async () => {
      throw new Error("Aborted");
    });

    const client = new MarbleClient({
      baseUrl: "https://api.test",
      fetchImpl: mockFetch,
      retryPolicy: null,
    } satisfies MarbleOptions);

    await expect(client.listPosts()).rejects.toThrow(/Aborted/);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("aborts while waiting between retries (sleep respects signal)", async () => {
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
          }) as any,
      );

    const retryPolicy: RetryPolicy = {
      maxRetries: 3,
      baseDelayMs: 50,
      maxDelayMs: 50,
      shouldRetry: (ctx: RetryContext): RetryDecision | undefined => {
        if (ctx.error) return { delayMs: 50 };
        return undefined;
      },
    };

    const client = new MarbleClient({
      baseUrl: "https://api.test",
      fetchImpl: mockFetch,
      retryPolicy,
    } satisfies MarbleOptions);

    const ac = new AbortController();

    const p = client.listPosts({}, { signal: ac.signal });
    ac.abort();

    await expect(p).rejects.toThrow(/Aborted/);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
