import type { Student } from "../api/students";
import type { PendingStudentRecord, StudentOfflineDraft } from "./studentOfflineDb";

export type OfflineStudentDraftListItem = StudentOfflineDraft & { kind: "offline-draft" };
export type OfflineStudentPendingListItem = PendingStudentRecord & {
  kind: "offline-pending";
};

export type StudentTableRow = Student | OfflineStudentDraftListItem | OfflineStudentPendingListItem;

export function isOfflineStudentDraft(row: StudentTableRow): row is OfflineStudentDraftListItem {
  return "kind" in row && row.kind === "offline-draft";
}

export function isOfflineStudentPending(row: StudentTableRow): row is OfflineStudentPendingListItem {
  return "kind" in row && row.kind === "offline-pending";
}

export function isOfflineLocalStudent(row: StudentTableRow): row is OfflineStudentDraftListItem | OfflineStudentPendingListItem {
  return isOfflineStudentDraft(row) || isOfflineStudentPending(row);
}

export function offlineStudentDraftRowKey(row: OfflineStudentDraftListItem): string {
  return `student-draft-${row.localId}`;
}

export function offlineStudentPendingRowKey(row: OfflineStudentPendingListItem): string {
  return `student-pending-${row.localId}`;
}

export function pendingStudentToListItem(row: PendingStudentRecord): OfflineStudentPendingListItem {
  return { ...row, kind: "offline-pending" };
}

export function studentOfflineDisplayName(
  row: OfflineStudentDraftListItem | OfflineStudentPendingListItem,
): string {
  if (isOfflineStudentPending(row)) {
    return `${row.payload.first_name} ${row.payload.last_name}`.trim();
  }
  return `${row.first_name} ${row.last_name}`.trim();
}
