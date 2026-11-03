import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { syncPendingVisits } from "../offline/visitOfflineSync";
import { syncPendingAdmissions } from "../offline/admissionOfflineSync";
import { syncPendingProgress } from "../offline/progressOfflineSync";

/** Sync all offline outboxes when online on load and when connectivity returns. */
export function GrsOfflineSyncMount() {
  const qc = useQueryClient();

  useEffect(() => {
    const run = () => {
      if (!navigator.onLine) return;
      void Promise.all([
        syncPendingVisits(),
        syncPendingAdmissions(),
        syncPendingProgress(),
      ]).then(([visits, admissions, progress]) => {
        if (visits.synced > 0) qc.invalidateQueries({ queryKey: ["visits"] });
        if (admissions.synced > 0) qc.invalidateQueries({ queryKey: ["student-exams"] });
        if (progress.synced > 0) qc.invalidateQueries({ queryKey: ["progress"] });
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
