/** FastAPI / axios error bodies: detail may be a string or validation error array. */
export function apiErrorDetail(err: unknown, fallback = "Save failed."): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const msg = detail
      .map((d) => (d as { msg?: string })?.msg)
      .filter(Boolean)
      .join(" ");
    if (msg) return msg;
  }
  return fallback;
}
