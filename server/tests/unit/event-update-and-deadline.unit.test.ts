import { describe, it, expect } from "vitest";
import {
  assertCapacityFloor,
  validateEventUpdateInput,
} from "../../src/services/event.service.js";
import { assertBeforeDeadline } from "../../src/lib/deadline.js";
import { ApiError } from "../../src/lib/errors.js";

const START_AT = new Date("2026-12-10T09:00:00.000Z");
const CONTEXT = { startAt: START_AT };

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

describe("TEST-39 [UNIT-06]: event update validation (TDD #1, BR-01)", () => {
  it("accepts a capacity-only update", () => {
    expect(validateEventUpdateInput({ capacity: 25 }, CONTEXT)).toEqual({
      capacity: 25,
    });
  });

  it("accepts a deadline-only update and parses it to a Date", () => {
    const result = validateEventUpdateInput(
      { registrationDeadline: "2026-12-05T10:00:00.000Z" },
      CONTEXT
    );

    expect(result.capacity).toBeUndefined();
    expect(result.registrationDeadline).toEqual(
      new Date("2026-12-05T10:00:00.000Z")
    );
  });

  it("accepts the boundaries capacity = 1, capacity = 1000 and deadline = startAt", () => {
    expect(validateEventUpdateInput({ capacity: 1 }, CONTEXT).capacity).toBe(1);
    expect(validateEventUpdateInput({ capacity: 1000 }, CONTEXT).capacity).toBe(1000);
    expect(
      validateEventUpdateInput(
        { registrationDeadline: START_AT.toISOString() },
        CONTEXT
      ).registrationDeadline
    ).toEqual(START_AT);
  });

  it("accepts a deadline already in the past (closes registration, F-05 3.2)", () => {
    const past = "2020-01-01T00:00:00.000Z";
    expect(
      validateEventUpdateInput({ registrationDeadline: past }, CONTEXT)
        .registrationDeadline
    ).toEqual(new Date(past));
  });

  it("ignores fields that are not editable", () => {
    const result = validateEventUpdateInput(
      { capacity: 30, title: "Renamed", organizerId: "someone-else", startAt: "2030-01-01" },
      CONTEXT
    );

    expect(result).toEqual({ capacity: 30 });
  });

  it("rejects an empty payload with VALIDATION_ERROR", () => {
    const error = captureApiError(() => validateEventUpdateInput({}, CONTEXT));

    expect(error.status).toBe(400);
    expect(error.code).toBe("VALIDATION_ERROR");
  });

  it.each([
    ["zero", 0],
    ["above 1000", 1001],
    ["non-integer", 2.5],
    ["numeric string", "25"],
  ])("rejects capacity that is %s with a capacity field error", (_label, capacity) => {
    const error = captureApiError(() =>
      validateEventUpdateInput({ capacity }, CONTEXT)
    );

    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.details).toHaveProperty("capacity");
  });

  it.each([
    ["after startAt", "2026-12-10T09:00:00.001Z"],
    ["not a date", "next tuesday"],
  ])("rejects a registrationDeadline that is %s", (_label, registrationDeadline) => {
    const error = captureApiError(() =>
      validateEventUpdateInput({ registrationDeadline }, CONTEXT)
    );

    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.details).toHaveProperty("registrationDeadline");
  });
});

describe("TEST-39 [UNIT-06]: capacity floor (TDD #1, BR-07)", () => {
  it("allows capacity equal to or above the active registrations", () => {
    expect(() => assertCapacityFloor(2, 2)).not.toThrow();
    expect(() => assertCapacityFloor(10, 2)).not.toThrow();
  });

  it("rejects capacity below the active registrations with 409 CAPACITY_BELOW_ACTIVE_COUNT", () => {
    const error = captureApiError(() => assertCapacityFloor(1, 2));

    expect(error.status).toBe(409);
    expect(error.code).toBe("CAPACITY_BELOW_ACTIVE_COUNT");
  });
});

describe("TEST-39 [UNIT-06]: registration deadline cutoff (TDD #1, BR-06)", () => {
  const deadline = new Date("2026-12-05T10:00:00.000Z");

  it("allows a request before or exactly at the deadline", () => {
    expect(() =>
      assertBeforeDeadline(deadline, new Date("2026-12-05T09:59:59.999Z"))
    ).not.toThrow();
    expect(() => assertBeforeDeadline(deadline, deadline)).not.toThrow();
  });

  it("rejects a request after the deadline with 409 DEADLINE_PASSED", () => {
    const error = captureApiError(() =>
      assertBeforeDeadline(deadline, new Date("2026-12-05T10:00:00.001Z"))
    );

    expect(error.status).toBe(409);
    expect(error.code).toBe("DEADLINE_PASSED");
  });
});
