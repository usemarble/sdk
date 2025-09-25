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
  Tag,
  Category,
  Author,
  Pagination,
} from "./types";
import {
  q,
  toDateStrict,
  normalizeBaseUrl,
  mergeHeaders,
  isRecord,
  asString,
  asArray,
  asNullableNumber,
} from "./utils";
import { MarbleHttpError } from "./errors";

type RawAuthor = { id: unknown; name: unknown; image?: unknown };
type RawTag = { id: unknown; name: unknown; slug: unknown };
type RawCategory = { id: unknown; name: unknown; slug: unknown };
type RawAttribution = { author?: unknown; url?: unknown } | null;
type RawPost = {
  id: unknown;
  slug: unknown;
  title: unknown;
  content?: unknown;
  description?: unknown;
  coverImage?: unknown;
  publishedAt: unknown;
  updatedAt?: unknown;
  authors?: unknown;
  category?: unknown;
  tags?: unknown;
  attribution?: unknown;
};
type RawPagination = {
  limit?: unknown;
  currentPage?: unknown;
  nextPage?: unknown;
  previousPage?: unknown;
  totalItems?: unknown;
  totalPages?: unknown;
};

type ListWrapper<T> = {
  posts?: T[];
  tags?: T[];
  categories?: T[];
  authors?: T[];
  data?: T[];
  pagination?: RawPagination;
  meta?: { pagination?: RawPagination };
};
type SingleWrapper<T> = { post?: T; data?: T } & Partial<ListWrapper<T>>;

function fromRawAuthor(x: unknown): Author {
  const r = isRecord(x) ? (x as RawAuthor) : { id: "", name: "", image: "" };
  return {
    id: asString(r.id),
    name: asString(r.name),
    image: asString(r.image ?? ""),
  };
}

function fromRawTag(x: unknown): Tag {
  const r = isRecord(x) ? (x as RawTag) : { id: "", name: "", slug: "" };
  return {
    id: asString(r.id),
    name: asString(r.name),
    slug: asString(r.slug),
  };
}

function fromRawCategory(x: unknown): Category {
  const r = isRecord(x) ? (x as RawCategory) : { id: "", name: "", slug: "" };
  return {
    id: asString(r.id),
    name: asString(r.name),
    slug: asString(r.slug),
  };
}

function fromRawAttribution(
  x: unknown
): { author: string; url: string } | null {
  if (!x || !isRecord(x)) return null;
  const r = x as RawAttribution & Record<string, unknown>;
  return {
    author: asString(r.author ?? ""),
    url: asString(r.url ?? ""),
  };
}

function fromRawPost(x: unknown): Post {
  const r = isRecord(x) ? (x as RawPost) : ({} as RawPost);
  return {
    id: asString(r.id),
    slug: asString(r.slug),
    title: asString(r.title),
    content: asString(r.content ?? ""),
    description: asString(r.description ?? ""),
    coverImage: asString(r.coverImage ?? ""),
    publishedAt: toDateStrict(r.publishedAt, "publishedAt"),
    updatedAt: toDateStrict(r.updatedAt ?? r.publishedAt, "updatedAt"),
    authors: asArray(r.authors, fromRawAuthor),
    category: fromRawCategory(r.category),
    tags: asArray(r.tags, fromRawTag),
    attribution: fromRawAttribution(r.attribution ?? null),
  };
}

function fromRawPagination(x: unknown, defaults: Pagination): Pagination {
  if (!isRecord(x)) return defaults;
  const r = x as RawPagination;
  return {
    limit: asNullableNumber(r.limit) ?? defaults.limit,
    currentPage: asNullableNumber(r.currentPage) ?? defaults.currentPage,
    nextPage: asNullableNumber(r.nextPage),
    previousPage: asNullableNumber(r.previousPage),
    totalItems: asNullableNumber(r.totalItems) ?? defaults.totalItems,
    totalPages: asNullableNumber(r.totalPages) ?? defaults.totalPages,
  };
}

function pickArray<T>(raw: unknown, keys: Array<keyof ListWrapper<T>>): T[] {
  if (!isRecord(raw)) return [];
  for (const k of keys) {
    const v = raw[k as string];
    if (Array.isArray(v)) return v as T[];
  }
  return [];
}

function pickPagination(raw: unknown): RawPagination | undefined {
  if (!isRecord(raw)) return undefined;
  const p = raw.pagination;
  const meta = isRecord(raw.meta) ? raw.meta : undefined;
  const mp = meta?.pagination;
  return (
    (isRecord(p) ? (p as RawPagination) : undefined) ??
    (isRecord(mp) ? (mp as RawPagination) : undefined)
  );
}

function pickSingle<T>(
  raw: unknown,
  keys: Array<keyof SingleWrapper<T>>
): T | undefined {
  if (!isRecord(raw)) return undefined;
  for (const k of keys) {
    const v = raw[k as string];
    if (v !== undefined) return v as T;
  }
  return undefined;
}

export class MarbleClient {
  private readonly baseUrl: string | undefined;
  private readonly apiKey?: string | undefined;
  private readonly fetcher: typeof fetch;
  private readonly extraHeaders: Record<string, string>;

  constructor(opts: MarbleOptions) {
    if (!opts?.baseUrl) throw new Error("MarbleClient: baseUrl is required");
    this.baseUrl = normalizeBaseUrl(opts.baseUrl);
    this.apiKey = opts.apiKey ?? undefined;
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

  private async getUnknown(
    path: string,
    ro?: RequestOptions
  ): Promise<unknown> {
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
        } catch {
          body = undefined;
        }
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
    return res.json() as Promise<unknown>;
  }

  async listPosts(
    params: PostsListParams = {},
    ro?: RequestOptions
  ): Promise<MarblePostList> {
    const raw = await this.getUnknown(`/posts${q(params)}`, ro);
    const rawPosts = pickArray<unknown>(raw, ["posts", "data"]);
    const posts = rawPosts.map(fromRawPost);

    const paginationDefaults: Pagination = {
      limit: params.limit ?? posts.length,
      currentPage: params.page ?? 1,
      nextPage: null,
      previousPage: null,
      totalItems: posts.length,
      totalPages: 1,
    };
    const pagination = fromRawPagination(
      pickPagination(raw),
      paginationDefaults
    );

    return { posts, pagination };
  }

  async getPost(slugOrId: string, ro?: RequestOptions): Promise<MarblePost> {
    const raw = await this.getUnknown(
      `/posts/${encodeURIComponent(slugOrId)}`,
      ro
    );
    const rawPost = pickSingle<unknown>(raw, ["post", "data"]) ?? raw;
    return { post: fromRawPost(rawPost) };
  }

  async listTags(ro?: RequestOptions): Promise<MarbleTagList> {
    const raw = await this.getUnknown(`/tags`, ro);
    const rawTags = pickArray<unknown>(raw, ["tags", "data"]);
    const tags = rawTags.map((t) => fromRawTag(t));

    const paginationDefaults: Pagination = {
      limit: tags.length,
      currentPage: 1,
      nextPage: null,
      previousPage: null,
      totalItems: tags.length,
      totalPages: 1,
    };
    const pagination = fromRawPagination(
      pickPagination(raw),
      paginationDefaults
    );

    return { tags, pagination };
  }

  async listCategories(ro?: RequestOptions): Promise<MarbleCategoryList> {
    const raw = await this.getUnknown(`/categories`, ro);
    const rawCategories = pickArray<unknown>(raw, ["categories", "data"]);
    const categories = rawCategories.map((c) => fromRawCategory(c));

    const paginationDefaults: Pagination = {
      limit: categories.length,
      currentPage: 1,
      nextPage: null,
      previousPage: null,
      totalItems: categories.length,
      totalPages: 1,
    };
    const pagination = fromRawPagination(
      pickPagination(raw),
      paginationDefaults
    );

    return { categories, pagination };
  }

  async listAuthors(ro?: RequestOptions): Promise<MarbleAuthorList> {
    const raw = await this.getUnknown(`/authors`, ro);
    const rawAuthors = pickArray<unknown>(raw, ["authors", "data"]);
    const authors = rawAuthors.map((a) => fromRawAuthor(a));

    const paginationDefaults: Pagination = {
      limit: authors.length,
      currentPage: 1,
      nextPage: null,
      previousPage: null,
      totalItems: authors.length,
      totalPages: 1,
    };
    const pagination = fromRawPagination(
      pickPagination(raw),
      paginationDefaults
    );

    return { authors, pagination };
  }
}
