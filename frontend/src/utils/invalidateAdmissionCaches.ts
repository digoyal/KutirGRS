import type { QueryClient } from "@tanstack/react-query";

/** Keep Admissions list, Bulk Progress, and Progress list in sync after admit changes. */
export function invalidateAdmissionCaches(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ["student-exams"] });
  void qc.invalidateQueries({ queryKey: ["exams", "admitted"] });
  void qc.invalidateQueries({ queryKey: ["progress"] });
}
