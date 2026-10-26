import type { FieldMeta } from "../hooks/useFieldConfig";

/**
 * Single source of truth for Admissions list columns, Column Config, CSV export,
 * and form field labels (Add/Edit/View) for keys that appear on the form.
 * AdmissionsPage, FieldConfigPage, export, and AdmissionForm must use this array
 * for those concerns — do not duplicate keys/labels elsewhere.
 * List-only keys (form: false) stay off the hand-built form layout.
 */
export const ADMISSIONS_FIELDS: FieldMeta[] = [
  { key: "district",           label: "District",  hideable: true,  defaultVisible: true,  form: false },
  { key: "kutir",              label: "Kutir",     hideable: true,  defaultVisible: true  },
  { key: "student",            label: "Student",   hideable: false, defaultVisible: true  },
  { key: "admission_class",    label: "Class",     hideable: true,  defaultVisible: true  },
  { key: "gender",             label: "Gender",    hideable: true,  defaultVisible: true,  form: false },
  { key: "school",             label: "School",    hideable: true,  defaultVisible: true,  form: false },
  { key: "stage",              label: "Stage",     hideable: false, defaultVisible: true,  form: false },
  { key: "exam_category_id",   label: "Exam Cat.", formLabel: "Exam Category", hideable: true, defaultVisible: true },
  { key: "exam_center_id",     label: "Center",    formLabel: "Exam Center",   hideable: true, defaultVisible: false },
  { key: "application_number", label: "App #",     formLabel: "Application #", hideable: true, defaultVisible: false },
  { key: "roll_number",        label: "Roll #",    hideable: true,  defaultVisible: false },
  { key: "scores",             label: "Scores",    hideable: true,  defaultVisible: true,  form: false },
];

export const ADMISSIONS_FIELD_KEYS = ADMISSIONS_FIELDS.map((f) => f.key) as readonly string[];

if (new Set(ADMISSIONS_FIELD_KEYS).size !== ADMISSIONS_FIELD_KEYS.length) {
  throw new Error("ADMISSIONS_FIELDS keys must be unique");
}

/** Look up an Admissions registry field by key. Throws (and warns in DEV) if missing. */
export function admissionField(key: string): FieldMeta {
  const meta = ADMISSIONS_FIELDS.find((f) => f.key === key);
  if (!meta) {
    const msg = `Unknown admission field key: ${key}`;
    if (import.meta.env.DEV) {
      console.error(msg);
    }
    throw new Error(msg);
  }
  return meta;
}

/** Form label: `formLabel ?? label`; appends " *" when required. List/export use `label`. */
export function admissionFieldLabel(key: string, opts?: { required?: boolean }): string {
  const meta = admissionField(key);
  const label = meta.formLabel ?? meta.label;
  return opts?.required ? `${label} *` : label;
}
