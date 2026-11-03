import type { ProgressTrack } from "../api/admissions";

const SIX_TWELVE = [6, 7, 8, 9, 10, 11, 12] as const;
const NINE_TWELVE = [9, 10, 11, 12] as const;

export function classesForTrack(track: ProgressTrack): readonly number[] {
  return track === "nine_twelve" ? NINE_TWELVE : SIX_TWELVE;
}

export type MarkFieldKey =
  | "marks_6"
  | "marks_7"
  | "marks_8"
  | "marks_9"
  | "marks_10"
  | "marks_11"
  | "marks_12";

const MARK_FIELD_BY_CLASS: Record<number, MarkFieldKey> = {
  6: "marks_6",
  7: "marks_7",
  8: "marks_8",
  9: "marks_9",
  10: "marks_10",
  11: "marks_11",
  12: "marks_12",
};

export function markField(classNum: number): MarkFieldKey {
  return MARK_FIELD_BY_CLASS[classNum];
}

export type MarkFields = {
  marks_6?: number | null;
  marks_7?: number | null;
  marks_8?: number | null;
  marks_9?: number | null;
  marks_10?: number | null;
  marks_11?: number | null;
  marks_12?: number | null;
};

export function getMark(marks: MarkFields, classNum: number): number | null {
  const key = MARK_FIELD_BY_CLASS[classNum];
  if (!key) return null;
  const v = marks[key];
  return v == null ? null : v;
}

/** Mirrors backend enablement: entry class, then each next when previous mark is set. */
export function enabledMarkClasses(track: ProgressTrack, marks: MarkFields): number[] {
  const classes = classesForTrack(track);
  const enabled: number[] = [];
  for (let i = 0; i < classes.length; i++) {
    if (i === 0) {
      enabled.push(classes[i]);
      continue;
    }
    if (getMark(marks, classes[i - 1]) != null) {
      enabled.push(classes[i]);
    } else {
      break;
    }
  }
  return enabled;
}

export function currentClassMarkPct(
  marks: MarkFields,
  classInYear: number | null | undefined,
): number | null {
  if (classInYear == null) return null;
  return getMark(marks, classInYear);
}
