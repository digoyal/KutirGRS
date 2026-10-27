import { expect, type Page } from "@playwright/test";

/** Login: admin / admin. Requires Vite :5173 + API :8001. */
export async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Parivaar Kutirs" })).toBeVisible();
  const form = page.locator("form");
  await form.locator("input").first().fill("admin");
  await form.locator('input[type="password"]').fill("admin");
  await form.getByRole("button", { name: /Sign in/ }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
