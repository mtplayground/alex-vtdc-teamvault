import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFound(message = "Route not found") {
  return new ApiError(404, "not_found", message);
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "validation_error",
        message: "Request validation failed.",
        details: error.flatten(),
      },
    });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
    return;
  }

  const err = error as { name?: string; code?: string; message?: string; stack?: string; $metadata?: { httpStatusCode?: number } };
  console.error("[api error]", {
    name: err?.name,
    code: err?.code,
    message: err?.message,
    httpStatus: err?.$metadata?.httpStatusCode,
    stack: err?.stack?.split("\n").slice(0, 5).join("\n"),
  });
  res.status(500).json({
    error: {
      code: "internal_server_error",
      message: "Something went wrong.",
    },
  });
};
