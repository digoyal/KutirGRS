import type { FieldMeta } from "../hooks/useFieldConfig";

/**
 * Single source of truth for Progress list columns, Column Config, CSV export,
 * and form field labels (Add/Edit/View) for keys that appear on the form.
 * StudentProgressPage, FieldConfigPage, export, and ProgressForm must use this
 * array for those concerns — do not duplicate keys/labels elsewhere.
 * List-only keys (form: false) stay off the hand-built form layout.
 */
export const PROGRESS_FIELDS: FieldMeta[] = [
  { key: "student",                  label: "Student", hideable: false, defaultVisible: true  },
  { key: "class_in_year",            label: "Class",   hideable: true,  defaultVisible: true  },
  { key: "school_id",                label: "School",  hideable: true,  defaultVisible: true  },
  { key: "previous_year_percentage", label: "Prev %",  formLabel: "Marks %", hideable: true, defaultVisible: true },
  { key: "status",                   label: "Status",  hideable: false, defaultVisible: true  },
  { key: "remarks",                  label: "Remarks", hideable: true,  defaultVisible: false },
];

export const PROGRESS_FIELD_KEYS = PROGRESS_FIELDS.map((f) => f.key) as readonly string[];

if (new Set(PROGRESS_FIELD_KEYS).size !== PROGRESS_FIELD_KEYS.length) {
  throw new Error("PROGRESS_FIELDS keys must be unique");
}

/** Look up a Progress registry field by key. Throws (and warns in DEV) if missing. */
export function progressField(key: string): FieldMeta {
  const meta = PROGRESS_FIELDS.find((f) => f.key === key);
  if (!meta) {
    const msg = `Unknown progress field key: ${key}`;
    if (import.meta.env.DEV) {
      console.error(msg);
    }
    throw new Error(msg);
  }
  return meta;
}

/** Form label: `formLabel ?? label`; appends " *" when required. List/export use `label`. */
export function progressFieldLabel(key: string, opts?: { required?: boolean }): string {
  const meta = progressField(key);
  const label = meta.formLabel ?? meta.label;
  return opts?.required ? `${label} *` : label;
}
