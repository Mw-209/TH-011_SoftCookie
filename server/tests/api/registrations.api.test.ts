import { describe, it, expect, beforeAll, afterEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { SESSION_COOKIE_NAME } from "../../src/lib/session.js";

const prisma = getPrisma();

const ORGANIZER_EMAIL = "organizer1@university.edu";
const STUDENT1_EMAIL = "student1@university.edu";
const STUDENT2_EMAIL = "student2@university.edu";
const STUDENT3_EMAIL = "student3@university.edu";

const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "";

/** Seeded 20-seat event. */
const EVENT1_CODE = "EVT-2026-0001";
/** Seeded 1-seat boundary event, used for the full and concurrency cases. */
const EVENT2_CODE = "EVT-2026-0002";

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

async function eventIdFor(code: string): Promise<string> {
  const event = await prisma.event.findUniqueOrThrow({
    where: { eventCode: code },
  });
  return event.id;
}

async function activeCountFor(eventId: string): Promise<number> {
  return prisma.registration.count({
    where: { eventId, status: { in: ["REGISTERED", "ATTENDED"] } },
  });
}

let student1Cookie: string;
let student2Cookie: string;
let student3Cookie: string;
let organizerCookie: string;
let event1Id: string;
let event2Id: string;

beforeAll(async () => {
  if (!DEMO_PASSWORD || DEMO_PASSWORD === "change-me") {
    throw new Error(
      "DEMO_USER_PASSWORD must be set to the seeded demo password before running API tests."
    );
  }

  await prisma.$connect();

  [student1Cookie, student2Cookie, student3Cookie, organizerCookie] =
    await Promise.all([
      cookieFor(STUDENT1_EMAIL),
      cookieFor(STUDENT2_EMAIL),
      cookieFor(STUDENT3_EMAIL),
      cookieFor(ORGANIZER_EMAIL),
    ]);

  event1Id = await eventIdFor(EVENT1_CODE);
  event2Id = await eventIdFor(EVENT2_CODE);

  // Warm up: NFR-04 budgets steady-state latency, not Prisma's cold start.
  await request(app).get("/api/registrations/my").set("Cookie", student1Cookie);
});

afterEach(async () => {
  // The seeded events are shared with the F-02 suite, which asserts their seat
  // figures. Every registration this suite creates must be removed, leaving the
  // table exactly as it was found.
  await prisma.registration.deleteMany({});
});

describe("TEST-22 [API-10]: Participant registers for an event", () => {
  it("returns 201 with an official number and decrements seats (AC-10)", async () => {
    const res = await request(app)
      .post(`/api/events/${event1Id}/registrations`)
      .set("Cookie", student1Cookie)
      .send({});

    expect(res.status).toBe(201);

    const { registration, remainingSeats } = res.body.data;
    expect(registration.registrationNumber).toMatch(/^REG-\d{4}-\d{4}$/);
    expect(registration.status).toBe("REGISTERED");
    expect(registration.eventId).toBe(event1Id);
    expect(remainingSeats).toBe(19);

    const stored = await prisma.registration.findUnique({
      where: { id: registration.id },
    });
    expect(stored).not.toBeNull();
    expect(stored?.status).toBe("REGISTERED");
  });

  it("responds within 500ms (NFR-04)", async () => {
    const durations: number[] = [];

    // Median of several runs, as in auth.api.test.ts: one scheduling hiccup
    // must not fail a healthy endpoint.
    for (const cookie of [student1Cookie, student2Cookie, student3Cookie]) {
      const startedAt = Date.now();
      await request(app)
        .post(`/api/events/${event1Id}/registrations`)
        .set("Cookie", cookie)
        .send({});
      durations.push(Date.now() - startedAt);
    }

    durations.sort((a, b) => a - b);
    expect(durations[1]).toBeLessThan(500);
  });

  it("derives the owner from the session, ignoring a supplied participantId (BR-04)", async () => {
    const student1 = await prisma.user.findUniqueOrThrow({
      where: { email: STUDENT1_EMAIL },
    });
    const student2 = await prisma.user.findUniqueOrThrow({
      where: { email: STUDENT2_EMAIL },
    });

    const res = await request(app)
      .post(`/api/events/${event1Id}/registrations`)
      .set("Cookie", student1Cookie)
      .send({ participantId: student2.id, status: "ATTENDED" });

    expect(res.status).toBe(201);
    expect(res.body.data.registration.participantId).toBe(student1.id);
    expect(res.body.data.registration.status).toBe("REGISTERED");
  });

  it("returns 404 for an event that does not exist", async () => {
    const res = await request(app)
      .post("/api/events/00000000-0000-0000-0000-000000000000/registrations")
      .set("Cookie", student1Cookie)
      .send({});

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("TEST-23 [API-11]: Duplicate registration is rejected (BR-03)", () => {
  it("rejects a second attempt with 409 and keeps exactly one row (AC-11)", async () => {
    const first = await request(app)
      .post(`/api/events/${event1Id}/registrations`)
      .set("Cookie", student1Cookie)
      .send({});
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/events/${event1Id}/registrations`)
      .set("Cookie", student1Cookie)
      .send({});

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("DUPLICATE_REGISTRATION");

    const student1 = await prisma.user.findUniqueOrThrow({
      where: { email: STUDENT1_EMAIL },
    });
    expect(
      await prisma.registration.count({
        where: { eventId: event1Id, participantId: student1.id },
      })
    ).toBe(1);
  });

  it("still allows the same participant to register for a different event", async () => {
    await request(app)
      .post(`/api/events/${event1Id}/registrations`)
      .set("Cookie", student1Cookie)
      .send({});

    const other = await request(app)
      .post(`/api/events/${event2Id}/registrations`)
      .set("Cookie", student1Cookie)
      .send({});

    expect(other.status).toBe(201);
  });
});

describe("TEST-24 [API-12]: A full event rejects further registrations (BR-02)", () => {
  it("returns 409 EVENT_FULL and leaves the active count at capacity (AC-12)", async () => {
    // EVT-2026-0002 has capacity 1, so one registration fills it.
    const first = await request(app)
      .post(`/api/events/${event2Id}/registrations`)
      .set("Cookie", student1Cookie)
      .send({});
    expect(first.status).toBe(201);
    expect(first.body.data.remainingSeats).toBe(0);

    const second = await request(app)
      .post(`/api/events/${event2Id}/registrations`)
      .set("Cookie", student2Cookie)
      .send({});

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("EVENT_FULL");

    const student2 = await prisma.user.findUniqueOrThrow({
      where: { email: STUDENT2_EMAIL },
    });
    expect(
      await prisma.registration.count({ where: { participantId: student2.id } })
    ).toBe(0);
    expect(await activeCountFor(event2Id)).toBe(1);
  });

  it("reports the event as full through the discovery endpoint as well", async () => {
    await request(app)
      .post(`/api/events/${event2Id}/registrations`)
      .set("Cookie", student1Cookie)
      .send({});

    const res = await request(app)
      .get(`/api/events/${event2Id}`)
      .set("Cookie", student2Cookie);

    expect(res.body.data.event.activeRegistrationsCount).toBe(1);
    expect(res.body.data.event.remainingSeats).toBe(0);
  });
});

describe("TEST-25 [API-13]: Concurrent requests for the last seat (NFR-03)", () => {
  it("lets exactly one of two parallel requests win (AC-12)", async () => {
    const [first, second] = await Promise.all([
      request(app)
        .post(`/api/events/${event2Id}/registrations`)
        .set("Cookie", student1Cookie)
        .send({}),
      request(app)
        .post(`/api/events/${event2Id}/registrations`)
        .set("Cookie", student2Cookie)
        .send({}),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);

    const rejected = [first, second].find((res) => res.status === 409);
    expect(rejected?.body.error.code).toBe("EVENT_FULL");

    // The invariant that matters: never more active rows than capacity.
    expect(await activeCountFor(event2Id)).toBe(1);
  });

  it("holds the invariant with three simultaneous requests", async () => {
    const responses = await Promise.all(
      [student1Cookie, student2Cookie, student3Cookie].map((cookie) =>
        request(app)
          .post(`/api/events/${event2Id}/registrations`)
          .set("Cookie", cookie)
          .send({})
      )
    );

    expect(responses.filter((res) => res.status === 201)).toHaveLength(1);
    expect(responses.filter((res) => res.status === 409)).toHaveLength(2);
    expect(await activeCountFor(event2Id)).toBe(1);
  });

  it("issues distinct registration numbers to parallel registrations on different events", async () => {
    const [first, second] = await Promise.all([
      request(app)
        .post(`/api/events/${event1Id}/registrations`)
        .set("Cookie", student1Cookie)
        .send({}),
      request(app)
        .post(`/api/events/${event2Id}/registrations`)
        .set("Cookie", student2Cookie)
        .send({}),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.data.registration.registrationNumber).not.toBe(
      second.body.data.registration.registrationNumber
    );
  });
});

describe("TEST-26 [API-14]: Role enforcement (BR-04)", () => {
  it("rejects an ORGANIZER registering with 403 FORBIDDEN_ROLE (AC-13)", async () => {
    const res = await request(app)
      .post(`/api/events/${event1Id}/registrations`)
      .set("Cookie", organizerCookie)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    expect(await prisma.registration.count()).toBe(0);
  });

  it("rejects an ORGANIZER reading the participant registration list", async () => {
    const res = await request(app)
      .get("/api/registrations/my")
      .set("Cookie", organizerCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("rejects unauthenticated clients on every registration endpoint", async () => {
    const register = await request(app)
      .post(`/api/events/${event1Id}/registrations`)
      .send({});
    expect(register.status).toBe(401);

    const list = await request(app).get("/api/registrations/my");
    expect(list.status).toBe(401);

    const detail = await request(app).get("/api/registrations/some-id");
    expect(detail.status).toBe(401);
  });
});

describe("TEST-27 [API-15]: Participant reads their own registrations (FR-05)", () => {
  it("returns only the caller's registrations with event details (AC-14)", async () => {
    const mine = await request(app)
      .post(`/api/events/${event1Id}/registrations`)
      .set("Cookie", student1Cookie)
      .send({});
    const theirs = await request(app)
      .post(`/api/events/${event1Id}/registrations`)
      .set("Cookie", student2Cookie)
      .send({});
    expect(theirs.status).toBe(201);

    const res = await request(app)
      .get("/api/registrations/my")
      .set("Cookie", student1Cookie);

    expect(res.status).toBe(200);

    const registrations = res.body.data.registrations as Array<
      Record<string, unknown>
    >;
    expect(registrations).toHaveLength(1);
    expect(registrations[0].id).toBe(mine.body.data.registration.id);
    expect(registrations[0].status).toBe("REGISTERED");

    // The list drives the My Registrations table, so it carries event details.
    const event = registrations[0].event as Record<string, unknown>;
    expect(event.eventCode).toBe(EVENT1_CODE);
    expect(event).toHaveProperty("title");
    expect(event).toHaveProperty("skillHours");
    expect(event).toHaveProperty("startAt");
  });

  it("returns the caller's own registration by id", async () => {
    const created = await request(app)
      .post(`/api/events/${event1Id}/registrations`)
      .set("Cookie", student1Cookie)
      .send({});

    const res = await request(app)
      .get(`/api/registrations/${created.body.data.registration.id}`)
      .set("Cookie", student1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.registration.registrationNumber).toBe(
      created.body.data.registration.registrationNumber
    );
  });

  it("returns an empty list rather than an error when nothing is registered", async () => {
    const res = await request(app)
      .get("/api/registrations/my")
      .set("Cookie", student3Cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.registrations).toEqual([]);
  });

  it("never exposes passwordHash through the participant relation (NFR-01)", async () => {
    await request(app)
      .post(`/api/events/${event1Id}/registrations`)
      .set("Cookie", student1Cookie)
      .send({});

    const res = await request(app)
      .get("/api/registrations/my")
      .set("Cookie", student1Cookie);

    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });
});

describe("TEST-28 [API-16]: Cross-participant privacy (BR-05)", () => {
  it("refuses another participant's registration with 403 and no data (AC-15)", async () => {
    const theirs = await request(app)
      .post(`/api/events/${event1Id}/registrations`)
      .set("Cookie", student1Cookie)
      .send({});
    const registrationId = theirs.body.data.registration.id;
    const registrationNumber = theirs.body.data.registration.registrationNumber;

    const res = await request(app)
      .get(`/api/registrations/${registrationId}`)
      .set("Cookie", student2Cookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_OWNERSHIP");

    // Not one private field may leak through the refusal.
    const body = JSON.stringify(res.body);
    expect(body).not.toContain(registrationNumber);
    expect(body).not.toContain(registrationId);
    expect(res.body.data).toBeUndefined();
  });

  it("keeps another participant's rows out of the caller's list", async () => {
    await request(app)
      .post(`/api/events/${event1Id}/registrations`)
      .set("Cookie", student1Cookie)
      .send({});

    const res = await request(app)
      .get("/api/registrations/my")
      .set("Cookie", student2Cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.registrations).toEqual([]);
  });

  it("returns 404, not 403, for a registration id that does not exist", async () => {
    const res = await request(app)
      .get("/api/registrations/00000000-0000-0000-0000-000000000000")
      .set("Cookie", student1Cookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
