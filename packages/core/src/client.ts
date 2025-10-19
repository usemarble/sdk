import { z } from "zod";
import type {
  MarbleOptions,
  RequestOptions,
  PostsListParams,
  MarblePostList,
  MarblePost,
  MarbleTagList,
  MarbleCategoryList,
  MarbleAuthorList,
  Post,
  Pagination,
  PaginateOptions,
  PostsScanParams,
  RetryPolicy,
} from "./types";
import { q, normalizeBaseUrl, mergeHeaders } from "./utils";
import { MarbleHttpError } from "./errors";
import {
  ApiListAuthorsResponse,
  ApiListCategoriesResponse,
  ApiListPostsResponse,
  ApiListTagsResponse,
  ApiPost,
} from "./schemas";
import { defaultRetryPolicy, sleep } from "./retry";

/**
 * Main SDK entrypoint for interacting with the Marble API.
 *
 * Example:
 * ```ts
 * const marble = new MarbleClient({
 *   baseUrl: "https://api.marble.io",
 *   apiKey: "sk_123"
 * });
 * const posts = await marble.listPosts({ limit: 10 });
 * ```
 */
export class MarbleClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly fetcher: typeof fetch;
  private readonly extraHeaders: Record<string, string>;
  private readonly retryPolicy: RetryPolicy | null;

  /**
   * Create a new MarbleClient.
   * @param opts Configuration options (baseUrl is required)
   */
  constructor(opts: MarbleOptions) {
    if (!opts?.baseUrl) throw new Error("MarbleClient: baseUrl is required");
    this.baseUrl = normalizeBaseUrl(opts.baseUrl);
    this.apiKey = opts.apiKey;
    this.fetcher = opts.fetchImpl ?? fetch;
    this.extraHeaders = opts.headers ?? {};
    this.retryPolicy =
      opts.retryPolicy === undefined ? defaultRetryPolicy : opts.retryPolicy;
  }

  /**
   * List published posts with optional filters (pagination, tags, search, etc.).
   *
   * @param params Query params like `limit`, `page`, `tags`, etc.
   * @param ro Optional request options (e.g. `AbortSignal`).
   * @returns A list of posts plus pagination info.
   */
  async listPosts(
    params: PostsListParams = {},
    ro?: RequestOptions,
  ): Promise<MarblePostList> {
    const raw = await this.getJson(
      `/posts${q(params)}`,
      ApiListPostsResponse,
      ro,
    );
    const rawPosts = raw.posts ?? raw.data ?? [];

    const posts: Post[] = rawPosts.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      content: p.content ?? "",
      featured: p.featured,
      description: p.description ?? "",
      coverImage: p.coverImage ?? "",
      publishedAt: new Date(p.publishedAt),
      updatedAt: new Date(p.updatedAt ?? p.publishedAt),
      authors: (p.authors ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        slug: "",
        image: a.image ?? null,
        bio: null,
        role: null,
        socials: [],
      })),
      category: {
        id: p.category.id,
        name: p.category.name,
        slug: p.category.slug,
        description: null,
      },
      tags: (p.tags ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: null,
      })),
      attribution: p.attribution
        ? { author: p.attribution.author ?? "", url: p.attribution.url ?? "" }
        : null,
    }));

    const p1 = raw.pagination ?? raw.meta?.pagination;
    const pagination: Pagination = p1
      ? {
          limit: p1.limit,
          currentPage: p1.currentPage,
          nextPage: p1.nextPage,
          previousPage: p1.previousPage,
          totalItems: p1.totalItems,
          totalPages: p1.totalPages,
        }
      : {
          limit: posts.length,
          currentPage: params.page ?? 1,
          nextPage: null,
          previousPage: null,
          totalItems: posts.length,
          totalPages: 1,
        };

    return { posts, pagination };
  }

  /**
   * Fetch a single post by its slug or ID.
   *
   * @param slugOrId Post slug or numeric ID.
   * @param ro Optional request options (e.g. `AbortSignal`).
   * @returns A single post object.
   */
  async getPost(slugOrId: string, ro?: RequestOptions): Promise<MarblePost> {
    const raw = await this.getJson(
      `/posts/${encodeURIComponent(slugOrId)}`,
      ApiPost,
      ro,
    );
    const post: Post = {
      id: raw.id,
      slug: raw.slug,
      title: raw.title,
      content: raw.content ?? "",
      featured: raw.featured,
      description: raw.description ?? "",
      coverImage: raw.coverImage ?? "",
      publishedAt: new Date(raw.publishedAt),
      updatedAt: new Date(raw.updatedAt ?? raw.publishedAt),
      authors: (raw.authors ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        slug: "",
        image: a.image ?? null,
        bio: null,
        role: null,
        socials: [],
      })),
      category: {
        id: raw.category.id,
        name: raw.category.name,
        slug: raw.category.slug,
        description: null,
      },
      tags: (raw.tags ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: null,
      })),
      attribution: raw.attribution
        ? {
            author: raw.attribution.author ?? "",
            url: raw.attribution.url ?? "",
          }
        : null,
    };
    return { post };
  }

  /**
   * List tags (supports pagination if the API provides it).
   *
   * @param params Optional pagination params `{ page, limit }`.
   * @param ro Optional request options.
   * @returns A list of tags plus pagination info.
   */
  async listTags(
    params: { page?: number; limit?: number } = {},
    ro?: RequestOptions,
  ): Promise<MarbleTagList> {
    const raw = await this.getJson(
      `/tags${q(params)}`,
      ApiListTagsResponse,
      ro,
    );
    const tags = (raw.tags ?? raw.data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: null,
      count: { posts: 0 },
    }));
    const p2 = raw.pagination ?? raw.meta?.pagination;
    const pagination: Pagination = p2
      ? {
          limit: p2.limit,
          currentPage: p2.currentPage,
          nextPage: p2.nextPage,
          previousPage: p2.previousPage,
          totalItems: p2.totalItems,
          totalPages: p2.totalPages,
        }
      : {
          limit: tags.length,
          currentPage: params.page ?? 1,
          nextPage: null,
          previousPage: null,
          totalItems: tags.length,
          totalPages: 1,
        };
    return { tags, pagination };
  }

  /**
   * List categories (supports pagination if the API provides it).
   *
   * @param params Optional pagination params `{ page, limit }`.
   * @param ro Optional request options.
   * @returns A list of categories plus pagination info.
   */
  async listCategories(
    params: { page?: number; limit?: number } = {},
    ro?: RequestOptions,
  ): Promise<MarbleCategoryList> {
    const raw = await this.getJson(
      `/categories${q(params)}`,
      ApiListCategoriesResponse,
      ro,
    );
    const categories = (raw.categories ?? raw.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: null,
      count: { posts: 0 },
    }));
    const p3 = raw.pagination ?? raw.meta?.pagination;
    const pagination: Pagination = p3
      ? {
          limit: p3.limit,
          currentPage: p3.currentPage,
          nextPage: p3.nextPage,
          previousPage: p3.previousPage,
          totalItems: p3.totalItems,
          totalPages: p3.totalPages,
        }
      : {
          limit: categories.length,
          currentPage: params.page ?? 1,
          nextPage: null,
          previousPage: null,
          totalItems: categories.length,
          totalPages: 1,
        };
    return { categories, pagination };
  }

  /**
   * List authors (supports pagination if the API provides it).
   *
   * @param params Optional pagination params `{ page, limit }`.
   * @param ro Optional request options.
   * @returns A list of authors plus pagination info.
   */
  async listAuthors(
    params: { page?: number; limit?: number } = {},
    ro?: RequestOptions,
  ): Promise<MarbleAuthorList> {
    const raw = await this.getJson(
      `/authors${q(params)}`,
      ApiListAuthorsResponse,
      ro,
    );
    const authors = (raw.authors ?? raw.data ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      slug: "",
      image: a.image ?? null,
      bio: null,
      role: null,
      socials: [],
    }));
    const p4 = raw.pagination ?? raw.meta?.pagination;
    const pagination: Pagination = p4
      ? {
          limit: p4.limit,
          currentPage: p4.currentPage,
          nextPage: p4.nextPage,
          previousPage: p4.previousPage,
          totalItems: p4.totalItems,
          totalPages: p4.totalPages,
        }
      : {
          limit: authors.length,
          currentPage: params.page ?? 1,
          nextPage: null,
          previousPage: null,
          totalItems: authors.length,
          totalPages: 1,
        };
    return { authors, pagination };
  }

  /**
   * Iterate through pages of posts.
   *
   * Useful for batch processing or background syncs.
   */
  async *iteratePostPages(
    params: PostsScanParams = {},
    opts: PaginateOptions = {},
  ): AsyncGenerator<MarblePostList, void, unknown> {
    const pageSize = opts.pageSize ?? 20;
    let page = opts.startPage ?? 1;
    let pagesRead = 0;

    const ro = opts.signal !== undefined ? { signal: opts.signal } : undefined;

    while (true) {
      this.ensureNotAborted(opts.signal);

      const pageData = await this.listPosts(
        { ...params, page, limit: pageSize },
        ro,
      );

      yield pageData;

      pagesRead++;
      const next = pageData.pagination.nextPage;
      if (next == null) break;
      if (opts.maxPages != null && pagesRead >= opts.maxPages) break;

      page = next;
    }
  }

  /**
   * Iterate through all posts, flattening across pages.
   *
   * Use this if you want to process posts one-by-one without manual pagination.
   */
  async *paginatePosts(
    params: PostsScanParams = {},
    opts: PaginateOptions = {},
  ): AsyncGenerator<Post, void, unknown> {
    for await (const page of this.iteratePostPages(params, opts)) {
      for (const post of page.posts) {
        this.ensureNotAborted(opts.signal);
        yield post;
      }
    }
  }

  /**
   * Iterate through tag pages.
   */
  async *iterateTagPages(
    opts: PaginateOptions = {},
  ): AsyncGenerator<MarbleTagList, void, unknown> {
    const pageSize = opts.pageSize ?? 50;
    let page = opts.startPage ?? 1;
    let pagesRead = 0;
    const ro = opts.signal !== undefined ? { signal: opts.signal } : undefined;

    while (true) {
      this.ensureNotAborted(opts.signal);
      const data = await this.listTags({ page, limit: pageSize }, ro);
      yield data;

      pagesRead++;
      const next = data.pagination.nextPage;
      if (next == null) break;
      if (opts.maxPages != null && pagesRead >= opts.maxPages) break;

      page = next;
    }
  }

  /**
   * Iterate through category pages.
   */
  async *iterateCategoryPages(
    opts: PaginateOptions = {},
  ): AsyncGenerator<MarbleCategoryList, void, unknown> {
    const pageSize = opts.pageSize ?? 50;
    let page = opts.startPage ?? 1;
    let pagesRead = 0;
    const ro = opts.signal !== undefined ? { signal: opts.signal } : undefined;

    while (true) {
      this.ensureNotAborted(opts.signal);
      const data = await this.listCategories({ page, limit: pageSize }, ro);
      yield data;

      pagesRead++;
      const next = data.pagination.nextPage;
      if (next == null) break;
      if (opts.maxPages != null && pagesRead >= opts.maxPages) break;

      page = next;
    }
  }

  /**
   * Iterate through author pages.
   */
  async *iterateAuthorPages(
    opts: PaginateOptions = {},
  ): AsyncGenerator<MarbleAuthorList, void, unknown> {
    const pageSize = opts.pageSize ?? 50;
    let page = opts.startPage ?? 1;
    let pagesRead = 0;
    const ro = opts.signal !== undefined ? { signal: opts.signal } : undefined;

    while (true) {
      this.ensureNotAborted(opts.signal);
      const data = await this.listAuthors({ page, limit: pageSize }, ro);
      yield data;

      pagesRead++;
      const next = data.pagination.nextPage;
      if (next == null) break;
      if (opts.maxPages != null && pagesRead >= opts.maxPages) break;

      page = next;
    }
  }

  // ---- private helpers ----

  private ensureNotAborted(signal: AbortSignal | null | undefined) {
    if (signal?.aborted) throw new Error("Aborted");
  }

  private async getJson<T extends z.ZodTypeAny>(
    path: string,
    schema: T,
    ro?: RequestOptions,
  ): Promise<z.infer<T>> {
    const policy = this.retryPolicy;
    const maxRetries = policy
      ? (policy.maxRetries ?? defaultRetryPolicy.maxRetries)
      : 0;

    let attempt = 0;
    while (true) {
      attempt++;
      try {
        const init: RequestInit = {
          method: "GET",
          headers: this.headers(),
        };
        if (ro?.signal) init.signal = ro.signal;

        const res = await this.fetcher(`${this.baseUrl}${path}`, init);
        if (!res.ok) {
          if (policy) {
            const decision = policy.shouldRetry({ attempt, response: res });
            if (decision && attempt <= maxRetries) {
              await sleep(decision.delayMs, ro?.signal);
              continue;
            }
          }
          let body: unknown;
          try {
            body = await res.json();
          } catch {
            try {
              body = await res.text();
            } catch {}
          }
          throw new MarbleHttpError(
            `GET ${path} failed: ${res.status} ${res.statusText}`,
            {
              status: res.status,
              statusText: res.statusText,
              body,
            },
          );
        }
        const data = await res.json();
        return schema.parse(data);
      } catch (err) {
        if (policy) {
          const decision = policy.shouldRetry({
            attempt,
            error: err as unknown,
          });
          if (decision && attempt <= maxRetries) {
            await sleep(decision.delayMs, ro?.signal);
            continue;
          }
        }
        throw err;
      }
    }
  }

  private headers(): Record<string, string> {
    const h = mergeHeaders(
      { "Content-Type": "application/json" },
      this.extraHeaders,
    );
    if (this.apiKey !== undefined) h.Authorization = `Bearer ${this.apiKey}`;
    return h;
  }
}
