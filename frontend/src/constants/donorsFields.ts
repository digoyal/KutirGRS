import type { FieldMeta } from "../hooks/useFieldConfig";

/**
 * Single source of truth for Donors list columns and form field labels
 * (Lookups → Donors Add/Edit). Do not duplicate keys/labels elsewhere.
 */
export const DONORS_FIELDS: FieldMeta[] = [
  { key: "name",  label: "Name",  hideable: false, defaultVisible: true },
  { key: "email", label: "Email", hideable: true,  defaultVisible: true },
  { key: "phone", label: "Phone", hideable: true,  defaultVisible: true },
  { key: "notes", label: "Notes", hideable: true,  defaultVisible: true },
];

export const DONORS_FIELD_KEYS = DONORS_FIELDS.map((f) => f.key) as readonly string[];

if (new Set(DONORS_FIELD_KEYS).size !== DONORS_FIELD_KEYS.length) {
  throw new Error("DONORS_FIELDS keys must be unique");
}

/** Look up a Donors registry field by key. Throws (and warns in DEV) if missing. */
export function donorField(key: string): FieldMeta {
  const meta = DONORS_FIELDS.find((f) => f.key === key);
  if (!meta) {
    const msg = `Unknown donor field key: ${key}`;
    if (import.meta.env.DEV) {
      console.error(msg);
    }
    throw new Error(msg);
  }
  return meta;
}

/** Registry label for a form field key; appends " *" when required. */
export function donorFieldLabel(key: string, opts?: { required?: boolean }): string {
  const label = donorField(key).label;
  return opts?.required ? `${label} *` : label;
}
