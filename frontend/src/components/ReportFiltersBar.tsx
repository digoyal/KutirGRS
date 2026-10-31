import { useId, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Non-default selections; drives the mobile badge on the Filters toggle. */
  activeFilterCount?: number;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Report geo/date filter rows — same mobile “Filters” toggle as @parivaar/ui Table
 * (grs-filter-toggle / grs-fbar / grs-fbar--collapsed from table-shell.css).
 */
export function ReportFiltersBar({
  children,
  activeFilterCount = 0,
  className,
  style,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const fbarId = useId();

  return (
    <div className={`grs-report-filters${className ? ` ${className}` : ""}`} style={style}>
      <button
        type="button"
        className="grs-filter-toggle"
        aria-expanded={filtersOpen}
        aria-controls={fbarId}
        onClick={() => setFiltersOpen((o) => !o)}
      >
        <span className="grs-filter-toggle-label">
          Filters
          {activeFilterCount > 0 && (
            <span className="grs-filter-badge" aria-label={`${activeFilterCount} active`}>
              {activeFilterCount}
            </span>
          )}
        </span>
        <span className="grs-filter-chevron" aria-hidden="true">
          {filtersOpen ? "▲" : "▼"}
        </span>
      </button>
      <div
        id={fbarId}
        className={`grs-fbar grs-form${filtersOpen ? "" : " grs-fbar--collapsed"}`}
      >
        {children}
      </div>
    </div>
  );
}
