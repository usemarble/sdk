import { describe, it, expect, vi, beforeEach } from "vitest";
import { MarbleClient } from "../../src/client";
import type { MarbleOptions } from "../../src/types";

function mkPage(page: number, nextPage: number | null) {
  return {
    posts: [
      {
        id: `id-${page}`,
        slug: `slug-${page}`,
        title: `title-${page}`,
        content: "",
        description: "",
        coverImage: "",
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authors: [],
        category: { id: "c1", name: "News", slug: "news" },
        tags: [],
      },
    ],
    pagination: {
      limit: 1,
      currentPage: page,
      nextPage,
      previousPage: page > 1 ? page - 1 : null,
      totalItems: nextPage ? 2 : page,
      totalPages: nextPage ? 2 : page,
    },
  };
}

describe("pagination helpers", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let client: MarbleClient;

  beforeEach(() => {
    mockFetch = vi.fn(async (url: string) => {
      const u = new URL(url);
      const pageParam = Number(u.searchParams.get("page") ?? "1");
      if (pageParam === 1) {
        return { ok: true, json: async () => mkPage(1, 2) } as any;
      }
      if (pageParam === 2) {
        return { ok: true, json: async () => mkPage(2, null) } as any;
      }
      return { ok: true, json: async () => mkPage(pageParam, null) } as any;
    });

    client = new MarbleClient({
      baseUrl: "https://api.test",
      fetchImpl: mockFetch,
      retryPolicy: null,
    } satisfies MarbleOptions);
  });

  it("iteratePostPages yields each page with nextPage chaining", async () => {
    const pages: number[] = [];
    for await (const page of client.iteratePostPages(
      {},
      { pageSize: 1, startPage: 1 }
    )) {
      pages.push(page.pagination.currentPage);
    }
    expect(pages).toEqual([1, 2]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("paginatePosts flattens posts across pages", async () => {
    const slugs: string[] = [];
    for await (const post of client.paginatePosts(
      {},
      { pageSize: 1, startPage: 1 }
    )) {
      slugs.push(post.slug);
    }
    expect(slugs).toEqual(["slug-1", "slug-2"]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
