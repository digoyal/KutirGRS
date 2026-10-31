import { test, expect, devices, type Page } from "@playwright/test";
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

test("visit edit ratings — iPhone 16 Pro layout", async ({ browser }) => {
  const context = await browser.newContext({ ...devices["iPhone 16 Pro"] });
  const page = await context.newPage();
  try {
    await loginAsAdmin(page);
    const visitId = await firstListId(page, "/kutir-visits");
    await page.goto(`/visits/detail/${visitId}?edit=1`);
    await page.waitForLoadState("domcontentloaded");
    await page.getByText("Ratings (1 = Poor").scrollIntoViewIfNeeded();

    const layout = await page.evaluate(() => {
      const root = document.documentElement;
      const main = document.querySelector(".grs-main");
      const pageEl = document.querySelector(".visit-add-page");
      const card = document.querySelector(".visit-add-card");
      const mainCs = main ? getComputedStyle(main) : null;
      const pageCs = pageEl ? getComputedStyle(pageEl) : null;
      const cardCs = card ? getComputedStyle(card) : null;
      const rows = Array.from(document.querySelectorAll(".visit-form-rating-row"));
      const vw = root.clientWidth;
      const starsClip = rows.some((row) => {
        const stars = row.querySelector(".visit-form-stars");
        if (!stars) return false;
        const r = stars.getBoundingClientRect();
        return r.right > vw + 1 || r.left < 0;
      });
      const ratingRowsSameLine = rows.every((row) => {
        const cs = getComputedStyle(row);
        if (cs.flexDirection.startsWith("column")) return false;
        const label = row.querySelector(".visit-form-rating-label");
        const stars = row.querySelector(".visit-form-stars");
        if (!label || !stars) return false;
        const lr = label.getBoundingClientRect();
        const sr = stars.getBoundingClientRect();
        return Math.abs(lr.top - sr.top) < 10 && sr.left >= lr.left - 1;
      });
      const mainRect = main?.getBoundingClientRect();
      const pageLeft = pageEl?.getBoundingClientRect().left ?? null;
      const mainPadLeft = mainCs ? parseFloat(mainCs.paddingLeft) : 0;
      const contentInsetFromMain =
        mainRect && pageLeft != null ? pageLeft - (mainRect.left + mainPadLeft) : null;
      return {
        scrollOverflow: root.scrollWidth - root.clientWidth,
        mainPaddingLeft: mainCs?.paddingLeft ?? null,
        mainPaddingTop: mainCs?.paddingTop ?? null,
        pagePaddingLeft: pageCs?.paddingLeft ?? null,
        pageContentLeft: pageLeft,
        contentInsetFromMain,
        cardPaddingLeft: cardCs?.paddingLeft ?? null,
        cardPaddingRight: cardCs?.paddingRight ?? null,
        starsClip,
        ratingRowsSameLine,
        ratingRowCount: rows.length,
      };
    });

    expect(layout.ratingRowCount, "expected visit rating rows").toBeGreaterThan(0);
    expect(layout.mainPaddingLeft, "shell uses small inset, not menu column").toBe("12px");
    expect(layout.mainPaddingTop, "clear fixed hamburger vertically").toBe("56px");
    expect(layout.pagePaddingLeft).toBe("0px");
    expect(layout.pageContentLeft, "no 56px reserved menu column").toBeLessThan(44);
    expect(layout.contentInsetFromMain, ".grs-page aligns with .grs-main content box").toBeLessThanOrEqual(2);
    expect(layout.cardPaddingLeft, "visit card keeps inner padding").toBe("16px");
    expect(layout.cardPaddingRight).toBe("16px");
    expect(layout.scrollOverflow).toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);
    expect(layout.starsClip, "star rows must not clip at viewport edge").toBe(false);
    expect(layout.ratingRowsSameLine, "label and stars stay on one row").toBe(true);
  } finally {
    await context.close();
  }
});
