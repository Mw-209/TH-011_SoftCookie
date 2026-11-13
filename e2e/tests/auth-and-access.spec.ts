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

/** signIn plus a wait for the authenticated shell, for tests that then navigate. */
async function signInAndWait(
  page: import("@playwright/test").Page,
  email: string
) {
  await signIn(page, email);
  // The login page has its own <header>, so `banner` is not proof of a session.
  await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();
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
  await expect(
    navbar.getByRole("link", { name: "Events", exact: true })
  ).toBeVisible();
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

/**
 * TEST-19 [E2E-03] — AC-08, NFR-02.
 * A participant has no route to event creation, by link or by URL.
 */
test("participant cannot reach event creation (AC-08)", async ({ page }) => {
  await signInAndWait(page, PARTICIPANT_EMAIL);

  // The navbar must not offer the organizer action at all.
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Create Event" })
  ).toHaveCount(0);

  // Direct navigation renders the access-denied card instead of the form.
  await page.goto("/events/new");
  await expect(
    page.getByRole("heading", { name: "403 Access Denied" })
  ).toBeVisible();
  await expect(page.getByLabel(/Event Title/)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Publish Event" })
  ).toHaveCount(0);
});

test("participant can still browse the catalog and open an event (AC-09)", async ({
  page,
}) => {
  await signInAndWait(page, PARTICIPANT_EMAIL);

  await page.getByRole("link", { name: "Events", exact: true }).click();
  await expect(page).toHaveURL(/\/events$/);
  await expect(page.getByText("EVT-2026-0001")).toBeVisible();

  await page
    .getByRole("link", { name: "Full-Stack TypeScript & Testing Workshop" })
    .click();
  await expect(page).toHaveURL(/\/events\/[0-9a-f-]{36}$/);
  await expect(page.getByText("EVT-2026-0001")).toBeVisible();
});

/**
 * TEST-37 [E2E-06] — AC-16, AC-17, AC-18.
 * organizer1 views owned Event 1 roster (200), then organizer2 and student1
 * attempt to open /organizer/events/:event1Id/registrations (403 Access Denied).
 */
test("TEST-37 [E2E-06]: organizer roster ownership isolation and access guards (AC-16, AC-17, AC-18)", async ({
  page,
}) => {
  // 1. Organizer 1 signs in and views their own Event 1 roster
  await signInAndWait(page, ORGANIZER_EMAIL);
  await page.getByRole("link", { name: "Events", exact: true }).click();
  await page
    .getByRole("link", { name: "Full-Stack TypeScript & Testing Workshop" })
    .click();
  await expect(page).toHaveURL(/\/events\/[0-9a-f-]{36}$/);

  // Extract the event ID from the URL
  const eventUrl = page.url();
  const eventId = eventUrl.split("/").pop()!;

  // Owning organizer sees and clicks "View Registrations Roster"
  const rosterLink = page.getByRole("link", {
    name: "View Registrations Roster",
  });
  await expect(rosterLink).toBeVisible();
  await rosterLink.click();

  await expect(page).toHaveURL(
    new RegExp(`/organizer/events/${eventId}/registrations$`)
  );
  await expect(
    page.getByText("Full-Stack TypeScript & Testing Workshop")
  ).toBeVisible();
  await expect(page.getByText("EVT-2026-0001")).toBeVisible();

  // Log out organizer 1
  await page.getByRole("button", { name: "Log Out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  // 2. Organizer 2 (non-owner) signs in and tries to access Event 1 roster directly (AC-17)
  await signInAndWait(page, "organizer2@university.edu");
  await page.goto(`/organizer/events/${eventId}/registrations`);
  await expect(
    page.getByRole("heading", { name: "403 Access Denied" })
  ).toBeVisible();
  await expect(
    page.getByText(/you do not have permission to view registrations/i)
  ).toBeVisible();

  // Log out organizer 2
  await page.getByRole("button", { name: "Log Out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  // 3. Participant signs in and tries to access Event 1 roster directly (AC-18)
  await signInAndWait(page, PARTICIPANT_EMAIL);
  await page.goto(`/organizer/events/${eventId}/registrations`);
  await expect(
    page.getByRole("heading", { name: "403 Access Denied" })
  ).toBeVisible();
  await expect(
    page.getByText(/you do not have permission to view registrations/i)
  ).toBeVisible();
});

