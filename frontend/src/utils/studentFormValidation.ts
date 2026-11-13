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
  { key: "last_name", label: "Last name" },
  { key: "phone", label: "Phone" },
  { key: "father_name", label: "Father name" },
  { key: "mother_name", label: "Mother name" },
];

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

  if (missing.length === 0) return null;
  return `Required: ${missing.join(", ")}`;
}
