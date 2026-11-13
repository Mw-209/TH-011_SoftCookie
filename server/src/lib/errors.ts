/**
 * Error codes are part of the public API contract
 * (docs/sprints/sprint-1/F-01-authentication-and-access.md 7.2-7.4).
 */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_INACTIVE"
  | "UNAUTHENTICATED"
  | "FORBIDDEN_ROLE"
  | "FORBIDDEN_OWNERSHIP"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: Record<string, string>;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    details?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static validation(message: string, details?: Record<string, string>) {
    return new ApiError(400, "VALIDATION_ERROR", message, details);
  }

  static invalidCredentials() {
    return new ApiError(
      401,
      "INVALID_CREDENTIALS",
      "Email or password is incorrect."
    );
  }

  static accountInactive() {
    // Deliberately vague: the message must not confirm that this email exists
    // or why it was blocked. The ACCOUNT_INACTIVE code stays for server logs
    // and for the 403 status the contract requires (AC-02).
    return new ApiError(
      403,
      "ACCOUNT_INACTIVE",
      "Your account cannot sign in. Contact support."
    );
  }

  static unauthenticated() {
    return new ApiError(
      401,
      "UNAUTHENTICATED",
      "Authentication is required for this request."
    );
  }

  static forbiddenRole() {
    return new ApiError(
      403,
      "FORBIDDEN_ROLE",
      "Your role is not permitted to perform this action."
    );
  }
}

export function toErrorBody(error: ApiError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  };
}
