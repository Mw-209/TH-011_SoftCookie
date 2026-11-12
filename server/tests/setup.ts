import dotenv from "dotenv";
import path from "node:path";

// Mirror src/index.ts: server/.env first, repo root ../.env as fallback.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });
