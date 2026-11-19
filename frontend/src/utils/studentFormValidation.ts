import type { StudentFormState } from "../components/StudentForm";

export type StudentFormGeoCheck = {
  isAdd: boolean;
  selDistrict: number | null;
  selCluster: number | null;
  districtChoiceCount: number;
  clusterChoiceCount: number;
};

const REQUIRED_LABELS: { key: keyof StudentFormState; label: string }[] = [
  { key: "first_name", label: "First name" },
  { key: "phone", label: "Phone" },
  { key: "father_name", label: "Father name" },
  { key: "mother_name", label: "Mother name" },
];

/** Strip spaces/dashes; optional leading +91 / 91 for 12-digit imports. */
export function normalizePhoneInput(raw: string): string {
  let s = raw.trim().replace(/[\s-]/g, "");
  const excelFloat = /^(\d+)\.0+$/.exec(s);
  if (excelFloat) s = excelFloat[1];
  if (s.startsWith("+91")) s = s.slice(3);
  else if (s.startsWith("91") && s.length === 12 && /^\d+$/.test(s)) s = s.slice(2);
  return s.replace(/\D/g, "");
}

export function validateIndianMobile(
  raw: string | null | undefined,
  fieldLabel: string,
  required: boolean,
): string | null {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) {
    return required ? `${fieldLabel} must be exactly 10 digits` : null;
  }
  const digits = normalizePhoneInput(trimmed);
  if (digits.length !== 10) {
    return `${fieldLabel} must be exactly 10 digits`;
  }
  return null;
}

/** Client-side required checks for Add/Edit save (optional: sub-category, email, alt contact). */
export function validateStudentForm(
  form: StudentFormState,
  geo?: StudentFormGeoCheck,
): string | null {
  const missing: string[] = [];

  if (geo?.isAdd && geo.districtChoiceCount > 1 && geo.selDistrict == null) {
    missing.push("District");
  }
  if (geo?.isAdd && geo.clusterChoiceCount > 1 && geo.selCluster == null) {
    missing.push("Cluster");
  }
  if (!form.kutir_id) {
    missing.push("Kutir");
  }

  for (const { key, label } of REQUIRED_LABELS) {
    const raw = form[key];
    if (typeof raw !== "string" || !raw.trim()) {
      missing.push(label);
    }
  }

  if (!form.dob?.trim()) {
    missing.push("Date of birth");
  }
  if (!form.category_id) {
    missing.push("Category");
  }
  if (form.gender !== "Boy" && form.gender !== "Girl") {
    missing.push("Gender");
  }

  if (missing.length > 0) {
    return `Required: ${missing.join(", ")}`;
  }

  const phoneErr = validateIndianMobile(form.phone, "Phone", true);
  if (phoneErr) return phoneErr;

  const altErr = validateIndianMobile(form.alt_contact_phone, "Alt phone", false);
  if (altErr) return altErr;

  return null;
}