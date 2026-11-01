import { Navigate } from "react-router-dom";

/** Preserve old `/reports/summary` bookmarks (including legacy `?tab=visits`). */
export function LegacySummaryReportsRedirect() {
  return <Navigate to="/reports/admission-funnel" replace />;
}

export function LegacyDetailedReportsRedirect() {
  return <Navigate to="/reports/admitted-students" replace />;
}
