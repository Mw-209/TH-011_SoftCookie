import { describe, it, expect, beforeAll, afterEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { SESSION_COOKIE_NAME } from "../../src/lib/session.js";

const prisma = getPrisma();

const ORGANIZER1_EMAIL = "organizer1@university.edu";
const ORGANIZER2_EMAIL = "organizer2@university.edu";
const PARTICIPANT_EMAIL = "student1@university.edu";

const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "";

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
let participantCookie: string;

let event1Id: string;
let event3Id: string;
let student1Id: string;

beforeAll(async () => {
  if (!DEMO_PASSWORD || DEMO_PASSWORD === "change-me") {
    throw new Error(
      "DEMO_USER_PASSWORD must be set to the seeded demo password before running API tests."
    );
  }

  await prisma.$connect();

  organizer1Cookie = await cookieFor(ORGANIZER1_EMAIL);
  organizer2Cookie = await cookieFor(ORGANIZER2_EMAIL);
  participantCookie = await cookieFor(PARTICIPANT_EMAIL);

  const event1 = await prisma.event.findUniqueOrThrow({
    where: { eventCode: "EVT-2026-0001" },
    select: { id: true },
  });
  event1Id = event1.id;

  const event3 = await prisma.event.findUniqueOrThrow({
    where: { eventCode: "EVT-2026-0003" },
    select: { id: true },
  });
  event3Id = event3.id;

  const student1 = await prisma.user.findUniqueOrThrow({
    where: { email: PARTICIPANT_EMAIL },
    select: { id: true },
  });
  student1Id = student1.id;
});

afterEach(async () => {
  // Test isolation: clear test-created registrations after each run
  await prisma.registration.deleteMany({
    where: { eventId: { in: [event1Id, event3Id] } },
  });
});

describe("TEST-33 [API-18]: Cross-organizer ownership boundary (TDD Target #4b, BR-05)", () => {
  it("rejects non-owner organizer with 403 FORBIDDEN_OWNERSHIP and leaks no roster data (AC-17)", async () => {
    // Event 1 is owned by organizer1. Organizer 2 requests the roster.
    const res = await request(app)
      .get(`/api/events/${event1Id}/registrations`)
      .set("Cookie", organizer2Cookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_OWNERSHIP");
    expect(res.body.data).toBeUndefined();
  });
});

describe("TEST-34 [API-19]: Role guard on organizer roster (BR-04, NFR-02)", () => {
  it("rejects an authenticated PARTICIPANT with 403 FORBIDDEN_ROLE (AC-18)", async () => {
    const res = await request(app)
      .get(`/api/events/${event1Id}/registrations`)
      .set("Cookie", participantCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    expect(res.body.data).toBeUndefined();
  });

  it("rejects an unauthenticated caller with 401 UNAUTHENTICATED", async () => {
    const res = await request(app).get(`/api/events/${event1Id}/registrations`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 404 NOT_FOUND when event does not exist", async () => {
    const nonExistentId = "00000000-0000-0000-0000-000000000000";
    const res = await request(app)
      .get(`/api/events/${nonExistentId}/registrations`)
      .set("Cookie", organizer1Cookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("TEST-32 [API-17]: Owning organizer inspects registration roster (FR-06, AC-16)", () => {
  it("returns empty roster when zero participants have registered", async () => {
    const res = await request(app)
      .get(`/api/events/${event1Id}/registrations`)
      .set("Cookie", organizer1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.event.id).toBe(event1Id);
    expect(res.body.data.event.eventCode).toBe("EVT-2026-0001");
    expect(res.body.data.event.capacity).toBe(20);
    expect(res.body.data.event.activeRegistrationsCount).toBe(0);
    expect(res.body.data.event.remainingSeats).toBe(20);
    expect(res.body.data.registrations).toEqual([]);
  });

  it("returns full participant details on populated roster", async () => {
    // Participant registers for Event 1
    const regRes = await request(app)
      .post(`/api/events/${event1Id}/registrations`)
      .set("Cookie", participantCookie)
      .send({});
    expect(regRes.status).toBe(201);
    const assignedRegNumber = regRes.body.data.registration.registrationNumber;

    // Owning organizer views roster
    const res = await request(app)
      .get(`/api/events/${event1Id}/registrations`)
      .set("Cookie", organizer1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.event.activeRegistrationsCount).toBe(1);
    expect(res.body.data.event.remainingSeats).toBe(19);

    expect(res.body.data.registrations).toHaveLength(1);
    const participantEntry = res.body.data.registrations[0];
    expect(participantEntry.registrationNumber).toBe(assignedRegNumber);
    expect(participantEntry.status).toBe("REGISTERED");
    expect(participantEntry.participant.name).toBe("Kittipong Jaidee");
    expect(participantEntry.participant.email).toBe(PARTICIPANT_EMAIL);
    expect(participantEntry.registeredAt).toBeDefined();
  });
});

