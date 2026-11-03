import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { syncPendingVisits } from "../offline/visitOfflineSync";

/** Sync visit offline outbox when online on load and when connectivity returns. */
export function GrsOfflineSyncMount() {
  const qc = useQueryClient();

  useEffect(() => {
    const run = () => {
      if (!navigator.onLine) return;
      void syncPendingVisits().then(({ synced }) => {
        if (synced > 0) qc.invalidateQueries({ queryKey: ["visits"] });
      });
    };
    run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, [qc]);

  return null;
}

/** @deprecated use GrsOfflineSyncMount */
export function VisitOfflineSyncMount() {
  return <GrsOfflineSyncMount />;
}
