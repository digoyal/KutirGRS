import type { FieldConfigEntry, FieldMeta } from "../hooks/useFieldConfig";

/**
 * Single source of truth for Progress list columns, Column Config, CSV export,
 * and form field labels (Add/Edit/View) for keys that appear on the form.
 * StudentProgressPage, FieldConfigPage, export, and ProgressForm must use this
 * array for those concerns — do not duplicate keys/labels elsewhere.
 * List-only keys (form: false) stay off the hand-built form layout.
 */
export const PROGRESS_FIELDS: FieldMeta[] = [
  { key: "student",                  label: "Student", hideable: false, defaultVisible: true  },
  { key: "academic_year",            label: "Year",    hideable: true,  defaultVisible: false },
  { key: "class_in_year",            label: "Class",   hideable: true,  defaultVisible: true  },
  { key: "marks_6",                  label: "6th",     hideable: true,  defaultVisible: false, form: false },
  { key: "marks_7",                  label: "7th",     hideable: true,  defaultVisible: false, form: false },
  { key: "marks_8",                  label: "8th",     hideable: true,  defaultVisible: false, form: false },
  { key: "marks_9",                  label: "9th",     hideable: true,  defaultVisible: false, form: false },
  { key: "marks_10",                 label: "10th",    hideable: true,  defaultVisible: false, form: false },
  { key: "marks_11",                 label: "11th",    hideable: true,  defaultVisible: false, form: false },
  { key: "marks_12",                 label: "12th",    hideable: true,  defaultVisible: false, form: false },
  { key: "school_id",                label: "School",  hideable: true,  defaultVisible: true  },
  { key: "status",                   label: "Status",  hideable: false, defaultVisible: true  },
  { key: "remarks",                  label: "Remarks", hideable: true,  defaultVisible: false },
];

export const PROGRESS_FIELD_KEYS = PROGRESS_FIELDS.map((f) => f.key) as readonly string[];

const MARKS_KEY_PREFIX = "marks_";

/** Class marks columns (6th–12th) in registry order. */
export const PROGRESS_MARKS_FIELDS: FieldMeta[] = PROGRESS_FIELDS.filter((f) =>
  f.key.startsWith(MARKS_KEY_PREFIX),
);

export function isProgressMarksKey(key: string): boolean {
  return key.startsWith(MARKS_KEY_PREFIX);
}

/**
 * Keep marks_6…marks_12 as one contiguous block (registry order). Non-marks fields
 * keep their relative order; the block is placed where the first marks column was.
 */
export function coalesceProgressMarksOrder(ordered: FieldMeta[]): FieldMeta[] {
  if (PROGRESS_MARKS_FIELDS.length === 0) return ordered;

  const marksKeys = new Set(PROGRESS_MARKS_FIELDS.map((f) => f.key));
  const firstMarkIdx = ordered.findIndex((m) => marksKeys.has(m.key));
  if (firstMarkIdx === -1) return ordered;

  const withoutMarks = ordered.filter((m) => !marksKeys.has(m.key));
  const insertAt = ordered.slice(0, firstMarkIdx).filter((m) => !marksKeys.has(m.key)).length;

  const result = [...withoutMarks];
  result.splice(insertAt, 0, ...PROGRESS_MARKS_FIELDS);
  return result;
}

function progressFieldOrderEqual(a: FieldMeta[], b: FieldMeta[]): boolean {
  return a.length === b.length && a.every((m, i) => m.key === b[i]?.key);
}

/** Rewrite saved positions when legacy config interleaves Status/Remarks into marks. */
export function normalizeProgressSavedConfig(
  saved: Record<string, FieldConfigEntry>,
  allFields: FieldMeta[] = PROGRESS_FIELDS,
): Record<string, FieldConfigEntry> | null {
  const sortBySaved = (fields: FieldMeta[]) =>
    [...fields].sort((a, b) => {
      const pa = saved[a.key]?.position ?? allFields.indexOf(a);
      const pb = saved[b.key]?.position ?? allFields.indexOf(b);
      return pa - pb;
    });

  const raw = sortBySaved(allFields);
  const coalesced = coalesceProgressMarksOrder(raw);
  if (progressFieldOrderEqual(raw, coalesced)) return null;

  const next: Record<string, FieldConfigEntry> = { ...saved };
  coalesced.forEach((m, i) => {
    const prev = saved[m.key];
    const visible =
      prev?.visible ??
      (m.hideable ? m.defaultVisible : true);
    next[m.key] = { key: m.key, visible, position: i };
  });
  return next;
}

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
