import dotenv from "dotenv";
import path from "node:path";

// Load server/.env first, fallback to repo root ../.env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

const { app } = await import("./app.js");

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`SoftCookie Events API listening on http://localhost:${PORT}`);
});

