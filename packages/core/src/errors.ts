export class MarbleHttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body?: unknown;

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
