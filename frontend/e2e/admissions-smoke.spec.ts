import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Tiny Admissions browser smoke (first try). Not a full suite.
 * Login: admin / admin. Requires Vite :5173 + API :8001.
 */

async function openAdmissions(page: Page) {
  await page.getByRole("link", { name: "Admissions", exact: true }).click();
  await expect(page).toHaveURL(/\/admissions\/?$/);
  await expect(page.getByRole("heading", { name: "Admissions" })).toBeVisible();
}

/** Admin has no default geo filter — search so the table loads rows, then open Edit. */
async function openFirstAdmissionEdit(page: Page) {
  await page.evaluate(() => localStorage.removeItem("admissions_filter_state"));
  await openAdmissions(page);

  const search = page.getByPlaceholder("Search student...");
  await search.fill("Chouhan");
  await expect(page.getByTitle("Edit").first()).toBeVisible({ timeout: 15_000 });
  await page.getByTitle("Edit").first().click();

  await expect(page).toHaveURL(/\/admissions\/\d+\?edit=1/);
  await expect(page.getByRole("heading", { name: "Edit Admission" })).toBeVisible();
}

test.describe("Admissions smoke", () => {
  test("login → Admissions list loads", async ({ page }) => {
    await loginAsAdmin(page);
    await openAdmissions(page);

    // Table shell: search + empty-or-rows (admin has no geo filter by default).
    await expect(page.getByPlaceholder("Search student...")).toBeVisible();
    await expect(
      page
        .getByText(
          /Select a district or search by student name to view admissions|No admissions for|of \d/,
        )
        .first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Add" })).toBeVisible();
  });

  test("Add Admission shows pipeline stepper and key fields", async ({ page }) => {
    await loginAsAdmin(page);
    await openAdmissions(page);

    await page.getByRole("button", { name: "+ Add" }).click();
    await expect(page).toHaveURL(/\/admissions\/new/);
    await expect(page.getByRole("heading", { name: "Add Admission" })).toBeVisible();

    await expect(page.getByText("Pipeline Stage")).toBeVisible();
    for (const label of [
      "Eligible",
      "Applied",
      "Admit Card Downloaded",
      "Appeared",
      "Selected",
      "Admitted",
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    await expect(page.getByText("Exam Details")).toBeVisible();
    await expect(page.getByText("Year", { exact: true })).toBeVisible();
    await expect(page.getByText("Exam Type", { exact: true })).toBeVisible();
    // Roll # is pipeline-gated — hidden until Admit Card Downloaded.
    await expect(page.getByText("Roll #", { exact: true })).toHaveCount(0);
  });

  test("ticking through Admit Card reveals Roll #", async ({ page }) => {
    await loginAsAdmin(page);
    await openAdmissions(page);
    await page.getByRole("button", { name: "+ Add" }).click();
    await expect(page.getByText("Pipeline Stage")).toBeVisible();

    const stage = (name: string) =>
      page.locator("label").filter({ hasText: new RegExp(`^›?\\s*${name}$`) }).locator('input[type="checkbox"]');

    await expect(page.getByText("Roll #", { exact: true })).toHaveCount(0);

    await stage("Eligible").check();
    await expect(page.getByText("Roll #", { exact: true })).toHaveCount(0);

    await stage("Applied").check();
    await expect(page.getByText("Application #", { exact: true })).toBeVisible();
    await expect(page.getByText("Roll #", { exact: true })).toHaveCount(0);

    await stage("Admit Card Downloaded").check();
    await expect(page.getByText("Roll #", { exact: true })).toBeVisible();
  });

  test("Edit existing row loads pipeline and key fields", async ({ page }) => {
    await loginAsAdmin(page);
    await openFirstAdmissionEdit(page);

    await expect(page.getByText("Pipeline Stage")).toBeVisible();
    for (const label of [
      "Eligible",
      "Applied",
      "Admit Card Downloaded",
      "Appeared",
      "Selected",
      "Admitted",
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    await expect(page.getByText("Exam Details")).toBeVisible();
    await expect(page.getByText("Year", { exact: true })).toBeVisible();
    await expect(page.getByText("Exam Type", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("Edit Save Changes (no-op) returns to list", async ({ page }) => {
    await loginAsAdmin(page);
    await openFirstAdmissionEdit(page);

    // No field mutations — safe on local DB; still exercises update + navigate(-1).
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page).toHaveURL(/\/admissions\/?$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Admissions" })).toBeVisible();
  });
});
