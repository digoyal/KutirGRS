import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Repro: after exam type change on edit, fill GRS district + school type + school name → Save
 * must not show "School type is required."
 */

async function openAdmissionEdit(page: Page, examId: number) {
  await page.goto(`/admissions/${examId}?edit=1`);
  await expect(page.getByRole("heading", { name: "Edit Admission" })).toBeVisible({
    timeout: 15_000,
  });
}

function examTypeSelect(page: Page) {
  return page.getByRole("combobox").filter({
    has: page.getByRole("option", { name: "Tribles School" }),
  });
}

function grsComboboxes(page: Page) {
  const schoolType = page.getByRole("combobox").filter({
    has: page.getByRole("option", { name: /^-- select --$/ }),
  });
  return {
    district: page
      .getByRole("combobox")
      .filter({ has: page.getByRole("option", { name: "Alirajpur" }) })
      .last(),
    schoolType: schoolType.filter({ has: page.locator("option", { hasText: "EMRS" }) }).first(),
    schoolName: page
      .getByRole("combobox")
      .filter({ has: page.locator("option", { hasText: /\(.+\)/ }) })
      .last(),
  };
}

test.describe("Admission GRS school type after exam change", () => {
  test("exam type change then EMRS + school name saves", async ({ page }) => {
    await loginAsAdmin(page);
    // Admitted row with full pipeline (scores, GRS visible).
    await openAdmissionEdit(page, 126);

    const examSel = examTypeSelect(page);
    await expect(page.getByText(/^School Type/)).toBeVisible();

    const optionsBefore = await examSel.locator("option").allTextContents();
    await examSel.selectOption({ label: "Tribles School" });

    const { district: districtSelect, schoolType: schoolTypeSelect, schoolName: schoolNameSelect } =
      grsComboboxes(page);

    await districtSelect.selectOption({ index: 1 });
    await expect(schoolTypeSelect).toBeEnabled();

    const stOptions = await schoolTypeSelect.locator("option").allTextContents();
    const emrs =
      stOptions.find((t) => /EMRS/i.test(t)) ??
      stOptions.find((t) => t.trim() && !t.includes("select"));
    test.skip(!emrs, `No school type on new exam type (had: ${optionsBefore.join(", ")})`);

    await schoolTypeSelect.selectOption({ label: emrs!.trim() });
    await expect(schoolNameSelect).toBeEnabled();

    const nameOpts = schoolNameSelect.locator("option");
    await expect(nameOpts).not.toHaveCount(1, { timeout: 10_000 });
    const schoolValue = await nameOpts.nth(1).getAttribute("value");
    test.skip(!schoolValue, "No GRS school in catalog for district/type");
    await schoolNameSelect.selectOption(schoolValue!);

    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("School type is required.")).toHaveCount(0);
    await expect(page.getByText(/Save failed/i)).toHaveCount(0);
  });

  test("Tribles School after exam type reset still saves", async ({ page }) => {
    await loginAsAdmin(page);
    await openAdmissionEdit(page, 126);

    const examSel = examTypeSelect(page);
    await examSel.selectOption({ label: "Tribles School" });

    const schoolTypeSelect = page.getByText(/^School Type/).locator("..").getByRole("combobox");
    await expect(schoolTypeSelect).toHaveValue("");

    const districtSelect = page
      .getByText("GRS School", { exact: true })
      .locator("..")
      .locator("..")
      .getByRole("combobox")
      .first();
    await districtSelect.selectOption({ index: 1 });

    const typeOpts = await schoolTypeSelect.locator("option").allTextContents();
    const pick = typeOpts.find((t) => t.trim() && !t.includes("select"))?.trim();
    test.skip(!pick, "No Tribles-linked school type");
    await schoolTypeSelect.selectOption({ label: pick! });

    const schoolNameSelect = page.getByText(/^School Name/).locator("..").getByRole("combobox");
    await schoolNameSelect.selectOption({ index: 1 });

    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("School type is required.")).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByText(/Save failed/i)).toHaveCount(0);
  });
});