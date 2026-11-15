import { describe, it, expect } from "vitest";
import {
  formatRegistrationNumber,
  calculateRemainingSeats,
  assertRegistrationEligible,
  ACTIVE_REGISTRATION_STATUSES,
} from "../../src/services/registration.service.js";
import { ApiError } from "../../src/lib/errors.js";

/** Captures the ApiError a rule evaluation is expected to throw. */
function expectApiError(run: () => void, code: string, status: number): ApiError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe(code);
    expect(apiError.status).toBe(status);
    return apiError;
  }

  throw new Error(`Expected an ApiError with code ${code}`);
}

describe("TEST-20 [UNIT-04]: Registration number and seat arithmetic", () => {
  it("formats the official number as REG-YYYY-NNNN with a zero-padded sequence", () => {
    expect(formatRegistrationNumber(2026, 1)).toBe("REG-2026-0001");
    expect(formatRegistrationNumber(2026, 19)).toBe("REG-2026-0019");
    expect(formatRegistrationNumber(2026, 1234)).toBe("REG-2026-1234");
    expect(formatRegistrationNumber(2027, 1)).toBe("REG-2027-0001");
  });

  it("produces unique, ordered numbers for consecutive sequences", () => {
    const numbers = Array.from({ length: 50 }, (_, index) =>
      formatRegistrationNumber(2026, index + 1)
    );

    expect(new Set(numbers).size).toBe(50);
    expect([...numbers].sort()).toEqual(numbers);
    for (const number of numbers) {
      expect(number).toMatch(/^REG-2026-\d{4}$/);
    }
  });

  it("computes remaining seats as capacity minus active registrations", () => {
    expect(calculateRemainingSeats(20, 0)).toBe(20);
    expect(calculateRemainingSeats(20, 1)).toBe(19);
    expect(calculateRemainingSeats(20, 20)).toBe(0);
    expect(calculateRemainingSeats(1, 0)).toBe(1);
    expect(calculateRemainingSeats(1, 1)).toBe(0);
  });

  it("never reports negative seats, even if a capacity drop oversubscribes an event", () => {
    // BR-07 lets Sprint 2 reduce capacity; the figure shown must stay sane.
    expect(calculateRemainingSeats(5, 8)).toBe(0);
    expect(calculateRemainingSeats(0, 3)).toBe(0);
  });

  it("counts REGISTERED and ATTENDED as the active statuses (BR-02)", () => {
    expect([...ACTIVE_REGISTRATION_STATUSES].sort()).toEqual([
      "ATTENDED",
      "REGISTERED",
    ]);
    expect(ACTIVE_REGISTRATION_STATUSES).not.toContain("CANCELLED");
  });
});

describe("TEST-21 [UNIT-05]: Registration eligibility rules (BR-02, BR-03)", () => {
  it("allows a first registration while seats remain", () => {
    expect(() =>
      assertRegistrationEligible({
        capacity: 20,
        activeCount: 5,
        existingStatus: null,
      })
    ).not.toThrow();
  });

  it("allows the very last seat", () => {
    expect(() =>
      assertRegistrationEligible({
        capacity: 1,
        activeCount: 0,
        existingStatus: null,
      })
    ).not.toThrow();
  });

  it("rejects a participant who already holds an active registration (BR-03)", () => {
    for (const existingStatus of ["REGISTERED", "ATTENDED"] as const) {
      const error = expectApiError(
        () =>
          assertRegistrationEligible({
            capacity: 20,
            activeCount: 5,
            existingStatus,
          }),
        "DUPLICATE_REGISTRATION",
        409
      );
      expect(error.message).toMatch(/already/i);
    }
  });

  it("rejects a registration once the event is full (BR-02)", () => {
    const error = expectApiError(
      () =>
        assertRegistrationEligible({
          capacity: 1,
          activeCount: 1,
          existingStatus: null,
        }),
      "EVENT_FULL",
      409
    );
    expect(error.message).toMatch(/full/i);
  });

  it("rejects an over-subscribed event as full, not as something else", () => {
    expectApiError(
      () =>
        assertRegistrationEligible({
          capacity: 5,
          activeCount: 9,
          existingStatus: null,
        }),
      "EVENT_FULL",
      409
    );
  });

  it("reports a duplicate before capacity when both apply", () => {
    // A participant who already holds a seat is not competing for one, so
    // EVENT_FULL would be a misleading answer.
    expectApiError(
      () =>
        assertRegistrationEligible({
          capacity: 1,
          activeCount: 1,
          existingStatus: "REGISTERED",
        }),
      "DUPLICATE_REGISTRATION",
      409
    );
  });

  it("lets a cancelled registration through, since its seat was released", () => {
    // Re-registration lands with F-06 in Sprint 2; the rule evaluator must not
    // treat a released seat as still held.
    expect(() =>
      assertRegistrationEligible({
        capacity: 20,
        activeCount: 5,
        existingStatus: "CANCELLED",
      })
    ).not.toThrow();
  });
});
