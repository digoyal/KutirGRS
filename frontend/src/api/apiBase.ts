/** Dev default: same-origin `/api/v1` via Vite proxy (Mac localhost + phone on LAN :5173). */
export function apiV1Base(): string {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV) return "/api/v1";
  return "http://localhost:8001/api/v1";
}

export function mediaBase(): string {
  return apiV1Base().replace(/\/api\/v1\/?$/, "") || "";
}
