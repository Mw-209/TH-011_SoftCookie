import { ApiError } from "./errors.js";

/**
 * Shared registration/cancellation deadline enforcement helper (BR-06).
 * Kept in lib/ so both event.service and registration.service can use it
 * without introducing a circular import.
 *
 * A request made exactly at the deadline is still on time
 * (NOW() <= registrationDeadline); anything later is rejected.
 */
export function assertBeforeDeadline(
  deadline: Date,
  now: Date = new Date(),
  message?: string
): void {
  if (now.getTime() > deadline.getTime()) {
    throw ApiError.deadlinePassed(message);
  }
}
