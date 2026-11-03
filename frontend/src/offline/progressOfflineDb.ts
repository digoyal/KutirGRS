import type { StudentProgressCreate } from "../api/admissions";
import { PROGRESS_DRAFTS_STORE, PROGRESS_OUTBOX_STORE } from "./offlineDbCore";
import { createOutboxApi } from "./entityOutbox";

export const PROGRESS_OFFLINE_CHANGED = "progress-offline-changed";

export type ProgressOfflineDraft = {
  localId: string;
  student_id: number;
  school_id: number;
  academic_year: number;
  student_label: string;
  school_name: string;
  kutir_id: number | null;
  createdAt: string;
};

export type PendingProgressRecord = {
  localId: string;
  payload: StudentProgressCreate;
  createdAt: string;
  lastError?: string;
  student_label?: string;
  school_name?: string;
  kutir_id?: number | null;
};

const api = createOutboxApi<StudentProgressCreate>(
  PROGRESS_OUTBOX_STORE,
  PROGRESS_DRAFTS_STORE,
  PROGRESS_OFFLINE_CHANGED,
);

export const {
  enqueuePending: enqueuePendingProgress,
  countPending: countPendingProgress,
  removePending: removePendingProgress,
  updatePendingError: updatePendingProgressError,
  removeDraft: removeProgressDraft,
  purgeExpiredDrafts: purgeExpiredProgressDrafts,
} = api;

export async function listPendingProgress(): Promise<PendingProgressRecord[]> {
  return api.listPending() as Promise<PendingProgressRecord[]>;
}

export async function listProgressDrafts(): Promise<ProgressOfflineDraft[]> {
  return api.listDrafts<ProgressOfflineDraft>();
}

export async function getProgressDraft(localId: string): Promise<ProgressOfflineDraft | null> {
  return api.getDraft<ProgressOfflineDraft>(localId);
}

export async function enqueuePendingProgressWithMeta(
  payload: StudentProgressCreate,
  meta: { student_label: string; school_name: string; kutir_id: number | null },
): Promise<string> {
  const localId = crypto.randomUUID();
  const record: PendingProgressRecord = {
    localId,
    payload,
    createdAt: new Date().toISOString(),
    ...meta,
  };
  const { openDb, txDone } = await import("./offlineDbCore");
  const db = await openDb();
  const tx = db.transaction(PROGRESS_OUTBOX_STORE, "readwrite");
  tx.objectStore(PROGRESS_OUTBOX_STORE).put(record);
  await txDone(tx);
  db.close();
  window.dispatchEvent(new Event(PROGRESS_OFFLINE_CHANGED));
  return localId;
}

export async function saveProgressDraft(
  student_id: number,
  school_id: number,
  academic_year: number,
  student_label: string,
  school_name: string,
  kutir_id: number | null,
): Promise<string> {
  const localId = crypto.randomUUID();
  const draft: ProgressOfflineDraft = {
    localId,
    student_id,
    school_id,
    academic_year,
    student_label,
    school_name,
    kutir_id,
    createdAt: new Date().toISOString(),
  };
  await api.saveDraft(draft);
  return localId;
}
