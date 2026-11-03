import type { StudentCreate } from "../api/students";
import { STUDENT_DRAFTS_STORE, STUDENT_OUTBOX_STORE } from "./offlineDbCore";
import { createOutboxApi } from "./entityOutbox";

export const STUDENT_OFFLINE_CHANGED = "student-offline-changed";

export type StudentOfflineDraft = {
  localId: string;
  kutir_id: number;
  first_name: string;
  last_name: string;
  createdAt: string;
};

export type PendingStudentRecord = {
  localId: string;
  payload: StudentCreate;
  createdAt: string;
  lastError?: string;
};

const api = createOutboxApi<StudentCreate>(
  STUDENT_OUTBOX_STORE,
  STUDENT_DRAFTS_STORE,
  STUDENT_OFFLINE_CHANGED,
);

export const {
  enqueuePending: enqueuePendingStudent,
  countPending: countPendingStudents,
  removePending: removePendingStudent,
  updatePendingError: updatePendingStudentError,
  removeDraft: removeStudentDraft,
  purgeExpiredDrafts: purgeExpiredStudentDrafts,
} = api;

export async function listPendingStudents(): Promise<PendingStudentRecord[]> {
  return api.listPending() as Promise<PendingStudentRecord[]>;
}

export async function listStudentDrafts(): Promise<StudentOfflineDraft[]> {
  return api.listDrafts<StudentOfflineDraft>();
}

export async function getStudentDraft(localId: string): Promise<StudentOfflineDraft | null> {
  return api.getDraft<StudentOfflineDraft>(localId);
}

export async function saveStudentDraft(
  kutir_id: number,
  first_name: string,
  last_name: string,
): Promise<string> {
  const localId = crypto.randomUUID();
  const draft: StudentOfflineDraft = {
    localId,
    kutir_id,
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    createdAt: new Date().toISOString(),
  };
  await api.saveDraft(draft);
  return localId;
}
