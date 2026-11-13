import express, { type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import fs from "node:fs";
import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { eventRouter } from "./routes/event.routes.js";
import { registrationRouter } from "./routes/registration.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { ApiError, toErrorBody } from "./lib/errors.js";

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

app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/events", eventRouter);
app.use("/api/registrations", registrationRouter);

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

// Unknown API routes must not fall through to the SPA handler.
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json(
    toErrorBody(new ApiError(404, "NOT_FOUND", "Endpoint not found."))
  );
});

app.use(errorHandler);
