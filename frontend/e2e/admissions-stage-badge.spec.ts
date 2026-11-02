import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/** Stage pipeline pills must not wrap mid-word on the list hub table. */
test.describe("Admissions Stage column", () => {
  test("Admitted badge renders on a single line", async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole("link", { name: "Admissions", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Admissions" })).toBeVisible();

    const stageCell = page.locator("tbody td").filter({ hasText: /^Admitted$/ }).first();
    await expect(stageCell).toBeVisible({ timeout: 20_000 });

    const badge = stageCell.locator("span").first();
    await expect(badge).toHaveText("Admitted");

    const singleLine = await badge.evaluate((el) => {
      const style = window.getComputedStyle(el);
      if (style.whiteSpace !== "nowrap") return false;
      return el.scrollHeight <= el.clientHeight + 2;
    });
    expect(singleLine).toBe(true);

    await page.screenshot({
      path: "e2e-artifacts/admissions-stage-admitted.png",
      fullPage: false,
    });
  });
});
