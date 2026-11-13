import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DeadlineChip from "../src/components/DeadlineChip";
import {
  calendarDaysUntil,
  describeRegistrationWindow,
} from "../src/lib/datetime";

/** Builds an ISO instant a given number of days (and hours) from a base date. */
function isoFrom(base: Date, days: number, hour = 12): string {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

const NOW = new Date(2026, 10, 19, 10, 0, 0, 0); // 19 Nov 2026, 10:00 local

describe("Registration window description (presentation only)", () => {
  it("counts whole calendar days, not elapsed hours", () => {
    // 23:00 tonight is still "today", and 01:00 tomorrow is already "1 day".
    expect(calendarDaysUntil(isoFrom(NOW, 0, 23), NOW)).toBe(0);
    expect(calendarDaysUntil(isoFrom(NOW, 1, 1), NOW)).toBe(1);
    expect(calendarDaysUntil(isoFrom(NOW, 7), NOW)).toBe(7);
  });

  it("reads 'Closes today' for a deadline later the same day", () => {
    expect(describeRegistrationWindow(isoFrom(NOW, 0, 23), NOW)).toEqual({
      label: "Closes today",
      tone: "closing",
    });
  });

  it("reads 'Closes tomorrow' rather than 'in 1 days'", () => {
    expect(describeRegistrationWindow(isoFrom(NOW, 1), NOW).label).toBe(
      "Closes tomorrow"
    );
  });

  it("treats the next three days as urgent and anything further as open", () => {
    expect(describeRegistrationWindow(isoFrom(NOW, 3), NOW)).toEqual({
      label: "Closes in 3 days",
      tone: "closing",
    });
    expect(describeRegistrationWindow(isoFrom(NOW, 4), NOW)).toEqual({
      label: "Closes in 4 days",
      tone: "open",
    });
  });

  it("reports a past deadline as closed", () => {
    expect(describeRegistrationWindow(isoFrom(NOW, -1), NOW)).toEqual({
      label: "Registration closed",
      tone: "closed",
    });
  });

  it("treats a deadline exactly now as closed", () => {
    expect(describeRegistrationWindow(NOW.toISOString(), NOW).tone).toBe(
      "closed"
    );
  });
});

describe("DeadlineChip colours", () => {
  it("stays quiet while the deadline is far away", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);

    render(<DeadlineChip registrationDeadline={future.toISOString()} />);

    const chip = screen.getByText(/Closes in 10 days/);
    expect(chip).toHaveClass("bg-cookie-cream");
  });

  it("uses the warm urgency palette when closing soon", () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);

    render(<DeadlineChip registrationDeadline={soon.toISOString()} />);

    const chip = screen.getByText(/Closes in 2 days/);
    expect(chip).toHaveClass("bg-cookie-warningBg");
    expect(chip).toHaveClass("text-cookie-warningText");
  });

  it("renders a closed deadline as inactive, not as an error", () => {
    const past = new Date();
    past.setDate(past.getDate() - 2);

    render(<DeadlineChip registrationDeadline={past.toISOString()} />);

    const chip = screen.getByText("Registration closed");
    expect(chip).toHaveClass("bg-cookie-readonlyBg");
    expect(chip).toHaveClass("line-through");
    // Red belongs to validation failures; an elapsed date is not an error.
    expect(chip).not.toHaveClass("bg-cookie-errorBg");
  });
});
