/**
 * # Marble SDK
 *
 * The official TypeScript SDK for interacting with Marble APIs.
 *
 * Features:
 * - Fully typed client for fetching posts, tags, categories, and authors
 * - Zod-powered runtime validation of API responses
 * - Webhook verification helpers with timestamp + HMAC checks
 * - Pagination and retry/backoff with sensible defaults
 *
 * @packageDocumentation
 */

/**
 * Main API client for interacting with Marble.
 *
 * Provides typed methods to fetch posts, tags, categories, authors, and more.
 * See {@link MarbleClient}.
 */
export { MarbleClient } from "./client";
/**
 * Error type thrown when HTTP requests fail.
 *
 * Wraps status, statusText, and (optionally) the response body.
 */
export { MarbleHttpError } from "./errors";
/**
 * Public type definitions used across the Marble SDK.
 *
 * Includes core models like {@link Post}, {@link Author}, and {@link Pagination},
 * as well as configuration types like {@link MarbleOptions}.
 */
export * from "./types";

/**
 * Webhook utilities:
 *
 * - {@link verifyMarbleSignature} — validate incoming webhook signatures
 * - {@link parseWebhookEvent} — safely parse webhook JSON payloads
 *
 * @example
 * ```ts
 * verifyMarbleSignature(body, headers, secret);
 * const event = parseWebhookEvent(body, (d) => d as { id: string });
 * ```
 */
export {
	parseWebhookEvent,
	type VerifyOptions,
	verifyMarbleSignature,
	type WebhookEvent,
	type WebhookHeaders,
} from "./webhook";
