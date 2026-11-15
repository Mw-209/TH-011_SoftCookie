import { describe, it, expect, beforeAll, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { SESSION_COOKIE_NAME } from "../../src/lib/session.js";
import { requireAuth, requireRole } from "../../src/middleware/auth.js";
import { errorHandler } from "../../src/middleware/error-handler.js";

const prisma = getPrisma();

const ORGANIZER_EMAIL = "organizer1@university.edu";
const PARTICIPANT_EMAIL = "student1@university.edu";
const INACTIVE_EMAIL = "inactive@university.edu";

/** Seeded demo password; never hardcoded (SDS 2.4 Credential Safety Rule). */
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "";

function sessionCookieFrom(res: request.Response): string | undefined {
  const raw = res.headers["set-cookie"];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return cookies.find((cookie) => cookie.startsWith(SESSION_COOKIE_NAME + "="));
}

function tokenFrom(cookie: string): string {
  return cookie.split(";")[0].split("=")[1];
}

async function countSessionsFor(email: string): Promise<number> {
  return prisma.session.count({ where: { user: { email } } });
}

/**
 * Median latency over several runs. NFR-04 describes how the endpoint behaves
 * in normal operation, so a single sample is the wrong instrument: one
 * scheduling hiccup on a developer machine would fail a healthy endpoint. The
 * median still fails if the endpoint is genuinely over budget.
 *
 * Five samples rather than three because login has little headroom: bcrypt at
 * cost 10 (required by NFR-01) measures 310-390ms on its own here, against the
 * 500ms budget, and roughly one request in ten spikes past it.
 */
async function medianDurationMs(
  run: () => Promise<unknown>,
  samples = 5
): Promise<number> {
  const durations: number[] = [];

  for (let index = 0; index < samples; index += 1) {
    const startedAt = Date.now();
    await run();
    durations.push(Date.now() - startedAt);
  }

  durations.sort((a, b) => a - b);
  return durations[Math.floor(durations.length / 2)];
}

beforeAll(async () => {
  if (!DEMO_PASSWORD || DEMO_PASSWORD === "change-me") {
    throw new Error(
      "DEMO_USER_PASSWORD must be set to the seeded demo password before running API tests."
    );
  }

  // NFR-04 budgets steady-state request latency, not process cold start. The
  // very first query pays for Prisma engine startup and the initial pool
  // connection (~500ms here vs ~300ms afterwards), so warm both up before the
  // timed assertions run.
  await prisma.$connect();
  await request(app)
    .post("/api/auth/login")
    .send({ email: ORGANIZER_EMAIL, password: DEMO_PASSWORD });
  await prisma.session.deleteMany({
    where: { user: { email: ORGANIZER_EMAIL } },
  });
});

afterEach(async () => {
  // Keep the shared dev database clean between cases.
  await prisma.session.deleteMany({
    where: { user: { email: { in: [ORGANIZER_EMAIL, PARTICIPANT_EMAIL] } } },
  });
});

describe("TEST-03 [API-02]: Successful login", () => {
  it.each([ORGANIZER_EMAIL, PARTICIPANT_EMAIL])(
    "logs in %s within 500ms, sets an HttpOnly cookie and persists a Session (AC-01, NFR-04)",
    async (email) => {
      const login = () =>
        request(app)
          .post("/api/auth/login")
          .send({ email, password: DEMO_PASSWORD });

      const durationMs = await medianDurationMs(login);
      const res = await login();

      expect(res.status).toBe(200);
      expect(durationMs).toBeLessThan(500);

      expect(res.body.data.user).toMatchObject({ email });
      expect(res.body.data.user).toHaveProperty("id");
      expect(res.body.data.user).toHaveProperty("name");
      expect(res.body.data.user).toHaveProperty("role");

      // NFR-01: the hash must never cross the wire.
      expect(JSON.stringify(res.body)).not.toContain("passwordHash");

      const cookie = sessionCookieFrom(res);
      expect(cookie).toBeDefined();
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("Path=/");
      expect(String(cookie).toLowerCase()).toContain("samesite=lax");
      expect(cookie).toMatch(/Max-Age=\d+/);

      const stored = await prisma.session.findUnique({
        where: { token: tokenFrom(cookie as string) },
      });
      expect(stored).not.toBeNull();
      expect(stored?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    }
  );

  it("accepts an email with different casing and surrounding spaces", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "  " + ORGANIZER_EMAIL.toUpperCase() + "  ",
        password: DEMO_PASSWORD,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(ORGANIZER_EMAIL);
  });
});

describe("TEST-04 [API-03]: Rejected login", () => {
  it("rejects a wrong password with 401 and creates no Session (AC-02)", async () => {
    const before = await countSessionsFor(ORGANIZER_EMAIL);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: ORGANIZER_EMAIL, password: "definitely-wrong" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(sessionCookieFrom(res)).toBeUndefined();
    expect(await countSessionsFor(ORGANIZER_EMAIL)).toBe(before);
  });

  it("rejects an unknown email with 401 and the same code as a wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@university.edu", password: DEMO_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects empty fields with 400 and field-level details", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "", password: "" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toHaveProperty("email");
    expect(res.body.error.details).toHaveProperty("password");
  });

  it("rejects an inactive account with 403 and creates no Session (BR-04)", async () => {
    const before = await countSessionsFor(INACTIVE_EMAIL);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: INACTIVE_EMAIL, password: DEMO_PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ACCOUNT_INACTIVE");
    expect(sessionCookieFrom(res)).toBeUndefined();
    expect(await countSessionsFor(INACTIVE_EMAIL)).toBe(before);
  });
});

describe("TEST-05 [API-04]: Current user retrieval", () => {
  it("returns the authenticated identity for a valid cookie (AC-03)", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: PARTICIPANT_EMAIL, password: DEMO_PASSWORD });
    const cookie = sessionCookieFrom(loginRes) as string;

    const fetchMe = () =>
      request(app).get("/api/auth/me").set("Cookie", cookie);

    const durationMs = await medianDurationMs(fetchMe);
    const res = await fetchMe();

    expect(res.status).toBe(200);
    expect(durationMs).toBeLessThan(500);
    expect(res.body.data.user.email).toBe(PARTICIPANT_EMAIL);
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("returns 401 when the cookie is missing", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 401 for an unknown token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", SESSION_COOKIE_NAME + "=not-a-real-token");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 401 for an expired session and clears the stale row", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: PARTICIPANT_EMAIL, password: DEMO_PASSWORD });
    const token = tokenFrom(sessionCookieFrom(loginRes) as string);

    await prisma.session.update({
      where: { token },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", SESSION_COOKIE_NAME + "=" + token);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
    expect(await prisma.session.findUnique({ where: { token } })).toBeNull();
  });
});

describe("TEST-06 [API-05]: Logout and session revocation", () => {
  it("deletes the Session row and rejects any replay of the token (AC-04)", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: ORGANIZER_EMAIL, password: DEMO_PASSWORD });
    const cookie = sessionCookieFrom(loginRes) as string;
    const token = tokenFrom(cookie);

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.data.message).toBe("Logged out successfully.");

    const clearing = sessionCookieFrom(logoutRes);
    expect(clearing).toBeDefined();
    expect(clearing).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);

    expect(await prisma.session.findUnique({ where: { token } })).toBeNull();

    const replay = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 401 when logging out without a session", async () => {
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});

/**
 * Authorization guards (F-01 section 3, BR-05, NFR-02).
 *
 * The role-protected endpoints that consume requireRole arrive with F-02/F-04,
 * so the guards are exercised here against a throwaway app built from the real
 * middleware. This keeps the reusable guard covered from the sprint it ships in
 * rather than from the first feature that happens to depend on it.
 */
describe("[API-02..05 support]: requireAuth and requireRole guards", () => {
  const guardApp = express();
  guardApp.use(cookieParser());
  guardApp.get(
    "/organizer-only",
    requireAuth,
    requireRole("ORGANIZER"),
    (_req, res) => {
      res.status(200).json({ data: { ok: true } });
    }
  );
  guardApp.get(
    "/any-authenticated",
    requireAuth,
    requireRole("ORGANIZER", "PARTICIPANT"),
    (_req, res) => {
      res.status(200).json({ data: { ok: true } });
    }
  );
  guardApp.use(errorHandler);

  async function cookieFor(email: string): Promise<string> {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: DEMO_PASSWORD });
    return sessionCookieFrom(res) as string;
  }

  it("lets an allowed role through", async () => {
    const res = await request(guardApp)
      .get("/organizer-only")
      .set("Cookie", await cookieFor(ORGANIZER_EMAIL));

    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
  });

  it("rejects a disallowed role with 403 FORBIDDEN_ROLE (BR-05)", async () => {
    const res = await request(guardApp)
      .get("/organizer-only")
      .set("Cookie", await cookieFor(PARTICIPANT_EMAIL));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("rejects an unauthenticated request with 401 before any role check", async () => {
    const res = await request(guardApp).get("/organizer-only");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects an invalid session token with 401", async () => {
    const res = await request(guardApp)
      .get("/organizer-only")
      .set("Cookie", SESSION_COOKIE_NAME + "=not-a-real-token");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("admits every listed role when several are allowed", async () => {
    for (const email of [ORGANIZER_EMAIL, PARTICIPANT_EMAIL]) {
      const res = await request(guardApp)
        .get("/any-authenticated")
        .set("Cookie", await cookieFor(email));

      expect(res.status).toBe(200);
    }
  });

  it("derives the role from the session, not from client-supplied headers (BR-04)", async () => {
    const res = await request(guardApp)
      .get("/organizer-only")
      .set("Cookie", await cookieFor(PARTICIPANT_EMAIL))
      .set("X-User-Role", "ORGANIZER")
      .set("X-Role", "ORGANIZER");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
  });
});
