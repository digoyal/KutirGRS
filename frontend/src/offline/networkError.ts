import axios from "axios";

/** True when the request likely failed due to connectivity, not validation/auth. */
export function isNetworkError(err: unknown): boolean {
  if (!navigator.onLine) return true;
  if (axios.isAxiosError(err)) {
    if (!err.response) return true;
    const code = err.code;
    if (code === "ERR_NETWORK" || code === "ECONNABORTED") return true;
  }
  return false;
}
