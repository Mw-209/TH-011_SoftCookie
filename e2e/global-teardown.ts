import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Prefix every event this suite publishes must use, so cleanup stays targeted. */
export const E2E_TITLE_PREFIX = "ZZ E2E Event";

/**
 * Removes the events the suite published, leaving the seeded
 * EVT-2026-0001..0003 untouched.
 *
 * Without this, each run adds rows with the same titles and later runs hit
 * ambiguous locators. Sprint 1 has no delete endpoint (that arrives with F-05),
 * so cleanup goes through the server workspace's Prisma CLI, which reads
 * DATABASE_URL from server/.env exactly as the app does.
 */
export default function globalTeardown(): void {
  try {
    const serverDir = fileURLToPath(new URL("../server", import.meta.url));

    // Run the Prisma CLI's entry point directly with this Node binary. Going
    // through npx needs a shell on Windows (the .cmd shim), which Node either
    // rejects or deprecates depending on how arguments are passed.
    execFileSync(
      process.execPath,
      [
        fileURLToPath(
          new URL("../server/node_modules/prisma/build/index.js", import.meta.url)
        ),
        "db",
        "execute",
        "--stdin",
        "--schema",
        "prisma/schema.prisma",
      ],
      {
        cwd: serverDir,
        input: `DELETE FROM events WHERE title LIKE '${E2E_TITLE_PREFIX}%';`,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );
    console.log(`[e2e teardown] removed events titled "${E2E_TITLE_PREFIX}%"`);
  } catch (error) {
    // A failed cleanup must not mask the test results; surface it and move on.
    console.warn(
      "[e2e teardown] could not clean up published events:",
      error instanceof Error ? error.message : error
    );
  }
}
