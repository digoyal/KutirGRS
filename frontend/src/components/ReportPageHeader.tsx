import type { ReactNode } from "react";
import { styles } from "@parivaar/ui";
import { ReportHubBackLink } from "./ReportHubBackLink";

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconPrint = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

/** Hub report pages: back link, title, and optional actions in one compact block. */
export function ReportPageHeader({ title, actions }: { title: ReactNode; actions?: ReactNode }) {
  return (
    <header className="grs-report-page-header">
      <div className="grs-report-page-header-main">
        <ReportHubBackLink />
        <h2 className="grs-page-title grs-report-page-title">{title}</h2>
        {actions ? <div className="grs-report-page-actions">{actions}</div> : null}
      </div>
    </header>
  );
}

export function ReportCsvPrintActions({
  disabled,
  onExport,
  onPrint,
}: {
  disabled?: boolean;
  onExport: () => void;
  onPrint: () => void;
}) {
  const btnStyle = {
    ...styles.btnIcon,
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? ("not-allowed" as const) : ("pointer" as const),
  };
  return (
    <>
      <button type="button" onClick={onExport} style={btnStyle} title="Export CSV" disabled={disabled}>
        <IconDownload />
      </button>
      <button type="button" onClick={onPrint} style={btnStyle} title="Print" disabled={disabled}>
        <IconPrint />
      </button>
    </>
  );
}
