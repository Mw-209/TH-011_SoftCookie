/**
 * Shared date and time formatting for event screens.
 *
 * Events are stored as absolute UTC instants and rendered in the viewer's own
 * time zone. The locale is pinned to en-GB so the output is always a 24-hour
 * clock with no AM/PM and no seconds, which is what the schedule display calls
 * for; leaving it to the browser would give some viewers "9:00 PM".
 */
const DISPLAY_LOCALE = "en-GB";

const dateParts = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const timeOfDay = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** e.g. "19 Nov, 2026" */
export function formatEventDate(iso: string): string {
  const parts = dateParts.formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("day")} ${get("month")}, ${get("year")}`;
}

/** e.g. "09:00" */
export function formatTime(iso: string): string {
  return timeOfDay.format(new Date(iso));
}

export function isSameCalendarDay(startIso: string, endIso: string): boolean {
  return new Date(startIso).toDateString() === new Date(endIso).toDateString();
}

/**
 * The date a single event occupies.
 * "19 Nov, 2026", or "19 Nov, 2026 - 20 Nov, 2026" when it spans days.
 */
export function formatEventDateRange(startIso: string, endIso: string): string {
  if (isSameCalendarDay(startIso, endIso)) {
    return formatEventDate(startIso);
  }

  return `${formatEventDate(startIso)} - ${formatEventDate(endIso)}`;
}

/** e.g. "09:00 - 12:00" — the clock times, independent of the dates. */
export function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatTime(startIso)} - ${formatTime(endIso)}`;
}

/** e.g. "19 Nov, 2026 at 09:00" — for a single instant such as a deadline. */
export function formatDateTime(iso: string): string {
  return `${formatEventDate(iso)} at ${formatTime(iso)}`;
}

/** True when two instants are the same to the minute. */
export function isSameInstant(firstIso: string, secondIso: string): boolean {
  return new Date(firstIso).getTime() === new Date(secondIso).getTime();
}

/**
 * Whole calendar days from today until the given instant.
 * Counted on day boundaries rather than elapsed hours, so a deadline later
 * today reads as 0 and any time tomorrow reads as 1 — which is how people
 * talk about deadlines.
 */
export function calendarDaysUntil(iso: string, now: Date = new Date()): number {
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (startOfDay(new Date(iso)) - startOfDay(now)) / millisecondsPerDay
  );
}

export type RegistrationWindowTone = "open" | "closing" | "closed";

export interface RegistrationWindow {
  label: string;
  tone: RegistrationWindowTone;
}

/** Days left before a deadline counts as urgent. */
export const CLOSING_SOON_DAYS = 3;

/**
 * Describes the registration window for display.
 *
 * Presentation only. Sprint 1 does not enforce the cutoff: FR-08 and BR-06 are
 * allocated to Sprint 2 (F-05), so this reports what the stored deadline says
 * and nothing more.
 */
export function describeRegistrationWindow(
  deadlineIso: string,
  now: Date = new Date()
): RegistrationWindow {
  if (new Date(deadlineIso).getTime() <= now.getTime()) {
    return { label: "Registration closed", tone: "closed" };
  }

  const days = calendarDaysUntil(deadlineIso, now);

  if (days <= 0) {
    return { label: "Closes today", tone: "closing" };
  }
  if (days === 1) {
    return { label: "Closes tomorrow", tone: "closing" };
  }

  return {
    label: `Closes in ${days} days`,
    tone: days <= CLOSING_SOON_DAYS ? "closing" : "open",
  };
}
