import { useCallback, useEffect, useState } from "react";
import { countPendingVisits, VISIT_OFFLINE_CHANGED } from "../offline/visitOfflineDb";

export function useVisitOfflinePendingCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    void countPendingVisits()
      .then(setCount)
      .catch(() => setCount(0));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(VISIT_OFFLINE_CHANGED, refresh);
    return () => window.removeEventListener(VISIT_OFFLINE_CHANGED, refresh);
  }, [refresh]);

  return count;
}
