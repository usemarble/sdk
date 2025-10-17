import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MarbleClient } from "../../src";
import type { MarbleOptions } from "../../src";
import { MarbleHttpError } from "../../src";

describe("MarbleClient", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let client: MarbleClient;

  beforeEach(() => {
    mockFetch = vi.fn();
    client = new MarbleClient({
      baseUrl: "https://api.test",
      fetchImpl: mockFetch,
      retryPolicy: null,
    } satisfies MarbleOptions);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  it("listPosts returns mapped posts", async () => {
    mockFetch.mockImplementationOnce(
      async () =>
        ({
          ok: true,
          json: async () => ({
            posts: [
              {
                id: "1",
                slug: "hello-world",
                title: "Hello",
                content: "Content",
                description: "Desc",
                coverImage: "img.png",
                publishedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                authors: [{ id: "a1", name: "Jane" }],
                category: { id: "c1", name: "News", slug: "news" },
                tags: [{ id: "t1", name: "Tag", slug: "tag" }],
              },
            ],
            pagination: {
              limit: 10,
              currentPage: 1,
              nextPage: null,
              previousPage: null,
              totalItems: 1,
              totalPages: 1,
            },
          }),
        }) as any,
    );

    const { posts, pagination } = await client.listPosts();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(posts).toHaveLength(1);
    expect(posts[0]?.slug).toBe("hello-world");
    expect(pagination.totalItems).toBe(1);
  });

  it("throws MarbleHttpError on non-ok response", async () => {
    mockFetch.mockImplementationOnce(
      async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({ error: "not found" }),
          text: async () => "not found",
          headers: { get: () => null },
        }) as any,
    );

    try {
      await client.listPosts();
      throw new Error("Expected listPosts to throw");
    } catch (err: any) {
      expect(mockFetch).toHaveBeenCalledTimes(1);

      expect(err).toBeInstanceOf(MarbleHttpError);
      expect(err.status).toBe(404);
      expect(err.statusText).toBe("Not Found");
      expect(String(err.message)).toMatch(/404/);
    }
  });
});
