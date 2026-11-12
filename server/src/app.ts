import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import fs from "node:fs";
import { getPrisma } from "./prisma.js";

export const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Liveness probe (Lab 5 & NFR-04)
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Readiness probe verifying PostgreSQL connectivity
app.get("/api/ready", async (_req: Request, res: Response) => {
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

// Serve built React SPA in single-container production mode (Cloud Run / Docker)
const clientDistDir = path.resolve(process.cwd(), "..", "client", "dist");
if (process.env.NODE_ENV === "production" && fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  app.get("*", (req: Request, res: Response, next) => {
    if (req.path.startsWith("/api/")) {
      next();
      return;
    }
    res.sendFile(path.join(clientDistDir, "index.html"));
  });
}

