import { test, expect } from "@playwright/test";

/**
 * TEST-09 [E2E-01] — AC-01, AC-04.
 * Login -> role navbar -> logout -> protected route redirect.
 *
 * Credentials come from the environment (SDS 2.4 Credential Safety Rule);
 * they are never hardcoded here.
 */
const PARTICIPANT_EMAIL = "student1@university.edu";
const ORGANIZER_EMAIL = "organizer1@university.edu";
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "";

test.beforeAll(() => {
  if (!DEMO_PASSWORD || DEMO_PASSWORD === "change-me") {
    throw new Error(
      "Set DEMO_USER_PASSWORD to the seeded demo password before running the E2E suite."
    );
  }
});

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel(/Email Address/).fill(email);
  await page.getByLabel(/Password/).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
}

test("participant logs in, sees the role navbar, logs out and loses access", async ({
  page,
}) => {
  await signIn(page, PARTICIPANT_EMAIL);

  // AC-01: lands on the authenticated shell with identity and role badge.
  await expect(page).toHaveURL(/\/$/);
  const navbar = page.getByRole("banner");
  await expect(navbar.getByText("Kittipong Jaidee")).toBeVisible();
  await expect(navbar.getByText("PARTICIPANT")).toBeVisible();
  await expect(navbar.getByRole("link", { name: "Browse Events" })).toBeVisible();
  await expect(
    navbar.getByRole("link", { name: "My Registrations" })
  ).toBeVisible();
  await expect(
    navbar.getByRole("link", { name: "Create Event" })
  ).toHaveCount(0);

  // AC-04: logging out returns to /login and revokes access to the shell.
  await page.getByRole("button", { name: "Log Out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
});

test("organizer sees organizer-specific navigation", async ({ page }) => {
  await signIn(page, ORGANIZER_EMAIL);

  const navbar = page.getByRole("banner");
  await expect(navbar.getByText("Dr. Somchai Wattana")).toBeVisible();
  await expect(navbar.getByText("ORGANIZER")).toBeVisible();
  await expect(navbar.getByRole("link", { name: "Create Event" })).toBeVisible();
  await expect(
    navbar.getByRole("link", { name: "My Registrations" })
  ).toHaveCount(0);
});

test("invalid credentials show an alert and keep the typed email (AC-02)", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel(/Email Address/).fill(ORGANIZER_EMAIL);
  await page.getByLabel(/Password/).fill("definitely-wrong");
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByRole("alert")).toContainText(
    "Email or password is incorrect."
  );
  await expect(page.getByLabel(/Email Address/)).toHaveValue(ORGANIZER_EMAIL);
  await expect(page).toHaveURL(/\/login$/);
});

test("inactive account is rejected with its own message (BR-04)", async ({
  page,
}) => {
  await signIn(page, "inactive@university.edu");

  await expect(page.getByRole("alert")).toContainText(
    "Your account cannot sign in. Contact support."
  );
  // The message must not disclose why the account is blocked.
  await expect(page.getByRole("alert")).not.toContainText(/inactive|deactivated/i);
  await expect(page).toHaveURL(/\/login$/);
});
