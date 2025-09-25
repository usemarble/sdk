import { z } from "zod";

export const ApiPagination = z.object({
  limit: z.number(),
  currentPage: z.number(),
  nextPage: z.number().nullable(),
  previousPage: z.number().nullable(),
  totalItems: z.number(),
  totalPages: z.number(),
});
export type ApiPagination = z.infer<typeof ApiPagination>;

export const ApiAuthor = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().optional().nullable(),
});
export type ApiAuthor = z.infer<typeof ApiAuthor>;

export const ApiTag = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});
export type ApiTag = z.infer<typeof ApiTag>;

export const ApiCategory = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});
export type ApiCategory = z.infer<typeof ApiCategory>;

export const ApiPost = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  content: z.string().optional(),
  description: z.string().optional(),
  coverImage: z.string().optional(),
  publishedAt: z.string(),
  updatedAt: z.string().optional(),
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

export const ApiListPostsResponse = z.object({
  posts: z.array(ApiPost).optional(),
  data: z.array(ApiPost).optional(),
  pagination: ApiPagination.optional(),
  meta: z.object({ pagination: ApiPagination.optional() }).optional(),
});
export type ApiListPostsResponse = z.infer<typeof ApiListPostsResponse>;

export const ApiListTagsResponse = z.object({
  tags: z.array(ApiTag).optional(),
  data: z.array(ApiTag).optional(),
  pagination: ApiPagination.optional(),
  meta: z.object({ pagination: ApiPagination.optional() }).optional(),
});
export type ApiListTagsResponse = z.infer<typeof ApiListTagsResponse>;

export const ApiListCategoriesResponse = z.object({
  categories: z.array(ApiCategory).optional(),
  data: z.array(ApiCategory).optional(),
  pagination: ApiPagination.optional(),
  meta: z.object({ pagination: ApiPagination.optional() }).optional(),
});
export type ApiListCategoriesResponse = z.infer<
  typeof ApiListCategoriesResponse
>;

export const ApiListAuthorsResponse = z.object({
  authors: z.array(ApiAuthor).optional(),
  data: z.array(ApiAuthor).optional(),
  pagination: ApiPagination.optional(),
  meta: z.object({ pagination: ApiPagination.optional() }).optional(),
});
export type ApiListAuthorsResponse = z.infer<typeof ApiListAuthorsResponse>;
