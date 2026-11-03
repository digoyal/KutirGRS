import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/** FormPageShell migration smoke — add routes only, no list IDs required. */
const ADD_ROUTES: { path: string; label: string }[] = [
  { path: "/students/new", label: "Add Student" },
  { path: "/kutirs/new", label: "Add Kutir" },
  { path: "/schools/new", label: "Add School" },
  { path: "/visits/detail/new", label: "Log New Visit" },
  { path: "/users/new", label: "Add User" },
  { path: "/admissions/new", label: "Add Admission" },
  { path: "/exam-centers/new", label: "Add Exam Center" },
  { path: "/progress/new", label: "Add Progress" },
];

async function assertFormShell(page: Page) {
  const shell = page
    .locator(".grs-page-topbar, .grs-page, form.grs-form, .grs-form-layout, form")
    .first();
  await expect(shell).toBeVisible({ timeout: 20_000 });
}

/** Uncaught exceptions and non-React console errors (excludes known nav duplicate-key noise). */
function isBlockingConsoleError(text: string): boolean {
  if (/failed to load resource/i.test(text) && /favicon/i.test(text)) return false;
  if (/Encountered two children with the same key/i.test(text)) return false;
  return true;
}

function attachPageErrorCollector(page: Page): string[] {
  const fatals: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (isBlockingConsoleError(text)) fatals.push(text);
  });
  page.on("pageerror", (err) => {
    fatals.push(`pageerror: ${err.message}`);
  });
  return fatals;
}

for (const viewport of [
  { name: "390px", width: 390, height: 844 },
  { name: "1280px", width: 1280, height: 800 },
] as const) {
  test.describe(`FormPageShell add routes (${viewport.name})`, () => {
    test("load add form routes", async ({ page }) => {
      const fatals = attachPageErrorCollector(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await loginAsAdmin(page);

      for (const { path, label } of ADD_ROUTES) {
        const before = fatals.length;
        await page.goto(path);
        await page.waitForLoadState("domcontentloaded");
        await assertFormShell(page);
        const routeFatals = fatals.slice(before);
        expect(routeFatals, `blocking console on ${label} (${path})`).toEqual([]);
        const ok = await page.evaluate(() => {
          const root = document.documentElement;
          return root.scrollWidth <= root.clientWidth + 2;
        });
        expect(ok, `horizontal overflow on ${label}`).toBe(true);
      }
    });
  });
}
