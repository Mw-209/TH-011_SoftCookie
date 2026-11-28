import { describe, it, expect } from "vitest";
import {
  assertCancellationEligible,
  assertRegistrationEligible,
} from "../../src/services/registration.service.js";
import { ApiError } from "../../src/lib/errors.js";

const DEADLINE = new Date("2026-12-05T10:00:00.000Z");
const BEFORE = new Date("2026-12-05T09:59:59.999Z");
const AFTER = new Date("2026-12-05T10:00:00.001Z");

/** Runs fn and returns the ApiError it throws, failing the test otherwise. */
function captureApiError(fn: () => unknown): ApiError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error("Expected an ApiError to be thrown, but nothing was thrown.");
}

describe("TEST-46 [UNIT-07]: cancellation eligibility (TDD #2, BR-06, BR-08)", () => {
  it("allows cancelling a REGISTERED row before or exactly at the deadline", () => {
    expect(() =>
      assertCancellationEligible({ status: "REGISTERED", registrationDeadline: DEADLINE, now: BEFORE })
    ).not.toThrow();
    expect(() =>
      assertCancellationEligible({ status: "REGISTERED", registrationDeadline: DEADLINE, now: DEADLINE })
    ).not.toThrow();
  });

  it("rejects cancelling a REGISTERED row after the deadline with 409 DEADLINE_PASSED (AC-27)", () => {
    const error = captureApiError(() =>
      assertCancellationEligible({ status: "REGISTERED", registrationDeadline: DEADLINE, now: AFTER })
    );

    expect(error.status).toBe(409);
    expect(error.code).toBe("DEADLINE_PASSED");
  });

  it.each(["CANCELLED", "ATTENDED"] as const)(
    "rejects cancelling a %s row with 409 INVALID_STATE_TRANSITION (AC-28)",
    (status) => {
      const error = captureApiError(() =>
        assertCancellationEligible({ status, registrationDeadline: DEADLINE, now: BEFORE })
      );

      expect(error.status).toBe(409);
      expect(error.code).toBe("INVALID_STATE_TRANSITION");
    }
  );

  it("reports the state problem before the deadline problem", () => {
    const error = captureApiError(() =>
      assertCancellationEligible({ status: "CANCELLED", registrationDeadline: DEADLINE, now: AFTER })
    );

    expect(error.code).toBe("INVALID_STATE_TRANSITION");
  });
});

describe("TEST-46 [UNIT-07]: re-registration eligibility (TDD #2, BR-02, BR-03, BR-08)", () => {
  it("lets a participant with a CANCELLED row register again while a seat is free (AC-30)", () => {
    expect(() =>
      assertRegistrationEligible({ capacity: 2, activeCount: 1, existingStatus: "CANCELLED" })
    ).not.toThrow();
  });

  it("rejects re-registration of a CANCELLED row when the event is full with EVENT_FULL", () => {
    const error = captureApiError(() =>
      assertRegistrationEligible({ capacity: 2, activeCount: 2, existingStatus: "CANCELLED" })
    );

    expect(error.code).toBe("EVENT_FULL");
  });

  it("still rejects a participant who holds an ATTENDED row with DUPLICATE_REGISTRATION", () => {
    const error = captureApiError(() =>
      assertRegistrationEligible({ capacity: 5, activeCount: 1, existingStatus: "ATTENDED" })
    );

    expect(error.code).toBe("DUPLICATE_REGISTRATION");
  });
});
