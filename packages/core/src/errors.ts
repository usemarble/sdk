/**
 * Error type thrown by the Marble SDK when an HTTP request fails.
 *
 * Includes HTTP status, statusText, and optionally the response body.
 *
 * Example:
 * ```ts
 * try {
 *   await client.listPosts();
 * } catch (err) {
 *   if (err instanceof MarbleHttpError) {
 *     console.error("Request failed:", err.status, err.statusText, err.body);
 *   }
 * }
 * ```
 */
export class MarbleHttpError extends Error {
  /** HTTP status code (e.g. `404`, `500`) */
  readonly status: number;

  /** HTTP status text (e.g. `"Not Found"`, `"Internal Server Error"`) */
  readonly statusText: string;

  /** Parsed response body (if available), can be JSON or string */
  readonly body?: unknown;

  /**
   * @param message Error message
   * @param init HTTP error details from the failed response
   */
  constructor(
    message: string,
    init: { status: number; statusText: string; body?: unknown }
  ) {
    super(message);
    this.name = "MarbleHttpError";
    this.status = init.status;
    this.statusText = init.statusText;
    this.body = init.body;
  }
}
