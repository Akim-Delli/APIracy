export type ErrorCode =
  | "INVALID_PARAMS"
  | "FORBIDDEN_HOST"
  | "SOURCE_FETCH_FAILED"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "PROCESSING_FAILED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export interface ErrorDetail {
  param?: string;
  message: string;
}

/**
 * The single error type the API surfaces. Every failure mode maps to one of
 * these factories so responses always share the same JSON envelope:
 *   { "error": { "code": "...", "message": "...", "details": [...] } }
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = "ApiError";
  }

  static invalidParams(message: string, details?: ErrorDetail[]): ApiError {
    return new ApiError(400, "INVALID_PARAMS", message, details);
  }

  static forbiddenHost(message: string): ApiError {
    return new ApiError(400, "FORBIDDEN_HOST", message);
  }

  static sourceFetchFailed(message: string): ApiError {
    return new ApiError(422, "SOURCE_FETCH_FAILED", message);
  }

  static unsupportedMediaType(message: string): ApiError {
    return new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", message);
  }

  static processingFailed(message: string): ApiError {
    return new ApiError(422, "PROCESSING_FAILED", message);
  }

  static rateLimited(message: string): ApiError {
    return new ApiError(429, "RATE_LIMITED", message);
  }

  toBody(): { error: { code: ErrorCode; message: string; details?: ErrorDetail[] } } {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details?.length ? { details: this.details } : {}),
      },
    };
  }
}

/** Converts any thrown value into a consistent JSON error response. */
export function errorResponse(err: unknown): Response {
  const apiError =
    err instanceof ApiError
      ? err
      : new ApiError(500, "INTERNAL_ERROR", "An unexpected error occurred");
  if (apiError.code === "INTERNAL_ERROR") {
    console.error("Unhandled error:", err);
  }
  return Response.json(apiError.toBody(), { status: apiError.status });
}
