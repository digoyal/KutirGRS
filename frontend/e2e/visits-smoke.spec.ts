import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Tiny Kutir Visits (Visit Details) browser smoke. Same pattern as Admissions.
 * Login: admin / admin. Requires Vite :5173 + API :8001.
 */

async function openVisitDetails(page: Page) {
  await page.getByRole("link", { name: "Visit Details", exact: true }).click();
  await expect(page).toHaveURL(/\/visits\/detail\/?$/);
  await expect(page.getByRole("heading", { name: "Kutir Visits" })).toBeVisible();
}

/** Clear filters, search known kutir, open first Edit. */
async function openFirstVisitEdit(page: Page) {
  await page.evaluate(() => localStorage.removeItem("visits_filter_state"));
  await openVisitDetails(page);

  const search = page.getByPlaceholder("Search by kutir name…");
  await search.fill("Test_kutir");
  await expect(page.getByTitle("Edit").first()).toBeVisible({ timeout: 20_000 });
  await page.getByTitle("Edit").first().click();

  await expect(page).toHaveURL(/\/visits\/detail\/\d+\?edit=1/);
  await expect(page.getByRole("heading", { name: "Edit Visit" })).toBeVisible();
}

test.describe("Kutir Visits smoke", () => {
  test("login → Visit Details list loads", async ({ page }) => {
    await loginAsAdmin(page);
    await openVisitDetails(page);

    await expect(page.getByPlaceholder("Search by kutir name…")).toBeVisible();
    await expect(
      page.getByText(/No visits recorded yet\.|of \d|Field visit records/).first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Add" })).toBeVisible();
  });

  test("Log New Visit shows key sections and fields", async ({ page }) => {
    await loginAsAdmin(page);
    await openVisitDetails(page);

    await page.getByRole("button", { name: "+ Add" }).click();
    await expect(page).toHaveURL(/\/visits\/detail\/new/);
    await expect(page.getByRole("heading", { name: "Log New Visit" })).toBeVisible();

    await expect(page.getByText("Visit Info", { exact: true })).toBeVisible();
    await expect(page.getByText("Kutir *", { exact: true })).toBeVisible();
    await expect(page.getByText("Visit Date *", { exact: true })).toBeVisible();
    await expect(page.getByText("Implementation", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log Visit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("Edit existing row loads key fields", async ({ page }) => {
    await loginAsAdmin(page);
    await openFirstVisitEdit(page);

    await expect(page.getByText("Visit Info", { exact: true })).toBeVisible();
    await expect(page.getByText("Kutir *", { exact: true })).toBeVisible();
    await expect(page.getByText("Visit Date *", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("Edit Save Changes (no-op) returns to list", async ({ page }) => {
    await loginAsAdmin(page);
    await openFirstVisitEdit(page);

    // No field mutations — safe on local DB; still exercises update + navigate(-1).
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page).toHaveURL(/\/visits\/detail\/?$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Kutir Visits" })).toBeVisible();
  });
});
