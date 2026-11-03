import type { ReactNode } from "react";

export function offlineRowBadge(label: string, fg = "var(--badge-blue-fg)", bg = "var(--badge-blue-bg)") {
  return (
    <span
      style={{
        marginLeft: 8,
        fontSize: "0.72rem",
        fontWeight: 600,
        background: bg,
        color: fg,
        borderRadius: 4,
        padding: "2px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export function offlineSyncBadge(kind: "draft" | "pending"): ReactNode {
  if (kind === "pending") {
    return offlineRowBadge("Waiting to sync", "var(--status-warn-fg)", "var(--status-warn-bg)");
  }
  return offlineRowBadge("Saved for offline");
}

export const offlineDraftPlaceholder = (
  <span style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>—</span>
);
