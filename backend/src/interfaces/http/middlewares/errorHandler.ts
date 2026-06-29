import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../../shared/errors/AppError.js";
import { logger } from "../../../shared/logger.js";

/** Translates thrown errors into consistent JSON responses. */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (error instanceof AppError) {
    if (!error.isOperational) {
      logger.error("Non-operational error", error);
    }
    res.status(error.statusCode).json({
      error: { message: error.message, details: error.details ?? null },
    });
    return;
  }

  logger.error("Unhandled error", error);
  res.status(500).json({
    error: { message: "Internal server error", details: null },
  });
}

/** 404 handler for unmatched routes. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { message: "Not found", details: null } });
}
