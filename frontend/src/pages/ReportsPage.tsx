import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import { listExams, type StudentExam } from "../api/admissions";
import { listVisits, type KutirVisit } from "../api/visits";
import { STAGES, FUNNEL_STAGE_LABELS, type StageKey } from "../components/admissions-pipeline";
import { GrsTabs } from "../components/GrsTabs";
import { ReportFiltersBar } from "../components/ReportFiltersBar";
import { RowCountBadge } from "@parivaar/ui";
import { countActiveFilters } from "../utils/geoFilters";

const CURRENT_YEAR = new Date().getFullYear();

interface Kutir { id: number; name: string; code: string }
interface Student { id: number; first_name: string; last_name: string; kutir_id: number | null }
interface School { id: number; name: string; school_type: string }



// ── Shared fetch hooks ─────────────────────────────────────────────────────
function useKutirs() {
  return useQuery<Kutir[]>({ queryKey: ["kutirs"], queryFn: async () => (await api.get("/kutirs", { params: { limit: 500 } })).data });
}
function useStudents() {
  return useQuery<Student[]>({ queryKey: ["students-all"], queryFn: async () => (await api.get("/students", { params: { limit: 5000 } })).data });
}
function useSchools() {
  return useQuery<School[]>({ queryKey: ["schools"], queryFn: async () => (await api.get("/schools", { params: { limit: 500 } })).data });
}

// ── Report 1: Admission funnel by kutir ────────────────────────────────────
function FunnelReport({ year }: { year: number }) {
  const { data: kutirs = [] } = useKutirs();
  const { data: students = [] } = useStudents();
  const { data: exams = [], isLoading } = useQuery<StudentExam[]>({
    queryKey: ["exams", year],
    queryFn: () => listExams({ school_start_year: year }),
  });

  // Map student → kutir
  const studentKutir = new Map(students.map((s) => [s.id, s.kutir_id]));

  // Group exams by kutir — same six pipeline stages as Home / STAGES
  type StageCounts = Record<StageKey, number>;
  type Row = { kutir: Kutir } & StageCounts;
  const emptyCounts = (): StageCounts =>
    Object.fromEntries(STAGES.map((s) => [s.key, 0])) as StageCounts;

  const rows: Row[] = kutirs
    .map((k) => {
      const kExams = exams.filter((e) => studentKutir.get(e.student_id) === k.id);
      const counts = emptyCounts();
      for (const stage of STAGES) {
        counts[stage.key] = kExams.filter((e) => e[stage.key]).length;
      }
      return { kutir: k, ...counts };
    })
    .filter((r) => r.eligible > 0)
    .sort((a, b) => b.admitted - a.admitted || b.selected - a.selected || b.eligible - a.eligible);

  const totals = rows.reduce(
    (acc, r) => {
      for (const stage of STAGES) acc[stage.key] += r[stage.key];
      return acc;
    },
    emptyCounts()
  );

  if (isLoading) return <p style={{ color: "var(--text-secondary)" }}>Loading…</p>;
  if (rows.length === 0) return <p style={{ color: "var(--text-secondary)", padding: "32px 0", textAlign: "center" }}>No exam data for {year}.</p>;

  const numCol: React.CSSProperties = { padding: "9px 12px", textAlign: "center", borderBottom: "1px solid var(--border)", fontVariantNumeric: "tabular-nums" };
  const hdrCol: React.CSSProperties = { padding: "9px 12px", textAlign: "center", fontWeight: 600, color: "var(--badge-blue-fg)", borderBottom: "2px solid var(--badge-blue-bg)" };

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <RowCountBadge count={rows.length} />
      </div>
      <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr style={{ background: "var(--badge-blue-bg)" }}>
            <th style={{ ...hdrCol, textAlign: "left" }}>Kutir</th>
            {STAGES.map((s) => (
              <th key={s.key} style={hdrCol}>{FUNNEL_STAGE_LABELS[s.key]}</th>
            ))}
            <th style={hdrCol}>Conv. %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.kutir.id} style={{ background: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-input)" }}>
              <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)" }}>
                <Link to={`/kutirs/${r.kutir.id}`} style={{ color: "var(--badge-blue-fg)", textDecoration: "none", fontWeight: 600 }}>
                  {r.kutir.name}
                </Link>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginLeft: 6 }}>{r.kutir.code}</span>
              </td>
              {STAGES.map((s) => {
                const v = r[s.key];
                const highlight = (s.key === "selected" || s.key === "admitted") && v > 0;
                return (
                  <td
                    key={s.key}
                    style={{
                      ...numCol,
                      color: highlight ? "var(--status-success-fg)" : undefined,
                      fontWeight: highlight ? 700 : 400,
                    }}
                  >
                    {v}
                  </td>
                );
              })}
              <td style={numCol}>
                {r.eligible > 0 ? `${Math.round((r.admitted / r.eligible) * 100)}%` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: "var(--badge-blue-bg)", fontWeight: 700 }}>
            <td style={{ padding: "9px 12px", borderTop: "2px solid var(--badge-blue-bg)", color: "var(--badge-blue-fg)" }}>Total</td>
            {STAGES.map((s) => (
              <td key={s.key} style={{ ...numCol, borderTop: "2px solid var(--badge-blue-bg)", fontWeight: 700, color: "var(--text-primary)" }}>
                {totals[s.key]}
              </td>
            ))}
            <td style={{ ...numCol, borderTop: "2px solid var(--badge-blue-bg)", fontWeight: 700, color: "var(--text-primary)" }}>
              {totals.eligible > 0 ? `${Math.round((totals.admitted / totals.eligible) * 100)}%` : "—"}
            </td>
          </tr>
        </tfoot>
      </table>
      </div>
    </div>
  );
}

// ── Report 2: Admitted students list ──────────────────────────────────────
function AdmittedReport({ year }: { year: number }) {
  const { data: kutirs = [] } = useKutirs();
  const { data: students = [] } = useStudents();
  const { data: schools = [] } = useSchools();
  const { data: exams = [], isLoading } = useQuery<StudentExam[]>({
    queryKey: ["exams", year],
    queryFn: () => listExams({ school_start_year: year }),
  });

  const studentMap = new Map(students.map((s) => [s.id, s]));
  const kutirMap = new Map(kutirs.map((k) => [k.id, k]));
  const schoolMap = new Map(schools.map((s) => [s.id, s]));

  const admitted = exams
    .filter((e) => e.admitted && e.admitted_school_id)
    .sort((a, b) => {
      const kA = studentMap.get(a.student_id)?.kutir_id ?? 0;
      const kB = studentMap.get(b.student_id)?.kutir_id ?? 0;
      return kA - kB;
    });

  function exportCSV() {
    const rows = admitted.map((e) => {
      const s = studentMap.get(e.student_id);
      const school = schoolMap.get(e.admitted_school_id!);
      const kutir = kutirMap.get(s?.kutir_id ?? 0);
      return [
        e.student_id,
        s ? `${s.first_name} ${s.last_name}` : "",
        kutir?.name ?? "",
        school?.name ?? "",
        school?.school_type ?? "",
        e.application_number ?? "",
        e.roll_number ?? "",
      ];
    });
    const hdr = ["ID", "Student", "Kutir", "School", "Type", "Application #", "Roll #"];
    const csv = [hdr, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `admitted_${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) return <p style={{ color: "var(--text-secondary)" }}>Loading…</p>;
  if (admitted.length === 0) return <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "32px 0" }}>No admitted students for {year}.</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <RowCountBadge count={admitted.length} />
          <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            admitted in {year}
          </span>
        </div>
        <button onClick={exportCSV} style={{ background: "var(--status-success-bg)", color: "var(--status-success-fg)", border: "1px solid var(--status-success-fg)", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
          ↓ Export CSV
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ background: "var(--status-success-bg)" }}>
              {["Student", "Kutir", "Admitted School", "Type", "App #", "Roll #"].map((h) => (
                <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontWeight: 600, color: "var(--status-success-fg)", borderBottom: "2px solid var(--status-success-fg)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {admitted.map((e, i) => {
              const s = studentMap.get(e.student_id);
              const kutir = kutirMap.get(s?.kutir_id ?? 0);
              const school = schoolMap.get(e.admitted_school_id!);
              return (
                <tr key={e.id} style={{ background: i % 2 === 0 ? "var(--bg-card)" : "var(--status-success-bg)" }}>
                  <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)" }}>
                    <Link to={`/students/${e.student_id}`} style={{ color: "var(--status-success-fg)", textDecoration: "none", fontWeight: 600 }}>
                      {s ? `${s.first_name} ${s.last_name}` : `#${e.student_id}`}
                    </Link>
                  </td>
                  <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    {kutir ? <Link to={`/kutirs/${kutir.id}`} style={{ color: "var(--badge-blue-fg)", textDecoration: "none" }}>{kutir.name}</Link> : "—"}
                  </td>
                  <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)", fontWeight: 600, color: "var(--text-primary)" }}>
                    {school?.name ?? `#${e.admitted_school_id}`}
                  </td>
                  <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)" }}>
                    {school && (
                      <span style={{ background: "var(--badge-blue-bg)", color: "var(--badge-blue-fg)", borderRadius: 4, padding: "2px 7px", fontSize: "0.75rem", fontWeight: 600 }}>
                        {school.school_type}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)", fontSize: "0.82rem", color: "var(--text-secondary)" }}>{e.application_number ?? "—"}</td>
                  <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)", fontSize: "0.82rem", color: "var(--text-secondary)" }}>{e.roll_number ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Report 3: Kutir visit summary ─────────────────────────────────────────
function VisitSummaryReport() {
  const { data: kutirs = [] } = useKutirs();
  const { data: visits = [], isLoading } = useQuery<KutirVisit[]>({
    queryKey: ["visits-all"],
    queryFn: () => listVisits({ limit: 2000 } as any),
  });

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  type KRow = {
    kutir: Kutir;
    count: number;
    avgPerf: number;
    avgClean: number;
    timetableOk: number;
    lastDate: string | null;
  };

  const rows: KRow[] = kutirs
    .map((k) => {
      const kv = visits.filter((v) => v.kutir_id === k.id);
      return {
        kutir: k,
        count: kv.length,
        avgPerf: avg(kv.map((v) => v.kutir_performance)),
        avgClean: avg(kv.map((v) => v.cleanliness)),
        timetableOk: kv.length ? Math.round((kv.filter((v) => v.follow_timetable).length / kv.length) * 100) : 0,
        lastDate: kv.length ? kv.sort((a, b) => b.visit_date.localeCompare(a.visit_date))[0].visit_date : null,
      };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.avgPerf - a.avgPerf);

  if (isLoading) return <p style={{ color: "var(--text-secondary)" }}>Loading…</p>;
  if (rows.length === 0) return <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "32px 0" }}>No visits recorded yet.</p>;

  function stars(n: number) {
    const full = Math.round(n);
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <RowCountBadge count={rows.length} />
      </div>
      <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr style={{ background: "var(--badge-amber-bg)" }}>
            {["Kutir", "Visits", "Avg Performance", "Avg Cleanliness", "Timetable OK", "Last Visit"].map((h) => (
              <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontWeight: 600, color: "var(--badge-amber-fg)", borderBottom: "2px solid #fbd38d" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.kutir.id} style={{ background: i % 2 === 0 ? "var(--bg-card)" : "var(--badge-amber-bg)" }}>
              <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)" }}>
                <Link to={`/kutirs/${r.kutir.id}`} style={{ color: "var(--badge-amber-fg)", textDecoration: "none", fontWeight: 600 }}>
                  {r.kutir.name}
                </Link>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginLeft: 6 }}>{r.kutir.code}</span>
              </td>
              <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)", fontVariantNumeric: "tabular-nums" }}>{r.count}</td>
              <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--star-active)" }}>{stars(r.avgPerf)}</span>
                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginLeft: 6 }}>{r.avgPerf.toFixed(1)}</span>
              </td>
              <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--star-active)" }}>{stars(r.avgClean)}</span>
                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginLeft: 6 }}>{r.avgClean.toFixed(1)}</span>
              </td>
              <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: r.timetableOk >= 70 ? "var(--status-success-fg)" : r.timetableOk >= 40 ? "var(--badge-amber-fg)" : "var(--status-danger-fg)", fontWeight: 600 }}>
                  {r.timetableOk}%
                </span>
              </td>
              <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--border)", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                {r.lastDate
                  ? new Date(r.lastDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
type SummaryTab = "funnel" | "visits";
type DetailedTab = "admitted";

export default function ReportsPage() {
  const location = useLocation();
  const isDetailed = location.pathname.includes("detailed");

  const [summaryTab, setSummaryTab] = useState<SummaryTab>("funnel");
  const [detailedTab, _setDetailedTab] = useState<DetailedTab>("admitted");
  const [year, setYear] = useState(CURRENT_YEAR);

  const summaryTabs: { key: SummaryTab; label: string }[] = [
    { key: "funnel", label: "Admission Funnel by Kutir" },
    { key: "visits", label: "Kutir Visit Summary" },
  ];

  const detailedTabs: { key: DetailedTab; label: string }[] = [
    { key: "admitted", label: "Admitted Students" },
  ];

  const yearSelect = (
    <div style={{ flex: "1 1 140px", maxWidth: 180, minWidth: 120 }}>
      <label
        style={{
          display: "block",
          fontSize: "0.78rem",
          fontWeight: 600,
          color: "var(--text-secondary)",
          marginBottom: 4,
        }}
      >
        School year
      </label>
      <select
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        style={{
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "8px 10px",
          fontSize: "16px",
          width: "100%",
          boxSizing: "border-box",
          background: "var(--bg-input)",
          color: "var(--text-primary)",
        }}
      >
        {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map((y) => (
          <option key={y} value={y}>
            {y}-{String(y + 1).slice(2)}
          </option>
        ))}
      </select>
    </div>
  );

  if (isDetailed) {
    const tabs = detailedTabs;
    const tab = detailedTab;
    return (
      <div className="grs-page" style={{ padding: "24px 28px" }}>
        <h2 style={{ margin: "0 0 16px", color: "var(--text-primary)" }}>Detailed Reports</h2>
        <ReportFiltersBar activeFilterCount={countActiveFilters(year !== CURRENT_YEAR ? year : "")}>
          {yearSelect}
        </ReportFiltersBar>
        <GrsTabs
          value={tab}
          onChange={_setDetailedTab}
          style={{ marginBottom: 20 }}
          tabs={tabs}
        />
        {tab === "admitted" && <AdmittedReport year={year} />}
      </div>
    );
  }

  // Summary view
  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      <h2 style={{ margin: "0 0 16px", color: "var(--text-primary)" }}>Summary Reports</h2>
      {summaryTab === "funnel" && (
        <ReportFiltersBar activeFilterCount={countActiveFilters(year !== CURRENT_YEAR ? year : "")}>
          {yearSelect}
        </ReportFiltersBar>
      )}
      <GrsTabs
        value={summaryTab}
        onChange={setSummaryTab}
        style={{ marginBottom: 20 }}
        tabs={summaryTabs}
      />
      {summaryTab === "funnel" && <FunnelReport year={year} />}
      {summaryTab === "visits" && <VisitSummaryReport />}
    </div>
  );
}
