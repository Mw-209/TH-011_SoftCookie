import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { RegistrationStatus, SkillCategory } from "@prisma/client";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { SESSION_COOKIE_NAME } from "../../src/lib/session.js";

const prisma = getPrisma();

const ORGANIZER1_EMAIL = "organizer1@university.edu";
const STUDENT1_EMAIL = "student1@university.edu";
const STUDENT2_EMAIL = "student2@university.edu";

const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "";

// Fixture codes use a year no real event will reach (and a range apart from
// the F-05 suite), so cleanup is exact and nothing collides with seeded data.
const ONE_SEAT_EVENT_CODE = "EVT-2099-9101";
const EXPIRED_EVENT_CODE = "EVT-2099-9102";
const FIXTURE_CODES = [ONE_SEAT_EVENT_CODE, EXPIRED_EVENT_CODE];
const FIXTURE_REG_PREFIX = "REG-2099-91";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function sessionCookieFrom(res: request.Response): string | undefined {
  const raw = res.headers["set-cookie"];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return cookies.find((cookie) => cookie.startsWith(SESSION_COOKIE_NAME + "="));
}

async function cookieFor(email: string): Promise<string> {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: DEMO_PASSWORD });
  return sessionCookieFrom(res) as string;
}

let organizer1Cookie: string;
let student1Cookie: string;
let student2Cookie: string;

let organizer1Id: string;
let student1Id: string;

let oneSeatEventId: string;
let expiredEventId: string;

async function removeFixtures(): Promise<void> {
  await prisma.registration.deleteMany({
    where: { event: { eventCode: { in: FIXTURE_CODES } } },
  });
  await prisma.event.deleteMany({ where: { eventCode: { in: FIXTURE_CODES } } });
}

/**
 * Recreates the fixture events before every test. Dates are relative to now,
 * so the suite cannot expire on a calendar date.
 */
async function createFixtures(): Promise<void> {
  const now = Date.now();
  const base = {
    description: "Fixture event for the F-06 cancellation API tests.",
    skillCategory: SkillCategory.TECHNICAL,
    skillHours: 2,
    location: "Engineering Building Room 102",
    organizerId: organizer1Id,
  };

  const oneSeat = await prisma.event.create({
    data: {
      ...base,
      eventCode: ONE_SEAT_EVENT_CODE,
      title: "F-06 Fixture One-Seat Event",
      startAt: new Date(now + 10 * DAY),
      endAt: new Date(now + 10 * DAY + 3 * HOUR),
      registrationDeadline: new Date(now + 5 * DAY),
      capacity: 1,
    },
  });
  oneSeatEventId = oneSeat.id;

  const expired = await prisma.event.create({
    data: {
      ...base,
      eventCode: EXPIRED_EVENT_CODE,
      title: "F-06 Fixture Expired Event",
      startAt: new Date(now + 3 * DAY),
      endAt: new Date(now + 3 * DAY + 3 * HOUR),
      registrationDeadline: new Date(now - HOUR),
      capacity: 5,
    },
  });
  expiredEventId = expired.id;
}

/** Inserts a registration directly, for states the API cannot produce yet. */
async function insertRegistration(
  eventId: string,
  participantId: string,
  status: RegistrationStatus,
  suffix: string
) {
  return prisma.registration.create({
    data: {
      registrationNumber: `${FIXTURE_REG_PREFIX}${suffix}`,
      eventId,
      participantId,
      status,
      cancelledAt: status === RegistrationStatus.CANCELLED ? new Date() : null,
      checkedInAt: status === RegistrationStatus.ATTENDED ? new Date() : null,
    },
  });
}

async function storedStatus(registrationId: string) {
  return prisma.registration.findUniqueOrThrow({
    where: { id: registrationId },
    select: { status: true, cancelledAt: true },
  });
}

beforeAll(async () => {
  if (!DEMO_PASSWORD || DEMO_PASSWORD === "change-me") {
    throw new Error(
      "DEMO_USER_PASSWORD must be set to the seeded demo password before running API tests."
    );
  }

  await prisma.$connect();

  organizer1Cookie = await cookieFor(ORGANIZER1_EMAIL);
  student1Cookie = await cookieFor(STUDENT1_EMAIL);
  student2Cookie = await cookieFor(STUDENT2_EMAIL);

  const [organizer1, student1] = await Promise.all(
    [ORGANIZER1_EMAIL, STUDENT1_EMAIL].map((email) =>
      prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } })
    )
  );
  organizer1Id = organizer1.id;
  student1Id = student1.id;
});

beforeEach(async () => {
  await removeFixtures();
  await createFixtures();
});

afterAll(async () => {
  await removeFixtures();
});

describe("TEST-47 [API-24]: cancelling frees the seat immediately (TDD #2, AC-26, FR-09, BR-08)", () => {
  it("cancels before the deadline, releases the only seat, and lets student2 take it", async () => {
    const registered = await request(app)
      .post(`/api/events/${oneSeatEventId}/registrations`)
      .set("Cookie", student1Cookie);
    expect(registered.status).toBe(201);
    const registrationId = registered.body.data.registration.id as string;

    const cancelled = await request(app)
      .post(`/api/registrations/${registrationId}/cancel`)
      .set("Cookie", student1Cookie);

    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.registration).toMatchObject({
      id: registrationId,
      status: "CANCELLED",
      checkedInAt: null,
    });
    expect(cancelled.body.data.registration.cancelledAt).not.toBeNull();
    expect(cancelled.body.data.remainingSeats).toBe(1);

    const claimed = await request(app)
      .post(`/api/events/${oneSeatEventId}/registrations`)
      .set("Cookie", student2Cookie);
    expect(claimed.status).toBe(201);
  });
});

describe("TEST-48 [API-25]: late and invalid cancellations are rejected (TDD #2, AC-27, AC-28, BR-06)", () => {
  it("rejects cancelling after the deadline with 409 DEADLINE_PASSED and keeps REGISTERED", async () => {
    const registration = await insertRegistration(
      expiredEventId,
      student1Id,
      RegistrationStatus.REGISTERED,
      "01"
    );

    const res = await request(app)
      .post(`/api/registrations/${registration.id}/cancel`)
      .set("Cookie", student1Cookie);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DEADLINE_PASSED");
    expect((await storedStatus(registration.id)).status).toBe("REGISTERED");
  });

  it("rejects cancelling an already CANCELLED registration with 409 INVALID_STATE_TRANSITION", async () => {
    const registration = await insertRegistration(
      oneSeatEventId,
      student1Id,
      RegistrationStatus.CANCELLED,
      "02"
    );
    const before = await storedStatus(registration.id);

    const res = await request(app)
      .post(`/api/registrations/${registration.id}/cancel`)
      .set("Cookie", student1Cookie);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_STATE_TRANSITION");
    expect(await storedStatus(registration.id)).toEqual(before);
  });

  it("rejects cancelling an ATTENDED registration with 409 INVALID_STATE_TRANSITION", async () => {
    const registration = await insertRegistration(
      oneSeatEventId,
      student1Id,
      RegistrationStatus.ATTENDED,
      "03"
    );

    const res = await request(app)
      .post(`/api/registrations/${registration.id}/cancel`)
      .set("Cookie", student1Cookie);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_STATE_TRANSITION");
    expect((await storedStatus(registration.id)).status).toBe("ATTENDED");
  });
});

describe("TEST-49 [API-26]: role and ownership guards on cancel (AC-29, BR-04, BR-05, NFR-02)", () => {
  it("rejects another participant with 403 FORBIDDEN_OWNERSHIP and leaves the registration unchanged", async () => {
    const registration = await insertRegistration(
      oneSeatEventId,
      student1Id,
      RegistrationStatus.REGISTERED,
      "11"
    );

    const res = await request(app)
      .post(`/api/registrations/${registration.id}/cancel`)
      .set("Cookie", student2Cookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_OWNERSHIP");
    expect(res.body.data).toBeUndefined();
    expect((await storedStatus(registration.id)).status).toBe("REGISTERED");
  });

  it("rejects an ORGANIZER with 403 FORBIDDEN_ROLE and leaves the registration unchanged", async () => {
    const registration = await insertRegistration(
      oneSeatEventId,
      student1Id,
      RegistrationStatus.REGISTERED,
      "12"
    );

    const res = await request(app)
      .post(`/api/registrations/${registration.id}/cancel`)
      .set("Cookie", organizer1Cookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    expect((await storedStatus(registration.id)).status).toBe("REGISTERED");
  });

  it("rejects an unauthenticated client with 401 UNAUTHENTICATED", async () => {
    const registration = await insertRegistration(
      oneSeatEventId,
      student1Id,
      RegistrationStatus.REGISTERED,
      "13"
    );

    const res = await request(app).post(`/api/registrations/${registration.id}/cancel`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
    expect((await storedStatus(registration.id)).status).toBe("REGISTERED");
  });

  it("returns 404 NOT_FOUND for an unknown registration", async () => {
    const res = await request(app)
      .post("/api/registrations/00000000-0000-0000-0000-000000000000/cancel")
      .set("Cookie", student1Cookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("TEST-50 [API-27]: re-registration after cancelling (AC-30, FR-09, BR-02, BR-06, BR-08)", () => {
  it("reactivates the same row with the same registration number (201)", async () => {
    const first = await request(app)
      .post(`/api/events/${oneSeatEventId}/registrations`)
      .set("Cookie", student1Cookie);
    const original = first.body.data.registration;

    await request(app)
      .post(`/api/registrations/${original.id}/cancel`)
      .set("Cookie", student1Cookie);

    const again = await request(app)
      .post(`/api/events/${oneSeatEventId}/registrations`)
      .set("Cookie", student1Cookie);

    expect(again.status).toBe(201);
    expect(again.body.data.registration).toMatchObject({
      id: original.id,
      registrationNumber: original.registrationNumber,
      status: "REGISTERED",
      cancelledAt: null,
    });
    expect(
      new Date(again.body.data.registration.registeredAt).getTime()
    ).toBeGreaterThanOrEqual(new Date(original.registeredAt).getTime());
    expect(again.body.data.remainingSeats).toBe(0);
    expect(
      await prisma.registration.count({
        where: { eventId: oneSeatEventId, participantId: student1Id },
      })
    ).toBe(1);
  });

  it("rejects re-registration with 409 EVENT_FULL once another participant took the freed seat", async () => {
    const first = await request(app)
      .post(`/api/events/${oneSeatEventId}/registrations`)
      .set("Cookie", student1Cookie);
    const registrationId = first.body.data.registration.id as string;

    await request(app)
      .post(`/api/registrations/${registrationId}/cancel`)
      .set("Cookie", student1Cookie);
    const taken = await request(app)
      .post(`/api/events/${oneSeatEventId}/registrations`)
      .set("Cookie", student2Cookie);
    expect(taken.status).toBe(201);

    const again = await request(app)
      .post(`/api/events/${oneSeatEventId}/registrations`)
      .set("Cookie", student1Cookie);

    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("EVENT_FULL");
    expect((await storedStatus(registrationId)).status).toBe("CANCELLED");
  });

  it("rejects re-registration with 409 DEADLINE_PASSED once the deadline has passed", async () => {
    const registration = await insertRegistration(
      expiredEventId,
      student1Id,
      RegistrationStatus.CANCELLED,
      "21"
    );
    const before = await storedStatus(registration.id);

    const res = await request(app)
      .post(`/api/events/${expiredEventId}/registrations`)
      .set("Cookie", student1Cookie);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DEADLINE_PASSED");
    expect(await storedStatus(registration.id)).toEqual(before);
  });
});
