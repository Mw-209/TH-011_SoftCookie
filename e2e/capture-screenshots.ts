import { chromium, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const ARTIFACTS_DIR = path.join(PROJECT_ROOT, "artifacts", "sprint-1");
const DOCS_DIR = path.join(PROJECT_ROOT, "docs", "screenshots");

const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || "LocalDemoPass123!";
const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:5173";

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

async function saveScreenshot(page: Page, filename: string) {
  const artifactPath = path.join(ARTIFACTS_DIR, filename);
  const docsPath = path.join(DOCS_DIR, filename);
  await page.screenshot({ path: artifactPath, fullPage: true });
  fs.copyFileSync(artifactPath, docsPath);
  console.log(`Saved ${filename}`);
}

async function capture() {
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Capturing for ${vp.device} ===`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();

    // 1. Login Page
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole("heading", { name: "Sign In" }).waitFor({ state: "visible" });
    await saveScreenshot(page, `${vp.name}-01-login.png`);

    // 2. Sign In as participant (student1)
    await signIn(page, "student1@university.edu");

    // Events Catalog
    await page.goto(`${BASE_URL}/events`);
    await page.getByText("EVT-2026-0001").waitFor({ state: "visible", timeout: 15000 });
    await saveScreenshot(page, `${vp.name}-02-catalog.png`);

    // Event Detail Page
    await page.getByRole("link", { name: /Full-Stack TypeScript/i }).first().click();
    await page.waitForURL(/\/events\/[0-9a-f-]{36}$/);
    await page.getByRole("heading", { level: 1 }).waitFor({ state: "visible" });
    const eventUrl = page.url();
    const eventId = eventUrl.split("/").pop();

    // Ensure registration check finishes
    await page.waitForTimeout(1000);
    const registerBtn = page.getByRole("button", { name: "Register for Event" });
    const registeredBadge = page.getByText(/REGISTERED|You are registered/i).filter({ visible: true }).first();

    const isBtn = await registerBtn.isVisible().catch(() => false);
    if (isBtn) {
      console.log(`Registering student1 for event on ${vp.name}...`);
      await registerBtn.click();
      await registeredBadge.waitFor({ state: "visible", timeout: 10000 });
    } else {
      await registeredBadge.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    }

    await saveScreenshot(page, `${vp.name}-03-event-detail.png`);

    // My Registrations Page
    await page.goto(`${BASE_URL}/my-registrations`);
    await page.getByRole("heading", { name: "My Registrations" }).waitFor({ state: "visible" });
    // Wait for the visible registered event card or table row
    await page.getByText(/REG-2026-|Full-Stack TypeScript/i).filter({ visible: true }).first().waitFor({ state: "visible", timeout: 15000 });
    await saveScreenshot(page, `${vp.name}-04-my-registrations.png`);

    // Logout
    await page.getByRole("button", { name: "Log Out" }).click();
    await page.getByRole("heading", { name: "Sign In" }).waitFor({ state: "visible" });

    // 3. Sign In as organizer (organizer1)
    await signIn(page, "organizer1@university.edu");

    // Create Event Page
    await page.goto(`${BASE_URL}/events/new`);
    await page.getByRole("heading", { name: "Create Event" }).waitFor({ state: "visible" });
    await saveScreenshot(page, `${vp.name}-05-create-event.png`);

    // Organizer Roster Page for Event 1
    if (eventId) {
      await page.goto(`${BASE_URL}/organizer/events/${eventId}/registrations`);
      await page.getByText(/Registered Participants/i).waitFor({ state: "visible" });
      // Wait for visible student1 to appear in roster
      await page.getByText(/student1@university.edu|Alex Student/i).filter({ visible: true }).first().waitFor({ state: "visible", timeout: 15000 });
      await saveScreenshot(page, `${vp.name}-06-organizer-roster.png`);
    }

    await context.close();
  }

  await browser.close();
  console.log(`\nAll screenshots successfully captured in ${ARTIFACTS_DIR} and ${DOCS_DIR}`);
}

capture().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});
