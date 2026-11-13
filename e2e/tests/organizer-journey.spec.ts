import { test, expect, type Page } from "@playwright/test";
import { E2E_TITLE_PREFIX } from "../global-teardown";

/**
 * TEST-18 [E2E-02] — AC-06, AC-09.
 * Organizer logs in, publishes an event, and sees the generated code on the
 * detail view and in the catalog.
 */
const ORGANIZER_EMAIL = "organizer1@university.edu";
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "";


/**
 * Titles carry the suite prefix so global teardown can remove them, plus a
 * per-run suffix so a leftover row from an interrupted run cannot make a
 * locator ambiguous.
 */
const TITLE_PREFIX = `${E2E_TITLE_PREFIX} ${Date.now()}`;

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

  // Wait for something only the authenticated shell renders. The login page has
  // its own <header>, so waiting on `banner` would pass before login finished
  // and a following goto() would abort the in-flight request.
  await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();
}

test("organizer publishes an event and sees its generated code", async ({
  page,
}) => {
  await signIn(page, ORGANIZER_EMAIL);

  const title = `${TITLE_PREFIX} — Cloud Native Docker Workshop`;

  await page.getByRole("link", { name: "Create Event" }).click();
  await expect(page).toHaveURL(/\/events\/new$/);

  // The code and organizer are assigned by the server, not typed in.
  await expect(page.getByLabel("Event Code")).toHaveValue(
    "Auto-generated on save (EVT-2026-XXXX)"
  );
  await expect(page.getByLabel("Event Code")).toHaveAttribute("readonly", "");
  await expect(page.getByLabel("Organizer")).toContainText("", {
    useInnerText: false,
  });

  await page.getByLabel(/Event Title/).fill(title);
  await page.getByLabel(/Skill Hours/).fill("3");
  await page.getByLabel(/Capacity/).fill("25");
  await page.getByLabel(/Location/).fill("Engineering Building Room 402");
  await page
    .getByLabel(/Registration Deadline/)
    .fill("2026-11-30T23:59");
  await page.getByLabel(/Start Date\/Time/).fill("2026-12-01T09:00");
  await page.getByLabel(/End Date\/Time/).fill("2026-12-01T12:00");
  await page
    .getByLabel(/Description/)
    .fill("Hands-on containerization workshop for engineering students.");

  await page.getByRole("button", { name: "Publish Event" }).click();

  // AC-06: redirected to the detail view with the official code confirmed.
  await expect(page).toHaveURL(/\/events\/[0-9a-f-]{36}$/);
  // Scoped by text: the detail page also renders a "Loading event..." status.
  const banner = page
    .getByRole("status")
    .filter({ hasText: "Event published successfully" });
  await expect(banner).toContainText(/EVT-\d{4}-\d{4}/);

  const eventCode = (await banner.textContent())?.match(
    /EVT-\d{4}-\d{4}/
  )?.[0] as string;
  expect(eventCode).toBeTruthy();

  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("25 / 25 seats available")).toBeVisible();

  // AC-09: the new event is discoverable in the catalog.
  await page.getByRole("link", { name: "Browse Events" }).click();
  await expect(page).toHaveURL(/\/events$/);
  await expect(page.getByText(eventCode)).toBeVisible();
  await expect(page.getByRole("link", { name: title })).toBeVisible();
});

test("invalid capacity is rejected and keeps the entered values (AC-07)", async ({
  page,
}) => {
  await signIn(page, ORGANIZER_EMAIL);
  await page.goto("/events/new");

  const title = `${TITLE_PREFIX} — Rejected`;
  await page.getByLabel(/Event Title/).fill(title);
  await page.getByLabel(/Skill Hours/).fill("3");
  await page.getByLabel(/Capacity/).fill("0");
  await page.getByLabel(/Location/).fill("Engineering Building Room 402");
  await page.getByLabel(/Registration Deadline/).fill("2026-11-30T23:59");
  await page.getByLabel(/Start Date\/Time/).fill("2026-12-01T09:00");
  await page.getByLabel(/End Date\/Time/).fill("2026-12-01T12:00");
  await page
    .getByLabel(/Description/)
    .fill("Hands-on containerization workshop for engineering students.");

  await page.getByRole("button", { name: "Publish Event" }).click();

  await expect(
    page.getByText("Capacity must be a whole number between 1 and 1000.")
  ).toBeVisible();
  await expect(page).toHaveURL(/\/events\/new$/);
  // Nothing the organizer typed is lost.
  await expect(page.getByLabel(/Event Title/)).toHaveValue(title);
  await expect(page.getByLabel(/Location/)).toHaveValue(
    "Engineering Building Room 402"
  );
});

test("catalog shows the seeded events with their seat badges (AC-09)", async ({
  page,
}) => {
  await signIn(page, ORGANIZER_EMAIL);
  await page.goto("/events");

  await expect(page.getByText("EVT-2026-0001")).toBeVisible();
  await expect(page.getByText("EVT-2026-0002")).toBeVisible();
  await expect(page.getByText("EVT-2026-0003")).toBeVisible();

  // EVT-2026-0002 is the seeded one-seat boundary event.
  await expect(page.getByText("1 / 1 seats available")).toBeVisible();
});
