import { chromium, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || "LocalDemoPass123!";
const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:5173";
const OUTPUT_DIR = path.resolve("./screenshots");

const VIEWPORTS = [
  { name: "desktop", device: "Desktop (1280x800)", width: 1280, height: 800 },
  { name: "tablet", device: "iPad (820x1180)", width: 820, height: 1180 },
  { name: "mobile", device: "iPhone (375x812)", width: 375, height: 812 },
];

async function signIn(page: Page, email: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel(/Email Address/).fill(email);
  await page.getByLabel(/Password/).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.getByRole("button", { name: "Log Out" }).waitFor({ state: "visible", timeout: 15000 });
}

async function capture() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    console.log(`Capturing for ${vp.device}...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();

    // 1. Login Page
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole("heading", { name: "Sign In" }).waitFor({ state: "visible" });
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `${vp.name}-01-login.png`),
      fullPage: true,
    });

    // 2. Sign In as participant (student1)
    await signIn(page, "student1@university.edu");

    // Events Catalog
    await page.goto(`${BASE_URL}/events`);
    await page.getByText("EVT-2026-0001").waitFor({ state: "visible", timeout: 15000 });
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `${vp.name}-02-catalog.png`),
      fullPage: true,
    });

    // Event Detail Page
    await page.getByRole("link", { name: /Full-Stack TypeScript/i }).first().click();
    await page.waitForURL(/\/events\/[0-9a-f-]{36}$/);
    await page.getByRole("heading", { level: 1 }).waitFor({ state: "visible" });
    const eventUrl = page.url();
    const eventId = eventUrl.split("/").pop();

    await page.screenshot({
      path: path.join(OUTPUT_DIR, `${vp.name}-03-event-detail.png`),
      fullPage: true,
    });

    // My Registrations Page
    await page.goto(`${BASE_URL}/my-registrations`);
    await page.getByRole("heading", { name: "My Registrations" }).waitFor({ state: "visible" });
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `${vp.name}-04-my-registrations.png`),
      fullPage: true,
    });

    // Logout
    await page.getByRole("button", { name: "Log Out" }).click();
    await page.getByRole("heading", { name: "Sign In" }).waitFor({ state: "visible" });

    // 3. Sign In as organizer (organizer1)
    await signIn(page, "organizer1@university.edu");

    // Create Event Page
    await page.goto(`${BASE_URL}/events/new`);
    await page.getByRole("heading", { name: "Create Event" }).waitFor({ state: "visible" });
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `${vp.name}-05-create-event.png`),
      fullPage: true,
    });

    // Organizer Roster Page for Event 1
    if (eventId) {
      await page.goto(`${BASE_URL}/organizer/events/${eventId}/registrations`);
      await page.getByText(/Registered Participants/i).waitFor({ state: "visible" });
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `${vp.name}-06-organizer-roster.png`),
        fullPage: true,
      });
    }

    await context.close();
  }

  await browser.close();
  console.log(`All screenshots successfully captured in ${OUTPUT_DIR}`);
}

capture().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});
