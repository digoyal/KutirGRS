/** Display academic year from start-year integer (Progress convention): 2025 → "2025-26". */
export function formatAcademicYear(startYear: number): string {
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}
