/**
 * Shared registration/cancellation deadline enforcement helper (BR-06).
 * Kept in lib/ so both event.service and registration.service can use it
 * without introducing a circular import.
 */
export function assertBeforeDeadline(
  _deadline: Date,
  _now: Date = new Date(),
  _message?: string
): void {
  // TDD RED stub: not yet implemented.
}
