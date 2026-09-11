import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import { listExams, type StudentExam } from "../api/admissions";
import { listVisits, type KutirVisit } from "../api/visits";

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

  // Group exams by kutir
  type Row = { kutir: Kutir; eligible: number; applied: number; appeared: number; selected: number; admitted: number };
  const rows: Row[] = kutirs
    .map((k) => {
      const kExams = exams.filter((e) => studentKutir.get(e.student_id) === k.id);
      return {
        kutir: k,
        eligible: kExams.filter((e) => e.eligible).length,
        applied: kExams.filter((e) => e.applied).length,
        appeared: kExams.filter((e) => e.appeared).length,
        selected: kExams.filter((e) => e.selected).length,
        admitted: kExams.filter((e) => e.admitted).length,
      };
    })
    .filter((r) => r.eligible > 0)
    .sort((a, b) => b.admitted - a.admitted || b.selected - a.selected || b.eligible - a.eligible);

  const totals = rows.reduce(
    (acc, r) => ({
      eligible: acc.eligible + r.eligible,
      applied: acc.applied + r.applied,
      appeared: acc.appeared + r.appeared,
      selected: acc.selected + r.selected,
      admitted: acc.admitted + r.admitted,
    }),
    { eligible: 0, applied: 0, appeared: 0, selected: 0, admitted: 0 }
  );

  if (isLoading) return <p style={{ color: "var(--text-secondary)" }}>Loading…</p>;
  if (rows.length === 0) return <p style={{ color: "var(--text-secondary)", padding: "32px 0", textAlign: "center" }}>No exam data for {year}.</p>;

  const numCol: React.CSSProperties = { padding: "9px 12px", textAlign: "center", borderBottom: "1px solid var(--border)", fontVariantNumeric: "tabular-nums" };
  const hdrCol: React.CSSProperties = { padding: "9px 12px", textAlign: "center", fontWeight: 600, color: "var(--badge-blue-fg)", borderBottom: "2px solid var(--badge-blue-bg)" };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr style={{ background: "var(--badge-blue-bg)" }}>
            <th style={{ ...hdrCol, textAlign: "left" }}>Kutir</th>
            <th style={hdrCol}>Eligible</th>
            <th style={hdrCol}>Applied</th>
            <th style={hdrCol}>Appeared</th>
            <th style={hdrCol}>Selected</th>
            <th style={hdrCol}>Admitted</th>
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
              <td style={numCol}>{r.eligible}</td>
              <td style={numCol}>{r.applied}</td>
              <td style={numCol}>{r.appeared}</td>
              <td style={{ ...numCol, color: r.selected > 0 ? "var(--status-success-fg)" : undefined, fontWeight: r.selected > 0 ? 700 : 400 }}>{r.selected}</td>
              <td style={{ ...numCol, color: r.admitted > 0 ? "var(--status-success-fg)" : undefined, fontWeight: r.admitted > 0 ? 700 : 400 }}>{r.admitted}</td>
              <td style={numCol}>
                {r.eligible > 0 ? `${Math.round((r.admitted / r.eligible) * 100)}%` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: "var(--badge-blue-bg)", fontWeight: 700 }}>
            <td style={{ padding: "9px 12px", borderTop: "2px solid var(--badge-blue-bg)", color: "var(--badge-blue-fg)" }}>Total</td>
            {[totals.eligible, totals.applied, totals.appeared, totals.selected, totals.admitted].map((v, i) => (
              <td key={i} style={{ ...numCol, borderTop: "2px solid var(--badge-blue-bg)", fontWeight: 700, color: "var(--text-primary)" }}>{v}</td>
            ))}
            <td style={{ ...numCol, borderTop: "2px solid var(--badge-blue-bg)", fontWeight: 700, color: "var(--text-primary)" }}>
              {totals.eligible > 0 ? `${Math.round((totals.admitted / totals.eligible) * 100)}%` : "—"}
            </td>
          </tr>
        </tfoot>
      </table>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--status-success-fg)" }}>{admitted.length}</strong> students admitted in {year}
        </span>
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

  if (isDetailed) {
    const tabs = detailedTabs;
    const tab = detailedTab;
    return (
      <div style={{ padding: "24px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: "var(--text-primary)" }}>Detailed Reports</h2>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "6px 12px", fontSize: "0.875rem" }}
          >
            {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map((y) => (
              <option key={y} value={y}>{y}-{String(y + 1).slice(2)}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--border)", marginBottom: 20 }}>
          {tabs.map((t) => (
            <button key={t.key} style={{
              background: "transparent", border: "none", cursor: "pointer",
              padding: "9px 20px", fontSize: "0.875rem",
              fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? "var(--badge-blue-fg)" : "var(--text-secondary)",
              borderBottom: tab === t.key ? "2px solid #2c5282" : "2px solid transparent",
              marginBottom: -2, transition: "color 0.15s",
            }}>{t.label}</button>
          ))}
        </div>
        {tab === "admitted" && <AdmittedReport year={year} />}
      </div>
    );
  }

  // Summary view
  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: "var(--text-primary)" }}>Summary Reports</h2>
        {summaryTab === "funnel" && (
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "6px 12px", fontSize: "0.875rem" }}
          >
            {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map((y) => (
              <option key={y} value={y}>{y}-{String(y + 1).slice(2)}</option>
            ))}
          </select>
        )}
      </div>
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--border)", marginBottom: 20 }}>
        {summaryTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSummaryTab(t.key)}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              padding: "9px 20px", fontSize: "0.875rem",
              fontWeight: summaryTab === t.key ? 700 : 400,
              color: summaryTab === t.key ? "var(--badge-blue-fg)" : "var(--text-secondary)",
              borderBottom: summaryTab === t.key ? "2px solid #2c5282" : "2px solid transparent",
              marginBottom: -2, transition: "color 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {summaryTab === "funnel" && <FunnelReport year={year} />}
      {summaryTab === "visits" && <VisitSummaryReport />}
    </div>
  );
}
