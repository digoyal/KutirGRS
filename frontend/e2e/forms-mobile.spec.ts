import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Mobile form layout regression (~390px). Matches forms-mobile-audit route list (24).
 * Login once; each route: no document horizontal overflow + basic shell sanity.
 * Requires Vite :5173 + API :8001 (see docs/smoke-test.md).
 */

const VIEWPORT = { width: 390, height: 844 };
const OVERFLOW_TOLERANCE_PX = 2;
const API_BASE = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:8001/api/v1";

type SampleIds = {
  studentId: number;
  kutirId: number;
  schoolId: number;
  visitId: number;
  userId: number;
  admissionId: number;
  progressId: number;
};

async function bearerToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem("access_token"));
  expect(token, "expected access_token after login").toBeTruthy();
  return token!;
}

async function firstListId(page: Page, listPath: string): Promise<number> {
  const token = await bearerToken(page);
  const res = await page.request.get(`${API_BASE}${listPath}?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), `GET ${listPath} failed: ${res.status()}`).toBeTruthy();
  const rows = (await res.json()) as { id: number }[];
  expect(rows.length, `no rows for ${listPath} — seed local DB`).toBeGreaterThan(0);
  return rows[0].id;
}

async function resolveSampleIds(page: Page): Promise<SampleIds> {
  return {
    studentId: await firstListId(page, "/students"),
    kutirId: await firstListId(page, "/kutirs"),
    schoolId: await firstListId(page, "/schools"),
    visitId: await firstListId(page, "/kutir-visits"),
    userId: await firstListId(page, "/users"),
    admissionId: await firstListId(page, "/student-exams"),
    progressId: await firstListId(page, "/student-progress"),
  };
}

async function assertNoHorizontalOverflow(page: Page, routeLabel: string) {
  const ok = await page.evaluate((tolerance) => {
    const root = document.documentElement;
    return root.scrollWidth <= root.clientWidth + tolerance;
  }, OVERFLOW_TOLERANCE_PX);
  expect(ok, `horizontal overflow on ${routeLabel}`).toBe(true);
}

async function assertFormShell(page: Page) {
  const shell = page.locator(
    ".grs-page-topbar, .grs-page, form.grs-form, .grs-form-layout, form",
  ).first();
  await expect(shell).toBeVisible({ timeout: 20_000 });
}

/** Static + detail routes (24 total) — see docs/forms-mobile-audit in Project Context. */
function formMobileRoutes(ids: SampleIds): { path: string; label: string }[] {
  const {
    studentId,
    kutirId,
    schoolId,
    visitId,
    userId,
    admissionId,
    progressId,
  } = ids;

  return [
    { path: "/students/new", label: "Add Student" },
    { path: "/kutirs/new", label: "Add Kutir" },
    { path: "/schools/new", label: "Add School" },
    { path: "/visits/detail/new", label: "Log New Visit" },
    { path: "/users/new", label: "Add User" },
    { path: "/admissions/new", label: "Add Admission" },
    { path: "/exam-centers/new", label: "Add Exam Center" },
    { path: "/progress/new", label: "Add Progress" },
    { path: "/import", label: "Import Data" },
    { path: "/admin/change-password", label: "Change Password" },
    { path: `/students/${studentId}`, label: "Student detail" },
    { path: `/students/${studentId}?edit=1`, label: "Student edit" },
    { path: `/kutirs/${kutirId}`, label: "Kutir detail" },
    { path: `/kutirs/${kutirId}?edit=1`, label: "Kutir edit" },
    { path: `/schools/${schoolId}`, label: "School detail" },
    { path: `/schools/${schoolId}?edit=1`, label: "School edit" },
    { path: `/visits/detail/${visitId}`, label: "Visit detail" },
    { path: `/visits/detail/${visitId}?edit=1`, label: "Visit edit" },
    { path: `/users/${userId}`, label: "User detail" },
    { path: `/users/${userId}?edit=1`, label: "User edit" },
    { path: `/admissions/${admissionId}`, label: "Admission detail" },
    { path: `/admissions/${admissionId}?edit=1`, label: "Admission edit" },
    { path: `/progress/${progressId}`, label: "Progress detail" },
    { path: `/progress/${progressId}?edit=1`, label: "Progress edit" },
  ];
}

test.describe("Forms mobile layout (~390px)", () => {
  test("add, detail, and edit form routes fit viewport width", async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await loginAsAdmin(page);

    const ids = await resolveSampleIds(page);
    const routes = formMobileRoutes(ids);
    expect(routes).toHaveLength(24);

    for (const { path, label } of routes) {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      await assertFormShell(page);
      await assertNoHorizontalOverflow(page, `${label} (${path})`);
    }
  });
});
