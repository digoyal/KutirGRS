/** Single inventory of report routes for the hub and navigation. */

export type ReportLink = { path: string; label: string };

export type ReportSection = {
  id: string;
  title: string;
  reports: ReportLink[];
};

export const REPORT_SECTIONS: ReportSection[] = [
  {
    id: "admissions",
    title: "Admissions",
    reports: [
      { path: "/reports/admission-funnel", label: "Admission Funnel by Kutir" },
      { path: "/reports/admitted-students", label: "Admitted Students" },
    ],
  },
  {
    id: "kutir-visits",
    title: "Kutir visits",
    reports: [
      { path: "/reports/top-kutirs", label: "Top 10 Kutirs" },
      { path: "/reports/bottom-kutirs", label: "Bottom 10 Kutirs" },
      { path: "/reports/kutir-performance", label: "Kutir Performance" },
    ],
  },
];
