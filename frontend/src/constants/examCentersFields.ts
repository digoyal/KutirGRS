import type { FieldMeta } from "../hooks/useFieldConfig";

/**
 * Single source of truth for Exam Centers list columns, Column Config, CSV export,
 * and form field labels (Add/Edit/View) for keys that appear on the form.
 * ExamCentersPage, FieldConfigPage, export, and ExamCenterForm must use this array
 * for those concerns — do not duplicate keys/labels elsewhere.
 */
export const EXAM_CENTERS_FIELDS: FieldMeta[] = [
  { key: "name",         label: "Name",     hideable: false, defaultVisible: true  },
  { key: "street",       label: "Street",   hideable: true,  defaultVisible: true  },
  { key: "city",         label: "City",     hideable: true,  defaultVisible: true  },
  { key: "districtName", label: "District", hideable: true,  defaultVisible: true  },
  { key: "state",        label: "State",    hideable: true,  defaultVisible: true  },
  { key: "pincode",      label: "Pincode",  hideable: true,  defaultVisible: false },
];

export const EXAM_CENTERS_FIELD_KEYS = EXAM_CENTERS_FIELDS.map((f) => f.key) as readonly string[];

if (new Set(EXAM_CENTERS_FIELD_KEYS).size !== EXAM_CENTERS_FIELD_KEYS.length) {
  throw new Error("EXAM_CENTERS_FIELDS keys must be unique");
}

/** Look up an Exam Centers registry field by key. Throws (and warns in DEV) if missing. */
export function examCenterField(key: string): FieldMeta {
  const meta = EXAM_CENTERS_FIELDS.find((f) => f.key === key);
  if (!meta) {
    const msg = `Unknown exam center field key: ${key}`;
    if (import.meta.env.DEV) {
      console.error(msg);
    }
    throw new Error(msg);
  }
  return meta;
}

/** Registry label for a form field key; appends " *" when required. */
export function examCenterFieldLabel(key: string, opts?: { required?: boolean }): string {
  const label = examCenterField(key).label;
  return opts?.required ? `${label} *` : label;
}
