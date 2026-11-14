import axios from "axios";

type ValidationErr = { msg?: string; loc?: (string | number)[] };

/** FastAPI / axios error bodies: detail may be a string or validation error array. */
export function apiErrorDetail(err: unknown, fallback = "Save failed."): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    const detail = data && typeof data === "object" && "detail" in data
      ? (data as { detail?: unknown }).detail
      : undefined;
    const parsed = parseFastApiDetail(detail);
    if (parsed) return parsed;
    if (typeof data === "string" && data.trim()) return data.trim();
    const status = err.response?.status;
    if (status) return `${fallback} (HTTP ${status})`;
  }
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  const parsed = parseFastApiDetail(detail);
  if (parsed) return parsed;
  return fallback;
}

function parseFastApiDetail(detail: unknown): string | null {
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  if (Array.isArray(detail)) {
    const parts = (detail as ValidationErr[])
      .map((d) => {
        const msg = d?.msg?.trim();
        if (!msg) return "";
        const loc = d.loc?.filter((x) => x !== "body").join(".");
        return loc ? `${loc}: ${msg}` : msg;
      })
      .filter(Boolean);
    if (parts.length) return parts.join(" ");
  }
  return null;
}