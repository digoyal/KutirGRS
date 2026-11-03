import { createStudent } from "../api/students";
import {
  listPendingStudents,
  removePendingStudent,
  updatePendingStudentError,
  STUDENT_OFFLINE_CHANGED,
} from "./studentOfflineDb";
import { isNetworkError } from "./networkError";

export type EntitySyncResult = { synced: number; failed: number; remaining: number };

let syncing = false;

export async function syncPendingStudents(): Promise<EntitySyncResult> {
  if (!navigator.onLine || syncing) {
    const pending = await listPendingStudents();
    return { synced: 0, failed: 0, remaining: pending.length };
  }
  syncing = true;
  let synced = 0;
  let failed = 0;
  try {
    const pending = await listPendingStudents();
    for (const row of pending) {
      try {
        await createStudent(row.payload);
        await removePendingStudent(row.localId);
        synced += 1;
      } catch (err) {
        if (isNetworkError(err)) break;
        failed += 1;
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          (err instanceof Error ? err.message : "Sync failed");
        await updatePendingStudentError(row.localId, String(detail));
      }
    }
  } finally {
    syncing = false;
    window.dispatchEvent(new Event(STUDENT_OFFLINE_CHANGED));
  }
  const remaining = (await listPendingStudents()).length;
  return { synced, failed, remaining };
}
