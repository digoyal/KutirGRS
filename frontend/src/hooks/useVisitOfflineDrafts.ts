import { useCallback, useEffect, useState } from "react";
import {
  listVisitDrafts,
  purgeExpiredVisitDrafts,
  VISIT_OFFLINE_CHANGED,
} from "../offline/visitOfflineDb";
import type { VisitOfflineDraft } from "../offline/visitDraftTypes";

export function useVisitOfflineDrafts(): VisitOfflineDraft[] {
  const [drafts, setDrafts] = useState<VisitOfflineDraft[]>([]);

  const refresh = useCallback(async () => {
    await purgeExpiredVisitDrafts();
    setDrafts(await listVisitDrafts());
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener(VISIT_OFFLINE_CHANGED, refresh);
    return () => window.removeEventListener(VISIT_OFFLINE_CHANGED, refresh);
  }, [refresh]);

  return drafts;
}
