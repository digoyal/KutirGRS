import type { FieldMeta } from "../hooks/useFieldConfig";

/**
 * Single source of truth for Kutir Visits list columns, Column Config, CSV export,
 * and form field labels (Add/Edit/View) for keys that appear on the form.
 * VisitsPage, FieldConfigPage, export, and VisitForm must use this array
 * for those concerns — do not duplicate keys/labels elsewhere.
 * List-only keys (form: false) stay off the hand-built form layout.
 */
export const VISITS_FIELDS: FieldMeta[] = [
  { key: "visit_date",               label: "Date",                         formLabel: "Visit Date", hideable: false, defaultVisible: true },
  { key: "kutir_id",                 label: "Kutir",                        hideable: false, defaultVisible: true },
  { key: "avg_attendance_morning",   label: "Attendance M/E",               hideable: true,  defaultVisible: true,  form: false },
  { key: "regular_students_morning", label: "Regular Students M/E",         hideable: true,  defaultVisible: false, form: false },
  { key: "physical_vs_registered",   label: "App vs. Registered Students",  hideable: true,  defaultVisible: false },
  { key: "follow_timetable",         label: "Follows Timetable",            hideable: true,  defaultVisible: false },
  { key: "workbook_percentage",      label: "Workbook %",                   formLabel: "Workbook % Complete", hideable: true, defaultVisible: true },
  { key: "workbook_completion",      label: "Workbook Completion",          hideable: true,  defaultVisible: false },
  { key: "book_availability",        label: "Book Availability",            hideable: true,  defaultVisible: false },
  { key: "kutir_performance",        label: "Performance",                  formLabel: "Kutir Performance", hideable: true, defaultVisible: true },
  { key: "staff_behavior",           label: "Staff Behavior",               formLabel: "Kutir Staff Behavior", hideable: true, defaultVisible: false },
  { key: "cleanliness",              label: "Cleanliness",                  hideable: true,  defaultVisible: true },
  { key: "hindi_proficiency",        label: "Hindi",                        formLabel: "Hindi Proficiency", hideable: true, defaultVisible: false },
  { key: "english_proficiency",      label: "English",                      formLabel: "English Proficiency", hideable: true, defaultVisible: false },
  { key: "maths_proficiency",        label: "Maths",                        formLabel: "Math Proficiency", hideable: true, defaultVisible: false },
  { key: "evs_proficiency",          label: "EVS",                          formLabel: "EVS Proficiency (class 5 only)", hideable: true, defaultVisible: false },
  { key: "reasoning_proficiency",    label: "Reasoning",                    formLabel: "Reasoning Proficiency (class 5 only)", hideable: true, defaultVisible: false },
  { key: "material_management",      label: "Material Mgmt",                formLabel: "Material Management", hideable: true, defaultVisible: false },
  { key: "grs_prep_remarks",         label: "GRS Prep Remarks",             formLabel: "GRS Preparation Remarks", hideable: true, defaultVisible: false },
  { key: "final_remarks",            label: "Final Remarks",                hideable: true,  defaultVisible: false },
  { key: "visit_photo",              label: "Photo",                        formLabel: "Visit Photo", hideable: true, defaultVisible: false },
];

export const VISITS_FIELD_KEYS = VISITS_FIELDS.map((f) => f.key) as readonly string[];

/** Rating fields (1–5) available on Kutir Performance report metric dropdown. */
export const KUTIR_PERFORMANCE_METRIC_KEYS = [
  "kutir_performance",
  "cleanliness",
  "hindi_proficiency",
  "english_proficiency",
  "maths_proficiency",
  "evs_proficiency",
  "reasoning_proficiency",
  "material_management",
  "staff_behavior",
] as const;

export type KutirPerformanceMetricKey = (typeof KUTIR_PERFORMANCE_METRIC_KEYS)[number];

if (new Set(VISITS_FIELD_KEYS).size !== VISITS_FIELD_KEYS.length) {
  throw new Error("VISITS_FIELDS keys must be unique");
}

/** Look up a Visits registry field by key. Throws (and warns in DEV) if missing. */
export function visitField(key: string): FieldMeta {
  const meta = VISITS_FIELDS.find((f) => f.key === key);
  if (!meta) {
    const msg = `Unknown visit field key: ${key}`;
    if (import.meta.env.DEV) {
      console.error(msg);
    }
    throw new Error(msg);
  }
  return meta;
}

/** Form label: `formLabel ?? label`; appends " *" when required. List/export use `label`. */
export function visitFieldLabel(key: string, opts?: { required?: boolean }): string {
  const meta = visitField(key);
  const label = meta.formLabel ?? meta.label;
  return opts?.required ? `${label} *` : label;
}
