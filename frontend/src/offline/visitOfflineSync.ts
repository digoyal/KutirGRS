import { createVisit, uploadVisitPhoto } from "../api/visits";
import {
  listPendingVisits,
  removePendingVisit,
  updatePendingVisitError,
  VISIT_OFFLINE_CHANGED,
} from "./visitOfflineDb";
import { isNetworkError } from "./networkError";

export type VisitSyncResult = {
  synced: number;
  failed: number;
  remaining: number;
};

let syncing = false;

export async function syncPendingVisits(): Promise<VisitSyncResult> {
  if (!navigator.onLine || syncing) {
    const pending = await listPendingVisits();
    return { synced: 0, failed: 0, remaining: pending.length };
  }
  syncing = true;
  let synced = 0;
  let failed = 0;
  try {
    const pending = await listPendingVisits();
    for (const row of pending) {
      try {
        const saved = await createVisit(row.payload);
        if (row.photoBlob) {
          if (row.photoLatitude == null || row.photoLongitude == null) {
            await updatePendingVisitError(
              row.localId,
              "Visit photo requires device location — re-open the visit, re-attach the photo with GPS enabled, and sync again.",
            );
            failed += 1;
            continue;
          }
          const file = new File([row.photoBlob], row.photoName || "visit-photo.jpg", {
            type: row.photoType || row.photoBlob.type || "image/jpeg",
          });
          await uploadVisitPhoto(saved.id, file, {
            latitude: row.photoLatitude,
            longitude: row.photoLongitude,
            accuracyM: row.photoAccuracyM ?? null,
          });
        }
        await removePendingVisit(row.localId);
        synced += 1;
      } catch (err) {
        if (isNetworkError(err)) break;
        failed += 1;
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          (err instanceof Error ? err.message : "Sync failed");
        await updatePendingVisitError(row.localId, String(detail));
      }
    }
  } finally {
    syncing = false;
    window.dispatchEvent(new Event(VISIT_OFFLINE_CHANGED));
  }
  const remaining = (await listPendingVisits()).length;
  return { synced, failed, remaining };
}
