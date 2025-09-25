/**
 * A published article/post in Marble.
 * Dates are materialized as JS `Date` objects by the client.
 */
export type Post = {
  /** Stable identifier (string or UUID). */
  id: string;
  /** URL-friendly slug. */
  slug: string;
  /** Post title. */
  title: string;
  /** Full body content (HTML/MD/plaintext depending on your backend). */
  content: string;
  /** Short summary/SEO description. */
  description: string;
  /** Absolute or relative URL to a cover image. */
  coverImage: string;
  /** First published date/time. */
  publishedAt: Date;
  /** Last updated date/time (falls back to `publishedAt` when missing on wire). */
  updatedAt: Date;

  /** Authors credited on the post. */
  authors: {
    id: string;
    name: string;
    image: string;
  }[];

  /** Primary category for the post. */
  category: {
    id: string;
    slug: string;
    name: string;
  };

  /** Tags attached to the post. */
  tags: {
    id: string;
    slug: string;
    name: string;
  }[];

  /** Optional attribution (e.g., image credit). */
  attribution: {
    author: string;
    url: string;
  } | null;
};

/** Standard pagination metadata returned by list endpoints. */
export type Pagination = {
  /** Page size (items per page). */
  limit: number;
  /** Current page number (1-based). */
  currentPage: number;
  /** Next page number, if any. */
  nextPage: number | null;
  /** Previous page number, if any. */
  previousPage: number | null;
  /** Total number of items across all pages. */
  totalItems: number;
  /** Total number of pages given the current `limit`. */
  totalPages: number;
};

/** Page of posts along with pagination info. */
export type MarblePostList = {
  posts: Post[];
  pagination: Pagination;
};

/** Single post envelope. */
export type MarblePost = { post: Post };

/** A tag in the system. */
export type Tag = {
  id: string;
  name: string;
  slug: string;
};

/** Single tag envelope. */
export type MarbleTag = { tag: Tag };

/** Page of tags along with pagination info. */
export type MarbleTagList = {
  tags: Tag[];
  pagination: Pagination;
};

/** A category in the system. */
export type Category = {
  id: string;
  name: string;
  slug: string;
};

/** Single category envelope. */
export type MarbleCategory = { category: Category };

/** Page of categories along with pagination info. */
export type MarbleCategoryList = {
  categories: Category[];
  pagination: Pagination;
};

/** An author entity. */
export type Author = {
  id: string;
  name: string;
  image: string;
};

/** Single author envelope. */
export type MarbleAuthor = { author: Author };

/** Page of authors along with pagination info. */
export type MarbleAuthorList = {
  authors: Author[];
  pagination: Pagination;
};

/**
 * Options for initializing a `MarbleClient`.
 */
export type MarbleOptions = {
  /** Base URL of your Marble API, e.g. `https://api.usemarble.dev`. */
  baseUrl: string;
  /** Optional API key for authenticated requests. */
  apiKey?: string;
  /** Optional fetch implementation; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  /** Extra headers to send with every request. */
  headers?: Record<string, string>;
  /**
   * Optional retry policy. Provide `null` to disable retries,
   * or provide a custom policy to override the defaults.
   */
  retryPolicy?: RetryPolicy | null;
};

/**
 * Per-request options.
 */
export type RequestOptions = {
  /** Abort the request or pagination early. */
  signal?: AbortSignal | null;
};

/**
 * Query parameters accepted by `listPosts`.
 */
export type PostsListParams = {
  /** Items per page. */
  limit?: number;
  /** Page number (1-based). */
  page?: number;
  /** Free-text search term. */
  search?: string;
  /** Filter by tag slugs. */
  tags?: string[];
  /** Filter by category slug. */
  category?: string;
  /** Filter by author id/slug (depending on backend). */
  author?: string;
  /** Sort order by published/updated time (prefix with `-` for descending). */
  sort?: "publishedAt" | "-publishedAt" | "updatedAt" | "-updatedAt";
};

/**
 * Options for async pagination helpers (`iteratePostPages`, `paginatePosts`).
 */
export type PaginateOptions = {
  /** Items per page (default 20 for posts, 50 for tags/categories/authors). */
  pageSize?: number;
  /** First page to fetch (default 1). */
  startPage?: number;
  /** Max pages to traverse (default: unlimited). */
  maxPages?: number;
  /** Abort the iteration. */
  signal?: AbortSignal | null;
};

/**
 * Post scan parameters used by iterators (same as `PostsListParams` but without pagination fields).
 */
export type PostsScanParams = Omit<PostsListParams, "page" | "limit">;

/** Outcome of a retry decision: how long to wait before the next attempt. */
export type RetryDecision = {
  /** Delay in milliseconds. */
  delayMs: number;
};

/** Information passed to the retry policy to decide whether to retry. */
export type RetryContext = {
  /** Attempt number (1-based, includes the initial attempt). */
  attempt: number;
  /** Network or other thrown error (when no HTTP response). */
  error?: unknown;
  /** HTTP response for failed attempts (if request reached the server). */
  response?: Response;
};

/**
 * Policy that governs retry and backoff behavior.
 *
 * If you provide a `retryPolicy` in `MarbleOptions`, the SDK will:
 *  - call `shouldRetry` after failures,
 *  - wait `delayMs` when a retry is requested,
 *  - stop when attempts exceed `maxRetries`.
 */
export type RetryPolicy = {
  /** Maximum number of retries (not counting the initial attempt). */
  maxRetries?: number;
  /** Base delay for exponential backoff. */
  baseDelayMs?: number;
  /** Maximum backoff cap in milliseconds. */
  maxDelayMs?: number;
  /**
   * Decide whether to retry, and how long to wait.
   * Return `undefined` to stop retrying.
   */
  shouldRetry: (ctx: RetryContext) => RetryDecision | undefined;
};
