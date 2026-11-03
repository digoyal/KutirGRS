import { createExam } from "../api/admissions";
import {
  listPendingAdmissions,
  removePendingAdmission,
  updatePendingAdmissionError,
  ADMISSION_OFFLINE_CHANGED,
} from "./admissionOfflineDb";
import { isNetworkError } from "./networkError";

export type EntitySyncResult = { synced: number; failed: number; remaining: number };

let syncing = false;

export async function syncPendingAdmissions(): Promise<EntitySyncResult> {
  if (!navigator.onLine || syncing) {
    const pending = await listPendingAdmissions();
    return { synced: 0, failed: 0, remaining: pending.length };
  }
  syncing = true;
  let synced = 0;
  let failed = 0;
  try {
    const pending = await listPendingAdmissions();
    for (const row of pending) {
      try {
        await createExam(row.payload);
        await removePendingAdmission(row.localId);
        synced += 1;
      } catch (err) {
        if (isNetworkError(err)) break;
        failed += 1;
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          (err instanceof Error ? err.message : "Sync failed");
        await updatePendingAdmissionError(row.localId, String(detail));
      }
    }
  } finally {
    syncing = false;
    window.dispatchEvent(new Event(ADMISSION_OFFLINE_CHANGED));
  }
  const remaining = (await listPendingAdmissions()).length;
  return { synced, failed, remaining };
}
