import type { KutirVisit } from "../api/visits";
import type { PendingVisitRecord } from "./visitOfflineDb";

export const VISIT_DRAFT_TTL_DAYS = 7;

export type VisitOfflineDraft = {
  localId: string;
  kutir_id: number;
  visit_date: string;
  createdAt: string;
};

export type OfflineVisitDraftListItem = VisitOfflineDraft & {
  kind: "offline-draft";
};

/** Full visit form queued for upload when back online. */
export type OfflineVisitPendingListItem = PendingVisitRecord & {
  kind: "offline-pending";
  kutir_id: number;
  visit_date: string;
};

export type VisitTableRow = KutirVisit | OfflineVisitDraftListItem | OfflineVisitPendingListItem;

export function isOfflineVisitDraft(row: VisitTableRow): row is OfflineVisitDraftListItem {
  return "kind" in row && row.kind === "offline-draft";
}

export function isOfflineVisitPending(row: VisitTableRow): row is OfflineVisitPendingListItem {
  return "kind" in row && row.kind === "offline-pending";
}

export function isOfflineLocalVisit(row: VisitTableRow): row is OfflineVisitDraftListItem | OfflineVisitPendingListItem {
  return isOfflineVisitDraft(row) || isOfflineVisitPending(row);
}

export function offlineDraftRowKey(row: OfflineVisitDraftListItem): string {
  return `draft-${row.localId}`;
}

export function offlinePendingRowKey(row: OfflineVisitPendingListItem): string {
  return `pending-${row.localId}`;
}

export function pendingRecordToListItem(row: PendingVisitRecord): OfflineVisitPendingListItem {
  return {
    ...row,
    kind: "offline-pending",
    kutir_id: row.payload.kutir_id,
    visit_date: row.payload.visit_date,
  };
}
