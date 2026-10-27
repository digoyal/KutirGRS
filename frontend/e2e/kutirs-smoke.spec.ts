import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Tiny Kutirs browser smoke. Same pattern as Admissions/Progress/Visits.
 * Login: admin / admin. Requires Vite :5173 + API :8001.
 */

async function openKutirs(page: Page) {
  await page.getByRole("link", { name: "Kutirs", exact: true }).click();
  await expect(page).toHaveURL(/\/kutirs\/?$/);
  await expect(page.getByRole("heading", { name: "Kutirs" })).toBeVisible();
}

/** Clear filters, search known kutir, open first Edit. */
async function openFirstKutirEdit(page: Page) {
  await page.evaluate(() => localStorage.removeItem("kutirs_filter_state"));
  await openKutirs(page);

  const search = page.getByPlaceholder("Search kutirs…");
  await search.fill("Test_kutir");
  await expect(page.getByTitle("Edit").first()).toBeVisible({ timeout: 20_000 });
  await page.getByTitle("Edit").first().click();

  await expect(page).toHaveURL(/\/kutirs\/\d+\?edit=1/);
  await expect(page.getByRole("heading", { name: "Test_kutir" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible();
}

test.describe("Kutirs smoke", () => {
  test("login → Kutirs list loads", async ({ page }) => {
    await loginAsAdmin(page);
    await openKutirs(page);

    await expect(page.getByPlaceholder("Search kutirs…")).toBeVisible();
    await expect(
      page
        .getByText(/No kutirs yet\.|No kutirs match the current filters\.|\d[\d,]* rows/)
        .first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Add" })).toBeVisible();
  });

  test("Add Kutir shows key sections and fields", async ({ page }) => {
    await loginAsAdmin(page);
    await openKutirs(page);

    await page.getByRole("button", { name: "+ Add" }).click();
    await expect(page).toHaveURL(/\/kutirs\/new/);
    await expect(page.getByRole("heading", { name: "Add Kutir" })).toBeVisible();

    await expect(page.getByText("Location", { exact: true })).toBeVisible();
    await expect(page.getByText("Details", { exact: true })).toBeVisible();
    await expect(page.getByText("Name *", { exact: true })).toBeVisible();
    await expect(page.getByText("Type", { exact: true })).toBeVisible();
    await expect(page.getByText("Cluster *", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save Kutir" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("Edit existing row loads key fields", async ({ page }) => {
    await loginAsAdmin(page);
    await openFirstKutirEdit(page);

    await expect(page.getByText("Location", { exact: true })).toBeVisible();
    await expect(page.getByText("Details", { exact: true })).toBeVisible();
    await expect(page.getByText("Name *", { exact: true })).toBeVisible();
    await expect(page.getByText("Cluster *", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("Edit Save Changes (no-op) returns to list", async ({ page }) => {
    await loginAsAdmin(page);
    await openFirstKutirEdit(page);

    // No field mutations — safe on local DB; still exercises update + navigate(-1).
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page).toHaveURL(/\/kutirs\/?$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Kutirs" })).toBeVisible();
  });
});
