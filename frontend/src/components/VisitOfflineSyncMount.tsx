import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { syncPendingVisits } from "../offline/visitOfflineSync";

/** Runs pending visit sync when the app loads online and when connectivity returns. */
export function VisitOfflineSyncMount() {
  const qc = useQueryClient();

  useEffect(() => {
    const run = () => {
      if (!navigator.onLine) return;
      void syncPendingVisits().then(({ synced }) => {
        if (synced > 0) {
          qc.invalidateQueries({ queryKey: ["visits"] });
        }
      });
    };
    run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, [qc]);

  return null;
}
