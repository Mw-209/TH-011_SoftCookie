import { describe, it, expect } from "vitest";
import {
  formatEventCode,
  validateEventInput,
} from "../../src/services/event.service.js";
import { ApiError } from "../../src/lib/errors.js";

/** A payload that satisfies every BR-01 rule; individual cases override one field. */
function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: "Cloud Native Docker Workshop",
    description: "Hands-on containerization workshop for engineering students.",
    skillCategory: "TECHNICAL",
    skillHours: 3,
    location: "Engineering Building Room 402",
    startAt: "2026-12-01T09:00:00.000Z",
    endAt: "2026-12-01T12:00:00.000Z",
    registrationDeadline: "2026-11-30T23:59:00.000Z",
    capacity: 25,
    ...overrides,
  };
}

/** Asserts a VALIDATION_ERROR naming exactly the expected fields. */
function expectValidationError(
  payload: Record<string, unknown>,
  expectedFields: string[]
) {
  try {
    validateEventInput(payload);
    throw new Error(
      `Expected validation to fail for ${JSON.stringify(payload)}`
    );
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(400);
    expect(apiError.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(apiError.details ?? {}).sort()).toEqual(
      [...expectedFields].sort()
    );
    return apiError;
  }
}

describe("TEST-10 [UNIT-02]: Event code format and input normalization", () => {
  it("formats the official code as EVT-YYYY-NNNN with a zero-padded sequence", () => {
    expect(formatEventCode(2026, 1)).toBe("EVT-2026-0001");
    expect(formatEventCode(2026, 4)).toBe("EVT-2026-0004");
    expect(formatEventCode(2026, 42)).toBe("EVT-2026-0042");
    expect(formatEventCode(2026, 1234)).toBe("EVT-2026-1234");
    expect(formatEventCode(2027, 1)).toBe("EVT-2027-0001");
  });

  it("produces codes that match the contract pattern", () => {
    for (let sequence = 1; sequence <= 20; sequence += 1) {
      expect(formatEventCode(2026, sequence)).toMatch(/^EVT-2026-\d{4}$/);
    }
  });

  it("keeps sequences unique and ordered", () => {
    const codes = Array.from({ length: 50 }, (_, index) =>
      formatEventCode(2026, index + 1)
    );

    expect(new Set(codes).size).toBe(50);
    expect([...codes].sort()).toEqual(codes);
  });

  it("trims surrounding whitespace from free-text fields", () => {
    const result = validateEventInput(
      validPayload({
        title: "   Cloud Native Docker Workshop   ",
        location: "\tEngineering Building Room 402\n",
        description: "  Hands-on containerization workshop for students.  ",
      })
    );

    expect(result.title).toBe("Cloud Native Docker Workshop");
    expect(result.location).toBe("Engineering Building Room 402");
    expect(result.description).toBe(
      "Hands-on containerization workshop for students."
    );
  });

  it("returns dates as Date objects and numbers as numbers", () => {
    const result = validateEventInput(validPayload());

    expect(result.startAt).toBeInstanceOf(Date);
    expect(result.endAt).toBeInstanceOf(Date);
    expect(result.registrationDeadline).toBeInstanceOf(Date);
    expect(result.startAt.toISOString()).toBe("2026-12-01T09:00:00.000Z");
    expect(result.capacity).toBe(25);
    expect(result.skillHours).toBe(3);
    expect(result.skillCategory).toBe("TECHNICAL");
  });

  it("accepts every skill category defined by the schema", () => {
    for (const category of ["TECHNICAL", "DATA_AI", "COMMUNICATION", "CAREER"]) {
      expect(
        validateEventInput(validPayload({ skillCategory: category }))
          .skillCategory
      ).toBe(category);
    }
  });

  it("accepts the inclusive boundaries of BR-01", () => {
    expect(validateEventInput(validPayload({ capacity: 1 })).capacity).toBe(1);
    expect(validateEventInput(validPayload({ capacity: 1000 })).capacity).toBe(
      1000
    );
    expect(validateEventInput(validPayload({ skillHours: 1 })).skillHours).toBe(
      1
    );
    expect(
      validateEventInput(validPayload({ skillHours: 40 })).skillHours
    ).toBe(40);
    expect(validateEventInput(validPayload({ title: "12345" })).title).toBe(
      "12345"
    );

    // registrationDeadline === startAt is allowed (deadline <= startAt).
    const sameInstant = validateEventInput(
      validPayload({ registrationDeadline: "2026-12-01T09:00:00.000Z" })
    );
    expect(sameInstant.registrationDeadline.toISOString()).toBe(
      sameInstant.startAt.toISOString()
    );
  });
});

describe("TEST-11 [UNIT-03]: Event domain validation (BR-01)", () => {
  it("rejects a non-positive capacity", () => {
    for (const capacity of [0, -1, -5]) {
      const error = expectValidationError(validPayload({ capacity }), [
        "capacity",
      ]);
      expect(error.details?.capacity).toMatch(/capacity/i);
    }
  });

  it("rejects a non-integer capacity", () => {
    expectValidationError(validPayload({ capacity: 1.5 }), ["capacity"]);
    expectValidationError(validPayload({ capacity: "25" }), ["capacity"]);
    expectValidationError(validPayload({ capacity: Number.NaN }), ["capacity"]);
  });

  it("rejects a capacity above the 1000 seat ceiling", () => {
    expectValidationError(validPayload({ capacity: 1001 }), ["capacity"]);
  });

  it("rejects non-positive or out-of-range skill hours", () => {
    for (const skillHours of [0, -2, 41, 2.5]) {
      expectValidationError(validPayload({ skillHours }), ["skillHours"]);
    }
  });

  it("rejects a title shorter than 5 or longer than 120 characters", () => {
    expectValidationError(validPayload({ title: "AI" }), ["title"]);
    expectValidationError(validPayload({ title: "   " }), ["title"]);
    expectValidationError(validPayload({ title: "x".repeat(121) }), ["title"]);
  });

  it("rejects an out-of-range location or description", () => {
    expectValidationError(validPayload({ location: "A" }), ["location"]);
    expectValidationError(validPayload({ location: "x".repeat(151) }), [
      "location",
    ]);
    expectValidationError(validPayload({ description: "too short" }), [
      "description",
    ]);
    expectValidationError(validPayload({ description: "x".repeat(2001) }), [
      "description",
    ]);
  });

  it("rejects an unknown skill category", () => {
    expectValidationError(validPayload({ skillCategory: "SPORTS" }), [
      "skillCategory",
    ]);
    expectValidationError(validPayload({ skillCategory: "technical" }), [
      "skillCategory",
    ]);
  });

  it("rejects a registration deadline after the start time (AC-07)", () => {
    expectValidationError(
      validPayload({ registrationDeadline: "2026-12-01T09:00:00.001Z" }),
      ["registrationDeadline"]
    );
    expectValidationError(
      validPayload({ registrationDeadline: "2026-12-05T00:00:00.000Z" }),
      ["registrationDeadline"]
    );
  });

  it("rejects an end time at or before the start time", () => {
    expectValidationError(
      validPayload({ endAt: "2026-12-01T09:00:00.000Z" }),
      ["endAt"]
    );
    expectValidationError(
      validPayload({ endAt: "2026-12-01T08:00:00.000Z" }),
      ["endAt"]
    );
  });

  it("rejects unparseable or missing dates", () => {
    expectValidationError(validPayload({ startAt: "not-a-date" }), ["startAt"]);
    expectValidationError(validPayload({ endAt: "" }), ["endAt"]);
    expectValidationError(validPayload({ registrationDeadline: null }), [
      "registrationDeadline",
    ]);
  });

  it("reports every missing required field at once", () => {
    expectValidationError({}, [
      "title",
      "description",
      "skillCategory",
      "skillHours",
      "location",
      "startAt",
      "endAt",
      "registrationDeadline",
      "capacity",
    ]);
  });

  it("ignores a client-supplied eventCode, id or organizerId (BR-01, BR-04)", () => {
    const result = validateEventInput(
      validPayload({
        id: "forged-id",
        eventCode: "EVT-2026-9999",
        organizerId: "someone-else",
      })
    ) as unknown as Record<string, unknown>;

    expect(result.id).toBeUndefined();
    expect(result.eventCode).toBeUndefined();
    expect(result.organizerId).toBeUndefined();
  });
});
