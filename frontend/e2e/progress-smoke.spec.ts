import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Tiny Progress browser smoke. Same pattern as Admissions.
 * Login: admin / admin. Requires Vite :5173 + API :8001.
 */

async function openProgress(page: Page) {
  await page.getByRole("link", { name: "Progress", exact: true }).click();
  await expect(page).toHaveURL(/\/progress\/?$/);
  await expect(page.getByRole("heading", { name: "Student Progress" })).toBeVisible();
}

/** Admin has no default geo filter — search so the table loads rows, then open Edit. */
async function openFirstProgressEdit(page: Page) {
  await page.evaluate(() => localStorage.removeItem("progress_filter_state"));
  await openProgress(page);

  const search = page.getByPlaceholder("Search by student name…");
  await search.fill("Chouhan");
  await expect(page.getByTitle("Edit").first()).toBeVisible({ timeout: 15_000 });
  await page.getByTitle("Edit").first().click();

  await expect(page).toHaveURL(/\/progress\/\d+\?edit=1/);
  await expect(page.getByText("Progress Record")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible();
}

test.describe("Progress smoke", () => {
  test("login → Progress list loads", async ({ page }) => {
    await loginAsAdmin(page);
    await openProgress(page);

    await expect(page.getByPlaceholder("Search by student name…")).toBeVisible();
    await expect(
      page
        .getByText(
          /Select a District or search by Student name to view Progress|No progress records for|of \d/,
        )
        .first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Add" })).toBeVisible();
  });

  test("Add Progress shows key fields", async ({ page }) => {
    await loginAsAdmin(page);
    await openProgress(page);

    await page.getByRole("button", { name: "+ Add" }).click();
    await expect(page).toHaveURL(/\/progress\/new/);
    await expect(page.getByRole("heading", { name: "Add Progress Record" })).toBeVisible();

    await expect(page.getByText("Student *", { exact: true })).toBeVisible();
    await expect(page.getByText("Year", { exact: true })).toBeVisible();
    await expect(page.getByText("Class *", { exact: true })).toBeVisible();
    await expect(page.getByText("School *", { exact: true })).toBeVisible();
    await expect(page.getByText("Status", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Record" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("Edit existing row loads key fields", async ({ page }) => {
    await loginAsAdmin(page);
    await openFirstProgressEdit(page);

    await expect(page.getByText("Academic Year", { exact: true })).toBeVisible();
    await expect(page.getByText("Class", { exact: true })).toBeVisible();
    await expect(page.getByText("School *", { exact: true })).toBeVisible();
    await expect(page.getByText("Status", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("Edit Save Changes (no-op) returns to list", async ({ page }) => {
    await loginAsAdmin(page);
    await openFirstProgressEdit(page);

    // No field mutations — safe on local DB; still exercises update + navigate(-1).
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page).toHaveURL(/\/progress\/?$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Student Progress" })).toBeVisible();
  });
});
