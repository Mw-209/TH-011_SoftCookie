import type { NextFunction, Request, Response } from "express";
import { ApiError, toErrorBody } from "../lib/errors.js";

/**
 * Central error mapper. Keeps internal failures from leaking stack traces or
 * database details to clients (NFR-01).
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof ApiError) {
    res.status(error.status).json(toErrorBody(error));
    return;
  }

  if (process.env.NODE_ENV !== "test") {
    console.error("Unhandled error:", error);
  }

  res
    .status(500)
    .json(
      toErrorBody(
        new ApiError(500, "INTERNAL_ERROR", "An unexpected error occurred.")
      )
    );
}
