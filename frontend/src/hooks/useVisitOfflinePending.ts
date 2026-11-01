import { useCallback, useEffect, useState } from "react";
import {
  listPendingVisits,
  type PendingVisitRecord,
  VISIT_OFFLINE_CHANGED,
} from "../offline/visitOfflineDb";

export function useVisitOfflinePending(): PendingVisitRecord[] {
  const [pending, setPending] = useState<PendingVisitRecord[]>([]);

  const refresh = useCallback(async () => {
    setPending(await listPendingVisits());
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener(VISIT_OFFLINE_CHANGED, refresh);
    return () => window.removeEventListener(VISIT_OFFLINE_CHANGED, refresh);
  }, [refresh]);

  return pending;
}
