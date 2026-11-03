import type { StudentProgress } from "../api/admissions";
import type { PendingProgressRecord, ProgressOfflineDraft } from "./progressOfflineDb";

export type OfflineProgressDraftListItem = ProgressOfflineDraft & { kind: "offline-draft" };
export type OfflineProgressPendingListItem = PendingProgressRecord & { kind: "offline-pending" };

export type ProgressTableRow =
  | StudentProgress
  | OfflineProgressDraftListItem
  | OfflineProgressPendingListItem;

export function isOfflineProgressDraft(row: ProgressTableRow): row is OfflineProgressDraftListItem {
  return "kind" in row && row.kind === "offline-draft";
}

export function isOfflineProgressPending(row: ProgressTableRow): row is OfflineProgressPendingListItem {
  return "kind" in row && row.kind === "offline-pending";
}

export function isOfflineLocalProgress(
  row: ProgressTableRow,
): row is OfflineProgressDraftListItem | OfflineProgressPendingListItem {
  return isOfflineProgressDraft(row) || isOfflineProgressPending(row);
}

export function offlineProgressDraftRowKey(row: OfflineProgressDraftListItem): string {
  return `progress-draft-${row.localId}`;
}

export function offlineProgressPendingRowKey(row: OfflineProgressPendingListItem): string {
  return `progress-pending-${row.localId}`;
}

export function pendingProgressToListItem(row: PendingProgressRecord): OfflineProgressPendingListItem {
  return { ...row, kind: "offline-pending" };
}
