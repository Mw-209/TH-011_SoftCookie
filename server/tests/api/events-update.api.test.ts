import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { SkillCategory } from "@prisma/client";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { SESSION_COOKIE_NAME } from "../../src/lib/session.js";

const prisma = getPrisma();

const ORGANIZER1_EMAIL = "organizer1@university.edu";
const ORGANIZER2_EMAIL = "organizer2@university.edu";
const STUDENT1_EMAIL = "student1@university.edu";
const STUDENT2_EMAIL = "student2@university.edu";

const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "";

// Fixture events use a year no real event will reach, so their codes never
// collide with EVT-<current year>-NNNN allocation and cleanup is exact.
const OPEN_EVENT_CODE = "EVT-2099-9001";
const EXPIRED_EVENT_CODE = "EVT-2099-9002";
const FIXTURE_CODES = [OPEN_EVENT_CODE, EXPIRED_EVENT_CODE];
const FIXTURE_REG_PREFIX = "REG-2099-";

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
let organizer2Cookie: string;
let student1Cookie: string;

let organizer1Id: string;
let student1Id: string;
let student2Id: string;

let openEventId: string;
let openEventStartAt: Date;
let expiredEventId: string;

async function removeFixtures(): Promise<void> {
  await prisma.registration.deleteMany({
    where: { event: { eventCode: { in: FIXTURE_CODES } } },
  });
  await prisma.event.deleteMany({ where: { eventCode: { in: FIXTURE_CODES } } });
}

/**
 * Recreates both fixture events before every test so each case starts from a
 * known capacity, deadline and registration count. Dates are relative to now,
 * so the suite cannot expire on a calendar date.
 */
async function createFixtures(): Promise<void> {
  const now = Date.now();
  openEventStartAt = new Date(now + 10 * DAY);

  const base = {
    description: "Fixture event for the F-05 capacity and deadline API tests.",
    skillCategory: SkillCategory.TECHNICAL,
    skillHours: 2,
    location: "Engineering Building Room 101",
    organizerId: organizer1Id,
  };

  const open = await prisma.event.create({
    data: {
      ...base,
      eventCode: OPEN_EVENT_CODE,
      title: "F-05 Fixture Open Event",
      startAt: openEventStartAt,
      endAt: new Date(now + 10 * DAY + 3 * HOUR),
      registrationDeadline: new Date(now + 5 * DAY),
      capacity: 5,
    },
  });
  openEventId = open.id;

  const expired = await prisma.event.create({
    data: {
      ...base,
      eventCode: EXPIRED_EVENT_CODE,
      title: "F-05 Fixture Expired Event",
      startAt: new Date(now + 3 * DAY),
      endAt: new Date(now + 3 * DAY + 3 * HOUR),
      registrationDeadline: new Date(now - HOUR),
      capacity: 5,
    },
  });
  expiredEventId = expired.id;
}

/** Gives the open event activeCount = 2 (student1 and student2). */
async function seedTwoActiveRegistrations(): Promise<void> {
  await prisma.registration.createMany({
    data: [
      {
        registrationNumber: `${FIXTURE_REG_PREFIX}0001`,
        eventId: openEventId,
        participantId: student1Id,
      },
      {
        registrationNumber: `${FIXTURE_REG_PREFIX}0002`,
        eventId: openEventId,
        participantId: student2Id,
      },
    ],
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
  organizer2Cookie = await cookieFor(ORGANIZER2_EMAIL);
  student1Cookie = await cookieFor(STUDENT1_EMAIL);

  const [organizer1, student1, student2] = await Promise.all(
    [ORGANIZER1_EMAIL, STUDENT1_EMAIL, STUDENT2_EMAIL].map((email) =>
      prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } })
    )
  );
  organizer1Id = organizer1.id;
  student1Id = student1.id;
  student2Id = student2.id;
});

beforeEach(async () => {
  await removeFixtures();
  await createFixtures();
});

afterAll(async () => {
  await removeFixtures();
});

async function storedOpenEvent() {
  return prisma.event.findUniqueOrThrow({
    where: { id: openEventId },
    select: { capacity: true, registrationDeadline: true },
  });
}

describe("TEST-40 [API-20]: owning organizer updates capacity and deadline (AC-21, FR-07)", () => {
  it("increases capacity and returns the recalculated remainingSeats", async () => {
    await seedTwoActiveRegistrations();

    const res = await request(app)
      .patch(`/api/events/${openEventId}`)
      .set("Cookie", organizer1Cookie)
      .send({ capacity: 8 });

    expect(res.status).toBe(200);
    expect(res.body.data.event).toMatchObject({
      id: openEventId,
      capacity: 8,
      activeRegistrationsCount: 2,
      remainingSeats: 6,
    });

    const detail = await request(app)
      .get(`/api/events/${openEventId}`)
      .set("Cookie", organizer1Cookie);
    expect(detail.body.data.event.capacity).toBe(8);
    expect(detail.body.data.event.remainingSeats).toBe(6);
  });

  it("decreases capacity safely down to the active count (boundary, BR-07)", async () => {
    await seedTwoActiveRegistrations();

    const res = await request(app)
      .patch(`/api/events/${openEventId}`)
      .set("Cookie", organizer1Cookie)
      .send({ capacity: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data.event.capacity).toBe(2);
    expect(res.body.data.event.remainingSeats).toBe(0);
    expect((await storedOpenEvent()).capacity).toBe(2);
  });

  it("moves the registration deadline earlier and persists it", async () => {
    const earlier = new Date(Date.now() + 2 * DAY);
    earlier.setMilliseconds(0);

    const res = await request(app)
      .patch(`/api/events/${openEventId}`)
      .set("Cookie", organizer1Cookie)
      .send({ registrationDeadline: earlier.toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.data.event.registrationDeadline).toBe(earlier.toISOString());
    expect((await storedOpenEvent()).registrationDeadline).toEqual(earlier);
  });

  it("updates capacity and deadline together and ignores non-editable fields", async () => {
    const deadline = new Date(Date.now() + 3 * DAY);
    deadline.setMilliseconds(0);

    const res = await request(app)
      .patch(`/api/events/${openEventId}`)
      .set("Cookie", organizer1Cookie)
      .send({
        capacity: 7,
        registrationDeadline: deadline.toISOString(),
        title: "Renamed by the client",
        organizerId: student2Id,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.event).toMatchObject({
      capacity: 7,
      registrationDeadline: deadline.toISOString(),
      title: "F-05 Fixture Open Event",
      organizerId: organizer1Id,
    });
  });
});

describe("TEST-41 [API-21]: capacity floor and invalid updates (TDD #1, AC-22, AC-23)", () => {
  it("rejects capacity below the active registrations with 409 and leaves the event unchanged (AC-22, BR-07)", async () => {
    await seedTwoActiveRegistrations();

    const res = await request(app)
      .patch(`/api/events/${openEventId}`)
      .set("Cookie", organizer1Cookie)
      .send({ capacity: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CAPACITY_BELOW_ACTIVE_COUNT");
    expect((await storedOpenEvent()).capacity).toBe(5);
  });

  it.each([
    ["capacity = 0", { capacity: 0 }, "capacity"],
    ["capacity above 1000", { capacity: 1001 }, "capacity"],
    ["non-integer capacity", { capacity: 2.5 }, "capacity"],
  ])("rejects %s with 400 VALIDATION_ERROR (AC-23)", async (_label, body, field) => {
    const res = await request(app)
      .patch(`/api/events/${openEventId}`)
      .set("Cookie", organizer1Cookie)
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toHaveProperty(field);
    expect((await storedOpenEvent()).capacity).toBe(5);
  });

  it("rejects a registrationDeadline after startAt with 400 VALIDATION_ERROR (AC-23, BR-01)", async () => {
    const before = await storedOpenEvent();
    const afterStart = new Date(openEventStartAt.getTime() + HOUR).toISOString();

    const res = await request(app)
      .patch(`/api/events/${openEventId}`)
      .set("Cookie", organizer1Cookie)
      .send({ registrationDeadline: afterStart });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toHaveProperty("registrationDeadline");
    expect((await storedOpenEvent()).registrationDeadline).toEqual(
      before.registrationDeadline
    );
  });

  it("rejects an empty body with 400 VALIDATION_ERROR (AC-23)", async () => {
    const res = await request(app)
      .patch(`/api/events/${openEventId}`)
      .set("Cookie", organizer1Cookie)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("TEST-42 [API-22]: role and ownership guards on PATCH (AC-24, BR-04, BR-05, NFR-02)", () => {
  it("rejects a non-owning ORGANIZER with 403 FORBIDDEN_OWNERSHIP and changes nothing", async () => {
    const res = await request(app)
      .patch(`/api/events/${openEventId}`)
      .set("Cookie", organizer2Cookie)
      .send({ capacity: 9 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_OWNERSHIP");
    expect(res.body.data).toBeUndefined();
    expect((await storedOpenEvent()).capacity).toBe(5);
  });

  it("rejects a PARTICIPANT with 403 FORBIDDEN_ROLE and changes nothing", async () => {
    const res = await request(app)
      .patch(`/api/events/${openEventId}`)
      .set("Cookie", student1Cookie)
      .send({ capacity: 9 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    expect((await storedOpenEvent()).capacity).toBe(5);
  });

  it("rejects an unauthenticated client with 401 UNAUTHENTICATED", async () => {
    const res = await request(app)
      .patch(`/api/events/${openEventId}`)
      .send({ capacity: 9 });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
    expect((await storedOpenEvent()).capacity).toBe(5);
  });

  it("returns 404 NOT_FOUND for an unknown event", async () => {
    const res = await request(app)
      .patch("/api/events/00000000-0000-0000-0000-000000000000")
      .set("Cookie", organizer1Cookie)
      .send({ capacity: 9 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("TEST-43 [API-23]: registration after the deadline (AC-25, FR-08, BR-06)", () => {
  it("rejects registration once registrationDeadline has passed with 409 DEADLINE_PASSED and creates no row", async () => {
    const res = await request(app)
      .post(`/api/events/${expiredEventId}/registrations`)
      .set("Cookie", student1Cookie);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DEADLINE_PASSED");
    expect(
      await prisma.registration.count({ where: { eventId: expiredEventId } })
    ).toBe(0);
  });

  it("still accepts registration while the deadline is open (regression guard)", async () => {
    const res = await request(app)
      .post(`/api/events/${openEventId}/registrations`)
      .set("Cookie", student1Cookie);

    expect(res.status).toBe(201);
  });
});
