import { test, expect, type Page } from "@playwright/test";

/**
 * TEST-38 [E2E-07] — AC-19, AC-20, NFR-05.
 * Playwright multi-viewport responsive layout check across Desktop (1280x800),
 * Tablet (820x1180), and Mobile (375x812) viewports for Sprint 1 screens.
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

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel(/Email Address/).fill(email);
  await page.getByLabel(/Password/).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();
}

const VIEWPORTS = [
  { name: "Desktop", width: 1280, height: 800 },
  { name: "Tablet", width: 820, height: 1180 },
  { name: "Mobile", width: 375, height: 812 },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`Responsive check on ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
    });

    test(`login screen has no horizontal overflow on ${vp.name}`, async ({
      page,
    }) => {
      await page.goto("/login");
      await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();

      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(hasOverflow).toBe(false);
    });

    test(`events catalog has no horizontal overflow on ${vp.name}`, async ({
      page,
    }) => {
      await signIn(page, PARTICIPANT_EMAIL);
      await page.goto("/events");
      await expect(page.getByText("EVT-2026-0001")).toBeVisible();

      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(hasOverflow).toBe(false);
    });

    test(`my-registrations page has no horizontal overflow on ${vp.name}`, async ({
      page,
    }) => {
      await signIn(page, PARTICIPANT_EMAIL);
      await page.goto("/my-registrations");
      await expect(
        page.getByRole("heading", { name: "My Registrations" })
      ).toBeVisible();

      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(hasOverflow).toBe(false);
    });

    test(`organizer roster page has no horizontal overflow on ${vp.name}`, async ({
      page,
    }) => {
      await signIn(page, ORGANIZER_EMAIL);
      await page.goto("/events");
      await page
        .getByRole("link", { name: "Full-Stack TypeScript & Testing Workshop" })
        .click();
      await expect(page).toHaveURL(/\/events\/[0-9a-f-]{36}$/);

      const rosterLink = page.getByRole("link", {
        name: "View Registrations Roster",
      });
      await expect(rosterLink).toBeVisible();
      await rosterLink.click();

      await expect(
        page.getByText("Full-Stack TypeScript & Testing Workshop")
      ).toBeVisible();

      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(hasOverflow).toBe(false);

      if (vp.name === "Mobile") {
        // Desktop table should be hidden on mobile
        const desktopTable = page.locator("div.hidden.md\\:block table");
        if (await desktopTable.count() > 0) {
          await expect(desktopTable).toBeHidden();
        }
      }
    });
  });
}
