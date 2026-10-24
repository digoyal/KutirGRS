import { useEffect } from "react";

/**
 * After Column Settings → Apply → Back, FieldConfigPage navigates with `?_=<ts>`.
 * Also reloads when the page is restored from bfcache so column config is not stale.
 */
export function useBfcacheReload() {
  useEffect(() => {
    if (window.location.search.includes("_=")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
}
