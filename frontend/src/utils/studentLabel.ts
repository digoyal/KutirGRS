/** Display label: "First Last (Father)" when father is set; else "First Last". */
export function studentLabel(
  s: {
    first_name?: string | null;
    last_name?: string | null;
    father_name?: string | null;
  } | null | undefined,
  fallback = "",
): string {
  if (!s) return fallback;
  const name = [s.first_name, s.last_name].filter(Boolean).join(" ").trim();
  if (!name) return fallback;
  const father = s.father_name?.trim();
  return father ? `${name} (${father})` : name;
}
