import { describe, it, expect, beforeAll, afterEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { SESSION_COOKIE_NAME } from "../../src/lib/session.js";

const prisma = getPrisma();

const ORGANIZER_EMAIL = "organizer1@university.edu";
const OTHER_ORGANIZER_EMAIL = "organizer2@university.edu";
const PARTICIPANT_EMAIL = "student1@university.edu";

const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "";

/** Titles created by this suite, so cleanup never touches the seeded events. */
const TEST_TITLE_PREFIX = "ZZ Test Event";

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

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: `${TEST_TITLE_PREFIX} — Cloud Native Docker Workshop`,
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

async function countTestEvents(): Promise<number> {
  return prisma.event.count({
    where: { title: { startsWith: TEST_TITLE_PREFIX } },
  });
}

let organizerCookie: string;
let participantCookie: string;

beforeAll(async () => {
  if (!DEMO_PASSWORD || DEMO_PASSWORD === "change-me") {
    throw new Error(
      "DEMO_USER_PASSWORD must be set to the seeded demo password before running API tests."
    );
  }

  // NFR-04 budgets steady-state latency, not Prisma's cold start.
  await prisma.$connect();
  organizerCookie = await cookieFor(ORGANIZER_EMAIL);
  participantCookie = await cookieFor(PARTICIPANT_EMAIL);
  await request(app).get("/api/events").set("Cookie", organizerCookie);
});

afterEach(async () => {
  // Remove only what this suite created; EVT-2026-0001..0003 stay intact.
  await prisma.event.deleteMany({
    where: { title: { startsWith: TEST_TITLE_PREFIX } },
  });
});

describe("TEST-12 [API-06]: Organizer creates an event", () => {
  it("returns 201 with a generated code and persists the row (AC-06)", async () => {
    const before = await countTestEvents();

    const res = await request(app)
      .post("/api/events")
      .set("Cookie", organizerCookie)
      .send(validPayload());

    expect(res.status).toBe(201);

    const event = res.body.data.event;
    expect(event.eventCode).toMatch(/^EVT-\d{4}-\d{4}$/);
    expect(event.capacity).toBe(25);
    expect(event.activeRegistrationsCount).toBe(0);
    expect(event.remainingSeats).toBe(25);
    expect(event.organizerName).toBe("Dr. Somchai Wattana");

    const stored = await prisma.event.findUnique({ where: { id: event.id } });
    expect(stored).not.toBeNull();
    expect(stored?.eventCode).toBe(event.eventCode);
    expect(await countTestEvents()).toBe(before + 1);
  });

  it("binds organizerId to the session user, ignoring any supplied value (BR-04)", async () => {
    const participant = await prisma.user.findUniqueOrThrow({
      where: { email: PARTICIPANT_EMAIL },
    });
    const organizer = await prisma.user.findUniqueOrThrow({
      where: { email: ORGANIZER_EMAIL },
    });

    const res = await request(app)
      .post("/api/events")
      .set("Cookie", organizerCookie)
      .send(
        validPayload({
          organizerId: participant.id,
          eventCode: "EVT-2026-9999",
          id: "forged-id",
        })
      );

    expect(res.status).toBe(201);
    expect(res.body.data.event.organizerId).toBe(organizer.id);
    expect(res.body.data.event.eventCode).not.toBe("EVT-2026-9999");
    expect(res.body.data.event.id).not.toBe("forged-id");
  });

  it("issues a distinct code to each of two consecutive events", async () => {
    const first = await request(app)
      .post("/api/events")
      .set("Cookie", organizerCookie)
      .send(validPayload({ title: `${TEST_TITLE_PREFIX} — First` }));
    const second = await request(app)
      .post("/api/events")
      .set("Cookie", organizerCookie)
      .send(validPayload({ title: `${TEST_TITLE_PREFIX} — Second` }));

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.data.event.eventCode).not.toBe(
      second.body.data.event.eventCode
    );
  });

  it("issues distinct codes when two organizers publish concurrently", async () => {
    const otherCookie = await cookieFor(OTHER_ORGANIZER_EMAIL);

    const responses = await Promise.all([
      request(app)
        .post("/api/events")
        .set("Cookie", organizerCookie)
        .send(validPayload({ title: `${TEST_TITLE_PREFIX} — Race A` })),
      request(app)
        .post("/api/events")
        .set("Cookie", otherCookie)
        .send(validPayload({ title: `${TEST_TITLE_PREFIX} — Race B` })),
    ]);

    for (const res of responses) {
      expect(res.status).toBe(201);
    }

    const codes = responses.map((res) => res.body.data.event.eventCode);
    expect(new Set(codes).size).toBe(2);
  });
});

describe("TEST-13 [API-07]: Invalid event payloads are rejected", () => {
  it.each([
    ["capacity: 0", { capacity: 0 }, "capacity"],
    ["capacity: -5", { capacity: -5 }, "capacity"],
    ["capacity: 1.5", { capacity: 1.5 }, "capacity"],
    ["skillHours: 0", { skillHours: 0 }, "skillHours"],
    [
      "registrationDeadline after startAt",
      { registrationDeadline: "2026-12-02T00:00:00.000Z" },
      "registrationDeadline",
    ],
    ["endAt before startAt", { endAt: "2026-12-01T08:00:00.000Z" }, "endAt"],
    ["title too short", { title: "AI" }, "title"],
  ])(
    "rejects %s with 400 and stores nothing (AC-07)",
    async (_label, overrides, expectedField) => {
      const before = await countTestEvents();

      const res = await request(app)
        .post("/api/events")
        .set("Cookie", organizerCookie)
        .send(validPayload(overrides));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details).toHaveProperty(expectedField);
      expect(await countTestEvents()).toBe(before);
    }
  );

  it("rejects an empty body listing every required field", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("Cookie", organizerCookie)
      .send({});

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.details)).toHaveLength(9);
  });
});

describe("TEST-14 [API-08]: Role enforcement on event creation", () => {
  it("rejects a PARTICIPANT with 403 FORBIDDEN_ROLE (AC-08, BR-04)", async () => {
    const before = await countTestEvents();

    const res = await request(app)
      .post("/api/events")
      .set("Cookie", participantCookie)
      .send(validPayload());

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    expect(await countTestEvents()).toBe(before);
  });

  it("rejects an unauthenticated client with 401", async () => {
    const res = await request(app).post("/api/events").send(validPayload());

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("TEST-15 [API-09]: Event discovery", () => {
  it("returns the seeded catalog ordered by startAt within 500ms (AC-09, NFR-04)", async () => {
    const listEventsRequest = () =>
      request(app).get("/api/events").set("Cookie", participantCookie);

    // Median over a few runs, for the reason documented in auth.api.test.ts.
    const durations: number[] = [];
    for (let index = 0; index < 3; index += 1) {
      const startedAt = Date.now();
      await listEventsRequest();
      durations.push(Date.now() - startedAt);
    }
    durations.sort((a, b) => a - b);
    const durationMs = durations[1];

    const res = await listEventsRequest();

    expect(res.status).toBe(200);
    expect(durationMs).toBeLessThan(500);

    const events = res.body.data.events as Array<Record<string, unknown>>;
    expect(events.length).toBeGreaterThanOrEqual(3);

    const codes = events.map((event) => event.eventCode);
    expect(codes).toContain("EVT-2026-0001");
    expect(codes).toContain("EVT-2026-0002");
    expect(codes).toContain("EVT-2026-0003");

    const startTimes = events.map((event) =>
      new Date(event.startAt as string).getTime()
    );
    expect(startTimes).toEqual([...startTimes].sort((a, b) => a - b));
  });

  it("reports authoritative seat figures for the one-seat boundary event", async () => {
    const res = await request(app)
      .get("/api/events")
      .set("Cookie", participantCookie);

    const boundary = (res.body.data.events as Array<Record<string, unknown>>).find(
      (event) => event.eventCode === "EVT-2026-0002"
    );

    expect(boundary).toBeDefined();
    expect(boundary?.capacity).toBe(1);
    expect(boundary?.activeRegistrationsCount).toBe(0);
    expect(boundary?.remainingSeats).toBe(1);
  });

  it("returns a single event by id with its organizer name", async () => {
    const seeded = await prisma.event.findUniqueOrThrow({
      where: { eventCode: "EVT-2026-0003" },
    });

    const res = await request(app)
      .get(`/api/events/${seeded.id}`)
      .set("Cookie", participantCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.event.eventCode).toBe("EVT-2026-0003");
    expect(res.body.data.event.organizerName).toBe("Prof. Nida Srisuk");
    expect(res.body.data.event.remainingSeats).toBe(15);
  });

  it("returns 404 NOT_FOUND for an unknown id", async () => {
    const res = await request(app)
      .get("/api/events/00000000-0000-0000-0000-000000000000")
      .set("Cookie", participantCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("requires a session for both discovery endpoints", async () => {
    const list = await request(app).get("/api/events");
    expect(list.status).toBe(401);

    const detail = await request(app).get("/api/events/some-id");
    expect(detail.status).toBe(401);
  });

  it("never exposes passwordHash through the organizer relation (NFR-01)", async () => {
    const res = await request(app)
      .get("/api/events")
      .set("Cookie", participantCookie);

    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });
});
