export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_INACTIVE"
  | "UNAUTHENTICATED"
  | "FORBIDDEN_ROLE"
  | "FORBIDDEN_OWNERSHIP"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export class ApiClientError extends Error {
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
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Thin fetch wrapper. Always sends the session cookie and normalises the
 * server's error envelope into ApiClientError.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiClientError(
      0,
      "INTERNAL_ERROR",
      "Unable to reach the server. Please check your connection and try again."
    );
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const envelope = (body ?? {}) as {
      error?: { code?: ApiErrorCode; message?: string; details?: Record<string, string> };
    };

    throw new ApiClientError(
      response.status,
      envelope.error?.code ?? "INTERNAL_ERROR",
      envelope.error?.message ?? "Something went wrong. Please try again.",
      envelope.error?.details
    );
  }

  return (body as { data: T }).data;
}
