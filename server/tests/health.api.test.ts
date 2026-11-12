import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { getPrisma } from "../src/prisma.js";

describe("TEST-02 [API-01]: Health & Readiness Probes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("GET /api/health should return 200 OK liveness response within 500ms (NFR-04)", async () => {
    const startTime = Date.now();
    const res = await request(app).get("/api/health");
    const durationMs = Date.now() - startTime;

    expect(res.status).toBe(200);
    expect(durationMs).toBeLessThan(500);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET /api/ready should return 200 OK with connected database within 500ms (NFR-04)", async () => {
    const prisma = getPrisma();
    vi.spyOn(prisma, "$queryRaw").mockResolvedValueOnce([1] as never);

    const startTime = Date.now();
    const res = await request(app).get("/api/ready");
    const durationMs = Date.now() - startTime;

    expect(res.status).toBe(200);
    expect(durationMs).toBeLessThan(500);
    expect(res.body).toEqual({ status: "ready", db: "connected" });
  });

  it("GET /api/ready should return 503 Service Unavailable when database is unreachable", async () => {
    const prisma = getPrisma();
    vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(
      new Error("Database connection refused")
    );

    const res = await request(app).get("/api/ready");

    expect(res.status).toBe(503);
    expect(res.body.status).toBe("not_ready");
    expect(res.body.db).toBe("disconnected");
    expect(res.body.error).toContain("Database connection refused");
  });
});

