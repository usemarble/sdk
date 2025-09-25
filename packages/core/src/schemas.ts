import { z } from "zod";

/**
 * @internal
 * Pagination envelope returned by the API.
 */
export const ApiPagination = z.object({
  limit: z.number(),
  currentPage: z.number(),
  nextPage: z.number().nullable(),
  previousPage: z.number().nullable(),
  totalItems: z.number(),
  totalPages: z.number(),
});
export type ApiPagination = z.infer<typeof ApiPagination>;

/**
 * @internal
 * Author shape in API responses.
 */
export const ApiAuthor = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().optional().nullable(),
});
export type ApiAuthor = z.infer<typeof ApiAuthor>;

/**
 * @internal
 * Tag shape in API responses.
 */
export const ApiTag = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});
export type ApiTag = z.infer<typeof ApiTag>;

/**
 * @internal
 * Category shape in API responses.
 */
export const ApiCategory = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});
export type ApiCategory = z.infer<typeof ApiCategory>;

/**
 * @internal
 * Post shape in API responses (wire format).
 * Dates are ISO-8601 strings; the client maps them to `Date` later.
 */
export const ApiPost = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  content: z.string().optional(),
  description: z.string().optional(),
  coverImage: z.string().optional(),
  // validate as ISO datetime strings with timezone/offset
  publishedAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }).optional(),
  authors: z.array(ApiAuthor).optional(),
  category: ApiCategory,
  tags: z.array(ApiTag).optional(),
  attribution: z
    .object({
      author: z.string().optional(),
      url: z.string().optional(),
    })
    .nullable()
    .optional(),
});
export type ApiPost = z.infer<typeof ApiPost>;

/**
 * @internal
 * API response where posts may be under `posts` or `data`,
 * with optional pagination at `pagination` or `meta.pagination`.
 */
export const ApiListPostsResponse = z.object({
  posts: z.array(ApiPost).optional(),
  data: z.array(ApiPost).optional(),
  pagination: ApiPagination.optional(),
  meta: z.object({ pagination: ApiPagination.optional() }).optional(),
});
export type ApiListPostsResponse = z.infer<typeof ApiListPostsResponse>;

/**
 * @internal
 * API response for tags; supports either `tags` or `data` arrays.
 */
export const ApiListTagsResponse = z.object({
  tags: z.array(ApiTag).optional(),
  data: z.array(ApiTag).optional(),
  pagination: ApiPagination.optional(),
  meta: z.object({ pagination: ApiPagination.optional() }).optional(),
});
export type ApiListTagsResponse = z.infer<typeof ApiListTagsResponse>;

/**
 * @internal
 * API response for categories; supports either `categories` or `data` arrays.
 */
export const ApiListCategoriesResponse = z.object({
  categories: z.array(ApiCategory).optional(),
  data: z.array(ApiCategory).optional(),
  pagination: ApiPagination.optional(),
  meta: z.object({ pagination: ApiPagination.optional() }).optional(),
});
export type ApiListCategoriesResponse = z.infer<
  typeof ApiListCategoriesResponse
>;

/**
 * @internal
 * API response for authors; supports either `authors` or `data` arrays.
 */
export const ApiListAuthorsResponse = z.object({
  authors: z.array(ApiAuthor).optional(),
  data: z.array(ApiAuthor).optional(),
  pagination: ApiPagination.optional(),
  meta: z.object({ pagination: ApiPagination.optional() }).optional(),
});
export type ApiListAuthorsResponse = z.infer<typeof ApiListAuthorsResponse>;
