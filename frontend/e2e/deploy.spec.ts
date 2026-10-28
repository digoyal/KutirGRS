import { expect, test } from "@playwright/test";

// Mocked deployment API: these tests never deploy or touch a real database.
test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

for (const width of [375, 1280]) {
  test(`deploy progress survives restart and reload at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("access_token", "test-session"));
    let state = "idle";
    let disconnected = false;
    let posts = 0;
    await page.route("**/api/v1/**", async route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/auth/me")) return route.fulfill({ json: {
        id: 1, username: "test-sysadmin", title: "SysAdmin", is_admin: true, is_active: true,
        district_ids: [], cluster_ids: [], kutir_ids: [],
      } });
      if (path.endsWith("/admin/deploy/status")) {
        if (disconnected) return route.abort();
        return route.fulfill({ json: { output: "abc123 Test server", success: true,
          job: state === "idle" ? null : { id: "job", state,
            output: state === "failed" ? "Build failed: example" : "Building…\n" + "long_log_".repeat(100) } } });
      }
      if (path.endsWith("/admin/deploy") && route.request().method() === "POST") {
        posts += 1;
        state = "running";
        return route.fulfill({ status: 202, json: { id: "job", state } });
      }
      return route.fulfill({ json: [] });
    });
    await page.goto("/admin/deploy");
    await expect(page.getByRole("heading", { name: "Deploy from Git" })).toBeVisible();
    await expect(page.getByRole("button", { name: "🚀 Deploy Now" })).toBeEnabled();
    await page.getByRole("button", { name: "🚀 Deploy Now" }).click();
    await expect(page.getByText("⏳ Deployment in progress", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "⏳ Deploying…" })).toBeDisabled();
    await page.reload();
    await expect(page.getByText("⏳ Deployment in progress", { exact: true })).toBeVisible();
    disconnected = true;
    await expect(page.getByText(/Server temporarily unavailable/)).toBeVisible({ timeout: 10000 });
    disconnected = false;
    state = "succeeded";
    await expect(page.getByText("✅ Deploy succeeded", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "🚀 Deploy Now" })).toBeEnabled();
    state = "failed";
    await page.getByRole("button", { name: "Refresh Status" }).click();
    await expect(page.getByText("❌ Deploy failed — see details below", { exact: true })).toBeVisible();
    await expect(page.getByText("Build failed: example", { exact: true })).toBeVisible();
    expect(posts).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("setup errors are readable and leave deploy available", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("access_token", "test-session"));
  await page.route("**/api/v1/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me")) return route.fulfill({ json: { id: 1, title: "SysAdmin", is_active: true } });
    if (path.endsWith("/admin/deploy/status")) return route.fulfill({ json: { output: "abc123", success: true, job: null } });
    if (path.endsWith("/admin/deploy")) return route.fulfill({ status: 503, json: { detail: "One-time deployment service setup required." } });
    return route.fulfill({ json: [] });
  });
  await page.goto("/admin/deploy");
  await page.getByRole("button", { name: "🚀 Deploy Now" }).click();
  await expect(page.getByRole("alert")).toContainText("One-time deployment service setup required.");
  await expect(page.getByRole("button", { name: "🚀 Deploy Now" })).toBeEnabled();
});
