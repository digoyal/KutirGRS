import type { ProgressStatus } from "../api/admissions";

export const PROGRESS_STATUSES: ProgressStatus[] = [
  "enrolled",
  "transferred",
  "dropped_out",
  "graduated",
  "admitted_to_college",
];

/** Short labels for badges, table cells, and summary tiles. */
export const STATUS_LABELS: Record<ProgressStatus, string> = {
  enrolled: "Enrolled",
  transferred: "Transferred",
  dropped_out: "Dropped out",
  graduated: "Graduated",
  admitted_to_college: "Admitted to College",
};

/** Longer labels for the status `<select>` on add/edit forms. */
export const STATUS_OPTIONS: { value: ProgressStatus; label: string }[] = [
  { value: "enrolled", label: "Enrolled" },
  { value: "transferred", label: "Transferred to a different school" },
  { value: "dropped_out", label: "Dropped out" },
  { value: "graduated", label: "Graduated" },
  { value: "admitted_to_college", label: "Admitted to College" },
];

export const STATUS_BADGES: Record<
  ProgressStatus,
  { bg: string; fg: string; prefix: string }
> = {
  enrolled: { bg: "var(--status-success-bg)", fg: "var(--status-success-fg)", prefix: "✓ " },
  transferred: { bg: "var(--badge-blue-bg)", fg: "var(--badge-blue-fg)", prefix: "→ " },
  dropped_out: { bg: "var(--status-danger-bg)", fg: "var(--status-danger-fg)", prefix: "" },
  graduated: {
    bg: "var(--badge-green-bg, #d1fae5)",
    fg: "var(--badge-green-fg, #065f46)",
    prefix: "🎓 ",
  },
  admitted_to_college: {
    bg: "var(--badge-teal-bg)",
    fg: "var(--badge-teal-fg)",
    prefix: "🏛 ",
  },
};

/** Summary tile colors on the progress list page. */
export const STATUS_TILES: Record<
  ProgressStatus,
  { bg: string; border: string; fg: string }
> = {
  enrolled: {
    bg: "var(--status-success-bg)",
    border: "var(--status-success-fg)",
    fg: "var(--status-success-fg)",
  },
  transferred: {
    bg: "var(--badge-blue-bg)",
    border: "var(--badge-blue-fg)",
    fg: "var(--badge-blue-fg)",
  },
  dropped_out: {
    bg: "var(--status-danger-bg)",
    border: "var(--badge-red-fg)",
    fg: "var(--status-danger-fg)",
  },
  graduated: {
    bg: "var(--badge-green-bg, #d1fae5)",
    border: "var(--badge-green-fg, #065f46)",
    fg: "var(--badge-green-fg, #065f46)",
  },
  admitted_to_college: {
    bg: "var(--badge-teal-bg)",
    border: "var(--badge-teal-fg)",
    fg: "var(--badge-teal-fg)",
  },
};
