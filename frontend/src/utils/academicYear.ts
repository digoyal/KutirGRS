/** Display academic year from start-year integer (Progress convention): 2025 → "2025-26". */
export function formatAcademicYear(startYear: number): string {
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

/** Progress list year filter: empty string = all years (see single-record progress model). */
export type ProgressListYearFilter = number | "";

/** Default list filter — do not fix to calendar year; mark save advances each row's academic_year. */
export function defaultProgressListYearFilter(): ProgressListYearFilter {
  return "";
}

/** Progress list/add year filter options (start-year integers). Includes +1 so rows advanced by mark save stay selectable. */
export function progressFilterYearOptions(anchorYear = new Date().getFullYear()): number[] {
  return [anchorYear - 2, anchorYear - 1, anchorYear, anchorYear + 1];
}
