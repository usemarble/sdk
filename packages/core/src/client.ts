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

export class MarbleClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly fetcher: typeof fetch;
  private readonly extraHeaders: Record<string, string>;

  constructor(opts: MarbleOptions) {
    if (!opts?.baseUrl) throw new Error("MarbleClient: baseUrl is required");
    this.baseUrl = normalizeBaseUrl(opts.baseUrl);
    this.apiKey = opts.apiKey;
    this.fetcher = opts.fetchImpl ?? fetch;
    this.extraHeaders = opts.headers ?? {};
  }

  private headers(): Record<string, string> {
    const h = mergeHeaders(
      { "Content-Type": "application/json" },
      this.extraHeaders
    );
    if (this.apiKey !== undefined) h.Authorization = `Bearer ${this.apiKey}`;
    return h;
  }

  private async getJson<T extends z.ZodTypeAny>(
    path: string,
    schema: T,
    ro?: RequestOptions
  ): Promise<z.infer<T>> {
    const res = await this.fetcher(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: this.headers(),
      signal: ro?.signal ?? null,
    });
    if (!res.ok) {
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
        }
      );
    }
    const data = await res.json();
    return schema.parse(data);
  }

  async listPosts(
    params: PostsListParams = {},
    ro?: RequestOptions
  ): Promise<MarblePostList> {
    const raw = await this.getJson(
      `/posts${q(params)}`,
      ApiListPostsResponse,
      ro
    );
    const rawPosts = raw.posts ?? raw.data ?? [];

    const posts: Post[] = rawPosts.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      content: p.content ?? "",
      description: p.description ?? "",
      coverImage: p.coverImage ?? "",
      publishedAt: new Date(p.publishedAt),
      updatedAt: new Date(p.updatedAt ?? p.publishedAt),
      authors: (p.authors ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        image: a.image ?? "",
      })),
      category: p.category,
      tags: p.tags ?? [],
      attribution: p.attribution
        ? { author: p.attribution.author ?? "", url: p.attribution.url ?? "" }
        : null,
    }));

    const pagination: Pagination = raw.pagination ??
      raw.meta?.pagination ?? {
        limit: posts.length,
        currentPage: params.page ?? 1,
        nextPage: null,
        previousPage: null,
        totalItems: posts.length,
        totalPages: 1,
      };

    return { posts, pagination };
  }

  async getPost(slugOrId: string, ro?: RequestOptions): Promise<MarblePost> {
    const raw = await this.getJson(
      `/posts/${encodeURIComponent(slugOrId)}`,
      ApiPost,
      ro
    );
    const post: Post = {
      id: raw.id,
      slug: raw.slug,
      title: raw.title,
      content: raw.content ?? "",
      description: raw.description ?? "",
      coverImage: raw.coverImage ?? "",
      publishedAt: new Date(raw.publishedAt),
      updatedAt: new Date(raw.updatedAt ?? raw.publishedAt),
      authors: (raw.authors ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        image: a.image ?? "",
      })),
      category: raw.category,
      tags: raw.tags ?? [],
      attribution: raw.attribution
        ? {
            author: raw.attribution.author ?? "",
            url: raw.attribution.url ?? "",
          }
        : null,
    };
    return { post };
  }

  async listTags(ro?: RequestOptions): Promise<MarbleTagList> {
    const raw = await this.getJson(`/tags`, ApiListTagsResponse, ro);
    const tags = (raw.tags ?? raw.data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
    }));
    const pagination: Pagination = raw.pagination ??
      raw.meta?.pagination ?? {
        limit: tags.length,
        currentPage: 1,
        nextPage: null,
        previousPage: null,
        totalItems: tags.length,
        totalPages: 1,
      };
    return { tags, pagination };
  }

  async listCategories(ro?: RequestOptions): Promise<MarbleCategoryList> {
    const raw = await this.getJson(
      `/categories`,
      ApiListCategoriesResponse,
      ro
    );
    const categories = (raw.categories ?? raw.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    }));
    const pagination: Pagination = raw.pagination ??
      raw.meta?.pagination ?? {
        limit: categories.length,
        currentPage: 1,
        nextPage: null,
        previousPage: null,
        totalItems: categories.length,
        totalPages: 1,
      };
    return { categories, pagination };
  }

  async listAuthors(ro?: RequestOptions): Promise<MarbleAuthorList> {
    const raw = await this.getJson(`/authors`, ApiListAuthorsResponse, ro);
    const authors = (raw.authors ?? raw.data ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      image: a.image ?? "",
    }));
    const pagination: Pagination = raw.pagination ??
      raw.meta?.pagination ?? {
        limit: authors.length,
        currentPage: 1,
        nextPage: null,
        previousPage: null,
        totalItems: authors.length,
        totalPages: 1,
      };
    return { authors, pagination };
  }
}
