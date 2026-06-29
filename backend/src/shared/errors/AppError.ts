/**
 * Application-level error carrying an HTTP status code so the HTTP layer can
 * translate domain failures into responses without leaking internals.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    options: { isOperational?: boolean; details?: unknown } = {}
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: unknown) {
    super(message, 400, { details });
  }
}

export class UpstreamServiceError extends AppError {
  constructor(message = "Upstream AI service failed", details?: unknown) {
    super(message, 502, { details });
  }
}
