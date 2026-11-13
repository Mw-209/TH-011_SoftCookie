import { test, expect, type Page } from "@playwright/test";

/**
 * TEST-30 [E2E-04] and TEST-31 [E2E-05] — AC-10, AC-11, AC-12, AC-14.
 *
 * These specs claim seats on the seeded events, so every test removes its own
 * registrations afterwards. Sprint 1 has no cancel endpoint (that is F-06), and
 * the F-02 suite asserts the seeded seat figures, so leftovers would break it.
 */
const STUDENT1_EMAIL = "student1@university.edu";
const STUDENT2_EMAIL = "student2@university.edu";
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "";

/** Seeded 20-seat event. */
const EVENT1_CODE = "EVT-2026-0001";
/** Seeded 1-seat boundary event. */
const EVENT2_CODE = "EVT-2026-0002";

test.beforeAll(() => {
  if (!DEMO_PASSWORD || DEMO_PASSWORD === "change-me") {
    throw new Error(
      "Set DEMO_USER_PASSWORD to the seeded demo password before running the E2E suite."
    );
  }
});

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel(/Email Address/).fill(email);
  await page.getByLabel(/Password/).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  // The login page has its own <header>, so wait for something only the
  // authenticated shell renders.
  await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();
}

/** Opens an event's detail page by its seeded code. */
async function openEvent(page: Page, eventCode: string) {
  await page.goto("/events");
  const card = page
    .getByRole("listitem")
    .filter({ hasText: eventCode });
  await card.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/events\/[0-9a-f-]{36}$/);
}

/**
 * Deletes every registration created during a test.
 *
 * Done through the API as the participant who owns them would be ideal, but
 * cancellation is Sprint 2, so this clears the table directly. Safe because the
 * seed creates no registrations: the clean state is zero rows.
 */
async function clearRegistrations() {
  const { execFileSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");

  execFileSync(
    process.execPath,
    [
      fileURLToPath(
        new URL("../../server/node_modules/prisma/build/index.js", import.meta.url)
      ),
      "db",
      "execute",
      "--stdin",
      "--schema",
      "prisma/schema.prisma",
    ],
    {
      cwd: fileURLToPath(new URL("../../server", import.meta.url)),
      input: "DELETE FROM registrations;",
      stdio: ["pipe", "pipe", "pipe"],
    }
  );
}

test.afterEach(async () => {
  await clearRegistrations();
});

test("participant registers and finds the record in My Registrations", async ({
  page,
}) => {
  await signIn(page, STUDENT1_EMAIL);
  await openEvent(page, EVENT1_CODE);

  // Seeded event 1 has 20 seats and no registrations.
  await expect(page.getByText("20 / 20 seats available")).toBeVisible();

  await page.getByRole("button", { name: "Register for Event" }).click();

  // AC-10: confirmation carries the official number and the seat count drops.
  const confirmation = page
    .getByRole("status")
    .filter({ hasText: "You are registered" });
  await expect(confirmation).toContainText(/REG-\d{4}-\d{4}/);

  const registrationNumber = (await confirmation.textContent())?.match(
    /REG-\d{4}-\d{4}/
  )?.[0] as string;
  expect(registrationNumber).toBeTruthy();

  await expect(page.getByText("19 / 20 seats available")).toBeVisible();

  // AC-14: the record appears in the participant's own list.
  await page.getByRole("link", { name: "View in My Registrations" }).click();
  await expect(page).toHaveURL(/\/my-registrations$/);
  await expect(page.getByText(registrationNumber).first()).toBeVisible();
  await expect(page.getByText(EVENT1_CODE).first()).toBeVisible();
  await expect(page.getByText("REGISTERED").first()).toBeVisible();
});

test("My Registrations starts empty with a Browse Events call to action", async ({
  page,
}) => {
  await signIn(page, STUDENT2_EMAIL);

  await page.getByRole("link", { name: "My Registrations" }).click();
  await expect(page).toHaveURL(/\/my-registrations$/);
  await expect(
    page.getByText("You have not registered for any skill-building events yet.")
  ).toBeVisible();

  await page.getByRole("link", { name: "Browse Events", exact: true }).click();
  await expect(page).toHaveURL(/\/events$/);
});

test("a second registration for the same event is prevented (AC-11)", async ({
  page,
}) => {
  await signIn(page, STUDENT1_EMAIL);
  await openEvent(page, EVENT1_CODE);

  await page.getByRole("button", { name: "Register for Event" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "You are registered" })
  ).toBeVisible();

  // Reloading proves the state came from the server, not local component state.
  await page.reload();
  await expect(page.getByText("REGISTERED").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Register for Event" })
  ).toHaveCount(0);
});

test("a full one-seat event blocks the next participant (AC-12)", async ({
  browser,
}) => {
  // Two separate contexts so each participant has their own session.
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();

  try {
    const first = await firstContext.newPage();
    await signIn(first, STUDENT1_EMAIL);
    await openEvent(first, EVENT2_CODE);

    await expect(first.getByText("1 / 1 seats available")).toBeVisible();
    await first.getByRole("button", { name: "Register for Event" }).click();
    await expect(
      first.getByRole("status").filter({ hasText: "You are registered" })
    ).toBeVisible();
    await expect(first.getByText("Full", { exact: true })).toBeVisible();

    const second = await secondContext.newPage();
    await signIn(second, STUDENT2_EMAIL);
    await openEvent(second, EVENT2_CODE);

    // The seat is gone, so no action is offered at all.
    await expect(second.getByText("Event Full (0 seats left)")).toBeVisible();
    await expect(
      second.getByRole("button", { name: "Register for Event" })
    ).toHaveCount(0);
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});

test("organizers get no registration action (AC-13)", async ({ page }) => {
  await signIn(page, "organizer1@university.edu");
  await openEvent(page, EVENT1_CODE);

  await expect(
    page.getByText("Only participants can register for events.")
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Register for Event" })
  ).toHaveCount(0);
  await expect(
    page.getByRole("banner").getByRole("link", { name: "My Registrations" })
  ).toHaveCount(0);
});
