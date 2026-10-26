import type { FieldMeta } from "../hooks/useFieldConfig";

/**
 * Single source of truth for Schools list columns, Column Config, CSV export,
 * and form field labels (Add/Edit/View) for keys that appear on the form.
 * SchoolsPage, FieldConfigPage, export, and SchoolForm must use this array
 * for those concerns — do not duplicate keys/labels elsewhere.
 */
export const SCHOOLS_FIELDS: FieldMeta[] = [
  { key: "name",        label: "Name",         hideable: false, defaultVisible: true  },
  { key: "school_type", label: "Type",         hideable: true,  defaultVisible: true  },
  { key: "city",        label: "City / Block", hideable: true,  defaultVisible: true  },
  { key: "district",    label: "District",     hideable: true,  defaultVisible: true  },
  { key: "state",       label: "State",        hideable: true,  defaultVisible: true  },
  { key: "street",      label: "Street",       hideable: true,  defaultVisible: false },
  { key: "pincode",     label: "Pincode",      hideable: true,  defaultVisible: false },
];

export const SCHOOLS_FIELD_KEYS = SCHOOLS_FIELDS.map((f) => f.key) as readonly string[];

if (new Set(SCHOOLS_FIELD_KEYS).size !== SCHOOLS_FIELD_KEYS.length) {
  throw new Error("SCHOOLS_FIELDS keys must be unique");
}

/** Look up a Schools registry field by key. Throws (and warns in DEV) if missing. */
export function schoolField(key: string): FieldMeta {
  const meta = SCHOOLS_FIELDS.find((f) => f.key === key);
  if (!meta) {
    const msg = `Unknown school field key: ${key}`;
    if (import.meta.env.DEV) {
      console.error(msg);
    }
    throw new Error(msg);
  }
  return meta;
}

/** Registry label for a form field key; appends " *" when required. */
export function schoolFieldLabel(key: string, opts?: { required?: boolean }): string {
  const label = schoolField(key).label;
  return opts?.required ? `${label} *` : label;
}
