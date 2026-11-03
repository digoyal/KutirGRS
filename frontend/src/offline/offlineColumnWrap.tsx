import type { ReactNode } from "react";
import type { Col } from "../components/GrsTable";
import { offlineDraftPlaceholder, offlineSyncBadge } from "./offlineUi";

type OfflineRow = { kind: "offline-draft" | "offline-pending" };

export function wrapColumnsForOffline<T extends OfflineRow, S>(
  columns: Col<S>[],
  isOffline: (row: T | S) => row is T,
  offlineRender: (row: T, key: string) => ReactNode | undefined,
): Col<T | S>[] {
  return columns.map((col) => ({
    ...col,
    render: col.render
      ? (row: T | S) => {
          if (isOffline(row)) {
            const custom = offlineRender(row, col.key);
            if (custom !== undefined) return custom;
            return offlineDraftPlaceholder;
          }
          return col.render!(row as S, 0);
        }
      : undefined,
    csvValue: col.csvValue
      ? (row: T | S) => {
          if (isOffline(row)) return "";
          return col.csvValue!(row as S);
        }
      : undefined,
    sortValue: col.sortValue
      ? (row: T | S) => {
          if (isOffline(row)) return "";
          return col.sortValue!(row as S);
        }
      : undefined,
  }));
}

export function offlineStudentNameCell(label: string, kind: "draft" | "pending") {
  return (
    <>
      <span style={{ fontWeight: 600 }}>{label}</span>
      {offlineSyncBadge(kind)}
    </>
  );
}
