import type { StudentExamCreate } from "../api/admissions";
import { ADMISSION_DRAFTS_STORE, ADMISSION_OUTBOX_STORE } from "./offlineDbCore";
import { createOutboxApi } from "./entityOutbox";

export const ADMISSION_OFFLINE_CHANGED = "admission-offline-changed";

export type AdmissionOfflineDraft = {
  localId: string;
  student_id: number;
  school_start_year: number;
  student_label: string;
  kutir_id: number | null;
  createdAt: string;
};

export type PendingAdmissionRecord = {
  localId: string;
  payload: StudentExamCreate;
  createdAt: string;
  lastError?: string;
  student_label?: string;
  kutir_id?: number | null;
};

const api = createOutboxApi<StudentExamCreate>(
  ADMISSION_OUTBOX_STORE,
  ADMISSION_DRAFTS_STORE,
  ADMISSION_OFFLINE_CHANGED,
);

export const {
  enqueuePending: enqueuePendingAdmission,
  countPending: countPendingAdmissions,
  removePending: removePendingAdmission,
  updatePendingError: updatePendingAdmissionError,
  removeDraft: removeAdmissionDraft,
  purgeExpiredDrafts: purgeExpiredAdmissionDrafts,
} = api;

export async function listPendingAdmissions(): Promise<PendingAdmissionRecord[]> {
  return api.listPending() as Promise<PendingAdmissionRecord[]>;
}

export async function listAdmissionDrafts(): Promise<AdmissionOfflineDraft[]> {
  return api.listDrafts<AdmissionOfflineDraft>();
}

export async function getAdmissionDraft(localId: string): Promise<AdmissionOfflineDraft | null> {
  return api.getDraft<AdmissionOfflineDraft>(localId);
}

export async function enqueuePendingAdmissionWithMeta(
  payload: StudentExamCreate,
  meta: { student_label: string; kutir_id: number | null },
): Promise<string> {
  const localId = crypto.randomUUID();
  const record: PendingAdmissionRecord = {
    localId,
    payload,
    createdAt: new Date().toISOString(),
    ...meta,
  };
  const { openDb, txDone } = await import("./offlineDbCore");
  const db = await openDb();
  const tx = db.transaction(ADMISSION_OUTBOX_STORE, "readwrite");
  tx.objectStore(ADMISSION_OUTBOX_STORE).put(record);
  await txDone(tx);
  db.close();
  window.dispatchEvent(new Event(ADMISSION_OFFLINE_CHANGED));
  return localId;
}

export async function saveAdmissionDraft(
  student_id: number,
  school_start_year: number,
  student_label: string,
  kutir_id: number | null,
): Promise<string> {
  const localId = crypto.randomUUID();
  const draft: AdmissionOfflineDraft = {
    localId,
    student_id,
    school_start_year,
    student_label,
    kutir_id,
    createdAt: new Date().toISOString(),
  };
  await api.saveDraft(draft);
  return localId;
}
