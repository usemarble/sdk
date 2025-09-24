import type {
  MarbleOptions,
  PostsListParams,
  MarblePostList,
  MarblePost,
  MarbleTagList,
  MarbleTag,
  MarbleCategoryList,
  MarbleCategory,
  MarbleAuthorList,
  MarbleAuthor,
  Post,
  Pagination
} from "./types";

// -------------------- helpers --------------------
function q(params: Record<string, any>) {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0));
  if (entries.length === 0) return "";
  const usp = new URLSearchParams();
  for (const [k, v] of entries) {
    if (Array.isArray(v) && k === "tags") usp.set("tags", v.join(","));
    else usp.set(k, String(v));
  }
  return `?${usp.toString()}`;
}

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === "string") return new Date(v);
  throw new Error("Expected ISO date string");
}

function deserializePost(raw: any): Post {
  return {
    id: String(raw.id),
    slug: String(raw.slug),
    title: String(raw.title),
    content: String(raw.content ?? ""),
    description: String(raw.description ?? ""),
    coverImage: String(raw.coverImage ?? ""),
    publishedAt: toDate(raw.publishedAt),
    updatedAt: toDate(raw.updatedAt),
    authors: Array.isArray(raw.authors) ? raw.authors.map((a: any) => ({
      id: String(a.id),
      name: String(a.name),
      image: String(a.image ?? "")
    })) : [],
    category: raw.category
      ? { id: String(raw.category.id), slug: String(raw.category.slug), name: String(raw.category.name) }
      : { id: "", slug: "", name: "" }, // adjust to your needs
    tags: Array.isArray(raw.tags) ? raw.tags.map((t: any) => ({
      id: String(t.id),
      slug: String(t.slug),
      name: String(t.name)
    })) : [],
    attribution: raw.attribution
      ? { author: String(raw.attribution.author ?? ""), url: String(raw.attribution.url ?? "") }
      : null
  };
}

function deserializePagination(p: any): Pagination {
  return {
    limit: Number(p?.limit ?? 0),
    currpage: Number(p?.currpage ?? 1),
    nextPage: p?.nextPage === null || p?.nextPage === undefined ? null : Number(p.nextPage),
    prevPage: p?.prevPage === null || p?.prevPage === undefined ? null : Number(p.prevPage),
    totalItems: Number(p?.totalItems ?? 0),
    totalPages: Number(p?.totalPages ?? 1)
  };
}

function ensureOk(res: Response) {
  if (!res.ok) throw new Error(`Marble: ${res.status} ${res.statusText}`);
}

// -------------------- client --------------------
export class MarbleClient {
  private base: string;
  private f: typeof fetch;

  constructor(private readonly opts: MarbleOptions) {
    this.base = opts.baseUrl ?? "https://api.marblecms.com/v1";
    this.f = opts.fetchImpl ?? fetch;
  }

  private url(path: string) {
    return `${this.base}/${this.opts.workspaceKey}${path}`;
  }

  posts = {
    list: async (params: PostsListParams = {}): Promise<MarblePostList> => {
      const res = await this.f(this.url(`/posts${q(params)}`));
      ensureOk(res);
      const json = await res.json();
      return {
        posts: Array.isArray(json.posts) ? json.posts.map(deserializePost) : [],
        pagination: deserializePagination(json.pagination ?? {})
      };
    },

    get: async (idOrSlug: string): Promise<MarblePost> => {
      const res = await this.f(this.url(`/posts/${encodeURIComponent(idOrSlug)}`));
      ensureOk(res);
      const json = await res.json();
      return { post: deserializePost(json.post) };
    }
  };

  tags = {
    list: async (): Promise<MarbleTagList> => {
      const res = await this.f(this.url(`/tags`));
      ensureOk(res);
      const json = await res.json();
      return {
        tags: Array.isArray(json.tags)
          ? json.tags.map((t: any) => ({ id: String(t.id), name: String(t.name), slug: String(t.slug) }))
          : [],
        pagination: deserializePagination(json.pagination ?? {})
      };
    },
    get: async (slugOrId: string): Promise<MarbleTag> => {
      const res = await this.f(this.url(`/tags/${encodeURIComponent(slugOrId)}`));
      ensureOk(res);
      const json = await res.json();
      const t = json.tag;
      return { tag: { id: String(t.id), name: String(t.name), slug: String(t.slug) } };
    }
  };

  categories = {
    list: async (): Promise<MarbleCategoryList> => {
      const res = await this.f(this.url(`/categories`));
      ensureOk(res);
      const json = await res.json();
      return {
        categories: Array.isArray(json.categories)
          ? json.categories.map((c: any) => ({ id: String(c.id), name: String(c.name), slug: String(c.slug) }))
          : [],
        pagination: deserializePagination(json.pagination ?? {})
      };
    },
    get: async (slugOrId: string): Promise<MarbleCategory> => {
      const res = await this.f(this.url(`/categories/${encodeURIComponent(slugOrId)}`));
      ensureOk(res);
      const json = await res.json();
      const c = json.category;
      return { category: { id: String(c.id), name: String(c.name), slug: String(c.slug) } };
    }
  };

  authors = {
    list: async (): Promise<MarbleAuthorList> => {
      const res = await this.f(this.url(`/authors`));
      ensureOk(res);
      const json = await res.json();
      return {
        authors: Array.isArray(json.authors)
          ? json.authors.map((a: any) => ({ id: String(a.id), name: String(a.name), image: String(a.image ?? "") }))
          : [],
        pagination: deserializePagination(json.pagination ?? {})
      };
    },
    get: async (id: string): Promise<MarbleAuthor> => {
      const res = await this.f(this.url(`/authors/${encodeURIComponent(id)}`));
      ensureOk(res);
      const json = await res.json();
      const a = json.author;
      return { author: { id: String(a.id), name: String(a.name), image: String(a.image ?? "") } };
    }
  };
}

export function createMarble(opts: MarbleOptions) {
  return new MarbleClient(opts);
}
