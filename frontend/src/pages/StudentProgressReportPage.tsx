import { useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ReportPageShell, RowCountBadge } from "@parivaar/ui";
import { listProgressPaged, type StudentProgress, type ProgressStatus } from "../api/admissions";
import { listStudentsPaged, type Student } from "../api/students";
import { ReportPageHeader } from "../components/ReportPageHeader";
import { progressField, progressFieldLabel } from "../constants/progressFields";
import { STATUS_BADGES, STATUS_LABELS } from "../constants/progressStatus";
import { countActiveFilters } from "../utils/geoFilters";
import { formatAcademicYear } from "../utils/academicYear";
import { progressJourneyRows } from "../utils/progressTrack";
import { studentLabel } from "../utils/studentLabel";

function formatMarkPct(m: number): string {
  const n = parseFloat(String(m));
  if (!Number.isFinite(n)) return "—";
  const rounded = Math.round(n * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}%`;
}

function classColumnLabel(classNum: number): string {
  const key = `marks_${classNum}` as const;
  try {
    return progressField(key).label;
  } catch {
    return String(classNum);
  }
}

function StatusCell({ status, show }: { status: ProgressStatus; show: boolean }) {
  if (!show) return <>—</>;
  const badge = STATUS_BADGES[status] ?? STATUS_BADGES.enrolled;
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: "0.8125rem",
        fontWeight: 600,
        background: badge.bg,
        color: badge.fg,
        whiteSpace: "nowrap",
      }}
    >
      {badge.prefix}
      {label}
    </span>
  );
}

function JourneyTable({ progress }: { progress: StudentProgress }) {
  const rows = useMemo(() => progressJourneyRows(progress), [progress]);
  const hdr: React.CSSProperties = {
    padding: "9px 12px",
    textAlign: "left",
    fontWeight: 600,
    color: "var(--badge-blue-fg)",
    borderBottom: "2px solid var(--badge-blue-bg)",
    whiteSpace: "nowrap",
  };
  const cell: React.CSSProperties = {
    padding: "9px 12px",
    borderBottom: "1px solid var(--border)",
    fontVariantNumeric: "tabular-nums",
  };

  return (
    <div style={{ overflowX: "auto", width: "100%" }}>
      <table style={{ width: "100%", minWidth: 360, borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr style={{ background: "var(--badge-blue-bg)" }}>
            <th style={hdr}>{progressFieldLabel("academic_year")}</th>
            <th style={hdr}>{progressFieldLabel("class_in_year")}</th>
            <th style={{ ...hdr, textAlign: "right" }}>Marks</th>
            <th style={hdr}>{progressFieldLabel("status")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.classNum}
              style={{
                background: row.isCurrentClass
                  ? "var(--status-success-bg)"
                  : i % 2 === 0
                    ? "var(--bg-card)"
                    : "var(--bg-input)",
              }}
            >
              <td style={cell}>{formatAcademicYear(row.academicYearStart)}</td>
              <td style={{ ...cell, fontWeight: row.isCurrentClass ? 700 : 400 }}>
                {classColumnLabel(row.classNum)}
              </td>
              <td style={{ ...cell, textAlign: "right" }}>
                {row.marksPct != null ? formatMarkPct(row.marksPct) : "—"}
              </td>
              <td style={cell}>
                <StatusCell status={progress.status} show={row.isCurrentClass} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const searchInputStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: "16px",
  width: "100%",
  boxSizing: "border-box",
  background: "var(--bg-input)",
  color: "var(--text-primary)",
};

export default function StudentProgressReportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(q), 300);
  }, []);

  const searchActive = debouncedSearch.trim().length >= 1;

  const {
    data: searchPage = { items: [], total: 0 },
    isLoading: searchLoading,
    error: searchError,
  } = useQuery({
    queryKey: ["report-student-progress-search", debouncedSearch],
    queryFn: () =>
      listStudentsPaged({
        search: debouncedSearch.trim(),
        limit: 25,
        offset: 0,
      }),
    enabled: searchActive && selectedStudent == null,
  });

  const {
    data: progressPage = { items: [], total: 0 },
    isLoading: progressLoading,
    error: progressError,
  } = useQuery({
    queryKey: ["report-student-progress", selectedStudent?.id],
    queryFn: () => listProgressPaged({ student_id: selectedStudent!.id, limit: 1 }),
    enabled: selectedStudent != null,
  });

  const progress = progressPage.items[0] ?? null;
  const journeyRows = progress ? progressJourneyRows(progress) : [];

  const isLoading = (searchActive && selectedStudent == null && searchLoading) || (selectedStudent != null && progressLoading);
  const error = searchError || progressError;

  const noSearchHits =
    searchActive && selectedStudent == null && !searchLoading && searchPage.total === 0;

  const noProgressRecord =
    selectedStudent != null && !progressLoading && !progressError && progress == null;

  const activeFilterCount = countActiveFilters(
    searchQuery.trim(),
    selectedStudent ? selectedStudent.id : "",
  );

  const filters = (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      <div>
        <label htmlFor="student-progress-report-search" style={{ display: "block", fontSize: "0.8125rem", marginBottom: 4 }}>
          Student name
        </label>
        <input
          id="student-progress-report-search"
          type="search"
          value={searchQuery}
          onChange={(e) => {
            handleSearch(e.target.value);
            if (selectedStudent) setSelectedStudent(null);
          }}
          placeholder="Search by name, phone, or father"
          style={searchInputStyle}
          autoComplete="off"
        />
      </div>
      {selectedStudent ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            fontSize: "0.875rem",
          }}
        >
          <span style={{ color: "var(--text-secondary)" }}>Selected:</span>
          <strong>{studentLabel(selectedStudent)}</strong>
          <Link to={`/students/${selectedStudent.id}`} style={{ color: "var(--badge-blue-fg)", fontSize: "0.8125rem" }}>
            View student
          </Link>
          {progress ? (
            <Link to={`/progress/${progress.id}`} style={{ color: "var(--badge-blue-fg)", fontSize: "0.8125rem" }}>
              View progress record
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setSelectedStudent(null);
            }}
            style={{
              marginLeft: "auto",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "4px 10px",
              background: "var(--bg-card)",
              cursor: "pointer",
              fontSize: "0.8125rem",
            }}
          >
            Clear
          </button>
        </div>
      ) : searchActive && searchPage.items.length > 0 ? (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            border: "1px solid var(--border)",
            borderRadius: 6,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {searchPage.items.map((s) => (
            <li key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(s);
                  setSearchQuery(studentLabel(s));
                  setDebouncedSearch("");
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  border: "none",
                  background: "var(--bg-card)",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                {studentLabel(s)}
              </button>
            </li>
          ))}
        </ul>
      ) : noSearchHits ? (
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          No students match &ldquo;{debouncedSearch.trim()}&rdquo;.
        </p>
      ) : null}
    </div>
  );

  let emptyMessage: string | undefined;
  if (noProgressRecord) {
    emptyMessage =
      "This student has no progress record yet. Progress is created when a student is admitted — check Admissions or the Progress list.";
  } else if (!selectedStudent && !searchActive) {
    emptyMessage = "Search for a student to view their class-by-year journey.";
  }

  return (
    <ReportPageShell
      header={<ReportPageHeader title="Student Progress" />}
      filters={filters}
      activeFilterCount={activeFilterCount}
      isLoading={!!isLoading}
      error={error ? "Could not load data. Try again." : undefined}
      isEmpty={!!(noProgressRecord || (!selectedStudent && !searchActive && !isLoading))}
      emptyMessage={emptyMessage}
      toolbar={
        selectedStudent && journeyRows.length > 0 ? (
          <div style={{ marginBottom: 8 }}>
            <RowCountBadge count={journeyRows.length} />
          </div>
        ) : undefined
      }
    >
      {progress && journeyRows.length > 0 ? <JourneyTable progress={progress} /> : null}
      {noProgressRecord ? (
        <p style={{ fontSize: "0.875rem", marginTop: 12 }}>
          <Link to="/admissions" style={{ color: "var(--badge-blue-fg)", marginRight: 12 }}>
            Go to Admissions
          </Link>
          <Link to="/progress" style={{ color: "var(--badge-blue-fg)" }}>
            Go to Progress list
          </Link>
        </p>
      ) : null}
    </ReportPageShell>
  );
}