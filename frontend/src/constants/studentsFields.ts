import type { FieldMeta } from "../hooks/useFieldConfig";

/**
 * Single source of truth for Students list columns, Column Config, CSV export,
 * and form field labels (Add/Edit/View) for keys that appear on the form.
 * StudentsPage, FieldConfigPage, export, and StudentForm must use this array
 * for those concerns — do not duplicate keys/labels elsewhere.
 * List-only keys (form: false) stay off the hand-built form layout.
 */
export const STUDENTS_FIELDS: FieldMeta[] = [
  { key: "name",              label: "Name",          hideable: false, defaultVisible: true,  form: false },
  { key: "gender",            label: "Gender",        hideable: true,  defaultVisible: true  },
  { key: "phone",             label: "Phone",         hideable: true,  defaultVisible: true  },
  { key: "father_name",       label: "Father",        hideable: true,  defaultVisible: true  },
  { key: "mother_name",       label: "Mother",        hideable: true,  defaultVisible: false },
  { key: "docsCount",         label: "Docs",          hideable: true,  defaultVisible: true,  form: false },
  { key: "addedDate",         label: "Added",         hideable: true,  defaultVisible: false, form: false },
  { key: "kutir_id",          label: "Kutir",         hideable: true,  defaultVisible: false },
  { key: "dob",               label: "Date of Birth", hideable: true,  defaultVisible: false },
  { key: "email",             label: "Email",         hideable: true,  defaultVisible: false },
  { key: "alt_contact_name",  label: "Alt Contact",   hideable: true,  defaultVisible: false },
  { key: "alt_contact_phone", label: "Alt Phone",     hideable: true,  defaultVisible: false },
];

/** Keys that must have a cell/export renderer on StudentsPage. */
export const STUDENTS_FIELD_KEYS = STUDENTS_FIELDS.map((f) => f.key) as readonly string[];

if (new Set(STUDENTS_FIELD_KEYS).size !== STUDENTS_FIELD_KEYS.length) {
  throw new Error("STUDENTS_FIELDS keys must be unique");
}

/** Look up a Students registry field by key. Throws (and warns in DEV) if missing. */
export function studentField(key: string): FieldMeta {
  const meta = STUDENTS_FIELDS.find((f) => f.key === key);
  if (!meta) {
    const msg = `Unknown student field key: ${key}`;
    if (import.meta.env.DEV) {
      console.error(msg);
    }
    throw new Error(msg);
  }
  return meta;
}

/** Registry label for a form field key; appends " *" when required. */
export function studentFieldLabel(key: string, opts?: { required?: boolean }): string {
  const label = studentField(key).label;
  return opts?.required ? `${label} *` : label;
}
