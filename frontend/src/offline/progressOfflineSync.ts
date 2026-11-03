import { createProgress } from "../api/admissions";
import {
  listPendingProgress,
  removePendingProgress,
  updatePendingProgressError,
  PROGRESS_OFFLINE_CHANGED,
} from "./progressOfflineDb";
import { isNetworkError } from "./networkError";

export type EntitySyncResult = { synced: number; failed: number; remaining: number };

let syncing = false;

export async function syncPendingProgress(): Promise<EntitySyncResult> {
  if (!navigator.onLine || syncing) {
    const pending = await listPendingProgress();
    return { synced: 0, failed: 0, remaining: pending.length };
  }
  syncing = true;
  let synced = 0;
  let failed = 0;
  try {
    const pending = await listPendingProgress();
    for (const row of pending) {
      try {
        await createProgress(row.payload);
        await removePendingProgress(row.localId);
        synced += 1;
      } catch (err) {
        if (isNetworkError(err)) break;
        failed += 1;
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          (err instanceof Error ? err.message : "Sync failed");
        await updatePendingProgressError(row.localId, String(detail));
      }
    }
  } finally {
    syncing = false;
    window.dispatchEvent(new Event(PROGRESS_OFFLINE_CHANGED));
  }
  const remaining = (await listPendingProgress()).length;
  return { synced, failed, remaining };
}
