import type { FieldMeta } from "../hooks/useFieldConfig";

/**
 * Single source of truth for Users list columns, Column Config, CSV export,
 * and form field labels (Add/Edit/View) for keys that appear on the form.
 * UsersPage, FieldConfigPage, export, UserForm, and UserDetailPage must use
 * this array for those concerns — do not duplicate keys/labels elsewhere.
 * List-only keys (form: false) stay off the hand-built form layout.
 */
export const USERS_FIELDS: FieldMeta[] = [
  { key: "username",  label: "Username", hideable: false, defaultVisible: true  },
  { key: "name",      label: "Name",     hideable: true,  defaultVisible: true,  form: false },
  { key: "title",     label: "Role",     hideable: true,  defaultVisible: true  },
  { key: "phone",     label: "Phone",    hideable: true,  defaultVisible: true  },
  { key: "is_active", label: "Status",   hideable: true,  defaultVisible: true  },
  { key: "email",     label: "Email",    hideable: true,  defaultVisible: true  },
];

export const USERS_FIELD_KEYS = USERS_FIELDS.map((f) => f.key) as readonly string[];

if (new Set(USERS_FIELD_KEYS).size !== USERS_FIELD_KEYS.length) {
  throw new Error("USERS_FIELDS keys must be unique");
}

/** Look up a Users registry field by key. Throws (and warns in DEV) if missing. */
export function userField(key: string): FieldMeta {
  const meta = USERS_FIELDS.find((f) => f.key === key);
  if (!meta) {
    const msg = `Unknown user field key: ${key}`;
    if (import.meta.env.DEV) {
      console.error(msg);
    }
    throw new Error(msg);
  }
  return meta;
}

/** Registry label for a form field key; appends " *" when required. */
export function userFieldLabel(key: string, opts?: { required?: boolean }): string {
  const label = userField(key).label;
  return opts?.required ? `${label} *` : label;
}
