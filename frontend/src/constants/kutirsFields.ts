import type { FieldMeta } from "../hooks/useFieldConfig";

/**
 * Single source of truth for Kutirs list columns, Column Config, CSV export,
 * and form field labels (Add/Edit/View) for keys that appear on the form.
 * KutirsPage, FieldConfigPage, export, and KutirForm must use this array
 * for those concerns — do not duplicate keys/labels elsewhere.
 * List-only keys (form: false) stay off the hand-built form layout.
 */
export const KUTIRS_FIELDS: FieldMeta[] = [
  { key: "name",           label: "Name",        hideable: false, defaultVisible: true  },
  { key: "kutir_type",     label: "Type",        hideable: true,  defaultVisible: true  },
  { key: "cluster_id",     label: "Cluster",     hideable: true,  defaultVisible: false },
  { key: "street",         label: "Street",      hideable: true,  defaultVisible: false, form: false },
  { key: "state",          label: "State",       hideable: true,  defaultVisible: false },
  { key: "pincode",        label: "Pincode",     hideable: true,  defaultVisible: false, form: false },
  { key: "donor_id",       label: "Donor",       hideable: true,  defaultVisible: false },
  { key: "enrollment_5th", label: "5th Enrollment", formLabel: "5th Class", hideable: true, defaultVisible: true },
  { key: "enrollment_8th", label: "8th Enrollment", formLabel: "8th Class", hideable: true, defaultVisible: true },
  { key: "teachers",       label: "Teachers",    hideable: true,  defaultVisible: false, form: false },
];

export const KUTIRS_FIELD_KEYS = KUTIRS_FIELDS.map((f) => f.key) as readonly string[];

if (new Set(KUTIRS_FIELD_KEYS).size !== KUTIRS_FIELD_KEYS.length) {
  throw new Error("KUTIRS_FIELDS keys must be unique");
}

/** Look up a Kutirs registry field by key. Throws (and warns in DEV) if missing. */
export function kutirField(key: string): FieldMeta {
  const meta = KUTIRS_FIELDS.find((f) => f.key === key);
  if (!meta) {
    const msg = `Unknown kutir field key: ${key}`;
    if (import.meta.env.DEV) {
      console.error(msg);
    }
    throw new Error(msg);
  }
  return meta;
}

/** Form label: `formLabel ?? label`; appends " *" when required. List/export use `label`. */
export function kutirFieldLabel(key: string, opts?: { required?: boolean }): string {
  const meta = kutirField(key);
  const label = meta.formLabel ?? meta.label;
  return opts?.required ? `${label} *` : label;
}
