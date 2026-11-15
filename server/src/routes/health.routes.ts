import { Router, type Request, type Response } from "express";
import { getPrisma } from "../prisma.js";

export const healthRouter = Router();

// Liveness probe (Lab 5 & NFR-04)
healthRouter.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Readiness probe verifying PostgreSQL connectivity
healthRouter.get("/ready", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ready", db: "connected" });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";
    res.status(503).json({
      status: "not_ready",
      db: "disconnected",
      error: message,
    });
  }
});
