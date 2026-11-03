import type { StudentExam } from "../api/admissions";
import type { AdmissionOfflineDraft, PendingAdmissionRecord } from "./admissionOfflineDb";

export type OfflineAdmissionDraftListItem = AdmissionOfflineDraft & { kind: "offline-draft" };
export type OfflineAdmissionPendingListItem = PendingAdmissionRecord & { kind: "offline-pending" };

export type AdmissionTableRow =
  | StudentExam
  | OfflineAdmissionDraftListItem
  | OfflineAdmissionPendingListItem;

export function isOfflineAdmissionDraft(row: AdmissionTableRow): row is OfflineAdmissionDraftListItem {
  return "kind" in row && row.kind === "offline-draft";
}

export function isOfflineAdmissionPending(row: AdmissionTableRow): row is OfflineAdmissionPendingListItem {
  return "kind" in row && row.kind === "offline-pending";
}

export function isOfflineLocalAdmission(
  row: AdmissionTableRow,
): row is OfflineAdmissionDraftListItem | OfflineAdmissionPendingListItem {
  return isOfflineAdmissionDraft(row) || isOfflineAdmissionPending(row);
}

export function offlineAdmissionDraftRowKey(row: OfflineAdmissionDraftListItem): string {
  return `admission-draft-${row.localId}`;
}

export function offlineAdmissionPendingRowKey(row: OfflineAdmissionPendingListItem): string {
  return `admission-pending-${row.localId}`;
}

export function pendingAdmissionToListItem(row: PendingAdmissionRecord): OfflineAdmissionPendingListItem {
  return { ...row, kind: "offline-pending" };
}
