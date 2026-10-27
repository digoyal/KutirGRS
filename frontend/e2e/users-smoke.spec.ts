import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Tiny Users browser smoke. Same pattern as Admissions/Progress/Visits.
 * Login: admin / admin. Requires Vite :5173 + API :8001.
 */

async function openUsers(page: Page) {
  await page.getByRole("link", { name: "Users", exact: true }).click();
  await expect(page).toHaveURL(/\/users\/?$/);
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
}

/** Client-side search for a known username, then open Edit. */
async function openFirstUserEdit(page: Page) {
  await openUsers(page);

  const search = page.getByPlaceholder("Search…");
  await search.fill("aaditya_mandloi");
  await expect(page.getByTitle("Edit").first()).toBeVisible({ timeout: 15_000 });
  await page.getByTitle("Edit").first().click();

  await expect(page).toHaveURL(/\/users\/\d+\?edit=1/);
  await expect(page.getByRole("heading", { name: "Aaditya Mandloi" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible();
}

test.describe("Users smoke", () => {
  test("login → Users list loads", async ({ page }) => {
    await loginAsAdmin(page);
    await openUsers(page);

    await expect(page.getByPlaceholder("Search…")).toBeVisible();
    await expect(page.getByText(/No users found\.|\d[\d,]* rows/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Add" })).toBeVisible();
  });

  test("Add User shows key fields", async ({ page }) => {
    await loginAsAdmin(page);
    await openUsers(page);

    await page.getByRole("button", { name: "+ Add" }).click();
    await expect(page).toHaveURL(/\/users\/new/);
    await expect(page.getByRole("heading", { name: "Add User" })).toBeVisible();

    await expect(page.getByText("Username *", { exact: true })).toBeVisible();
    await expect(page.getByText("Password *", { exact: true })).toBeVisible();
    await expect(page.getByText("First Name", { exact: true })).toBeVisible();
    await expect(page.getByText("Last Name", { exact: true })).toBeVisible();
    await expect(page.getByText("Role", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save User" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("Edit existing row loads key fields", async ({ page }) => {
    await loginAsAdmin(page);
    await openFirstUserEdit(page);

    await expect(page.getByText("Username *", { exact: true })).toBeVisible();
    await expect(page.getByText("Password (leave blank to keep)", { exact: true })).toBeVisible();
    await expect(page.getByText("First Name", { exact: true })).toBeVisible();
    await expect(page.getByText("Role", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("Edit Save Changes (no-op) returns to list", async ({ page }) => {
    await loginAsAdmin(page);
    await openFirstUserEdit(page);

    // No field mutations — safe on local DB; still exercises update + navigate(-1).
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page).toHaveURL(/\/users\/?$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  });
});
