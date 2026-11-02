/** Strip Excel/import float artifacts (e.g. 9303917463.0 → 9303917463). */
export function displayPhone(value: string | null | undefined): string {
  if (value == null) return "";
  const s = String(value).trim();
  if (!s) return "";
  const m = /^(\d+)\.0+$/.exec(s);
  return m ? m[1] : s;
}
