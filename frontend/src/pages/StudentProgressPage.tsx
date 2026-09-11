import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import {
  listProgress,
  createProgress,
  updateProgress,
  deleteProgress,
  type StudentProgress,
  type StudentProgressCreate,
} from "../api/admissions";
import { listSchools, type School } from "../api/schools";
import { listKutirs } from "../api/kutirs";
import { listStudents } from "../api/students";
import { listDistricts, listAreas, listClusters } from "../api/geo";
import { useAuth } from "../context/AuthContext";

const CURRENT_YEAR = new Date().getFullYear();
const GRADES = [6, 7, 8, 9, 10, 11, 12];
const EXIT_REASONS = [
  "Passed out (Grade 12)",
  "Transferred",
  "Dropped out",
  "Failed and left",
  "Other",
];

interface StudentMin {
  id: number;
  first_name: string;
  last_name: string;
  kutir_id: number | null;
}

function ProgressModal({
  initial,
  schools,
  onClose,
  onSaved,
}: {
  initial: StudentProgressCreate & { id?: number };
  schools: School[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial.id;
  const [form, setForm] = useState<StudentProgressCreate & { id?: number }>(initial);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Student search
  const { data: students = [] } = useQuery<StudentMin[]>({
    queryKey: ["students-search", search],
    queryFn: async () =>
      (await api.get("/students", { params: { search, limit: 20 } })).data,
    enabled: !isEdit && search.length >= 2,
  });

  function set<K extends keyof StudentProgressCreate>(key: K, val: StudentProgressCreate[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.student_id) { setError("Select a student."); return; }
    if (!form.school_id) { setError("Select a school."); return; }
    setSaving(true);
    setError(null);
    try {
      const { id, ...payload } = form;
      if (isEdit) {
        await updateProgress(id!, payload);
      } else {
        await createProgress(payload);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#fff", borderRadius: 10, padding: 24, width: 440, maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <h3 style={{ margin: "0 0 16px", color: "#1a365d" }}>
          {isEdit ? "Edit Progress Record" : "Add Progress Record"}
        </h3>

        {error && <div style={{ background: "#fff5f5", border: "1px solid #fc8181", color: "#c53030", borderRadius: 6, padding: "8px 12px", fontSize: "0.85rem", marginBottom: 12 }}>{error}</div>}

        {/* Student selector (add mode only) */}
        {!isEdit && (
          <Row label="Student *">
            <input
              style={inp}
              placeholder="Type name to search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {students.length > 0 && (
              <div style={{ border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 6px 6px", maxHeight: 160, overflowY: "auto" }}>
                {students.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => { set("student_id", s.id); setSearch(`${s.first_name} ${s.last_name}`); }}
                    style={{
                      padding: "8px 12px", cursor: "pointer", fontSize: "0.875rem",
                      background: form.student_id === s.id ? "#ebf4ff" : "#fff",
                    }}
                  >
                    {s.first_name} {s.last_name}
                  </div>
                ))}
              </div>
            )}
          </Row>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Row label="Academic Year *">
            <select style={inp} value={form.academic_year} onChange={(e) => set("academic_year", Number(e.target.value))}>
              {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
                <option key={y} value={y}>{y}-{String(y + 1).slice(2)}</option>
              ))}
            </select>
          </Row>
          <Row label="Grade *">
            <select style={inp} value={form.grade} onChange={(e) => set("grade", Number(e.target.value))}>
              {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </Row>
        </div>

        <Row label="School *">
          <select style={inp} value={form.school_id || ""} onChange={(e) => set("school_id", Number(e.target.value))}>
            <option value="">— select school —</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.school_type})</option>
            ))}
          </select>
        </Row>

        <Row label="Enrolled">
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.875rem" }}>
            <input
              type="checkbox"
              checked={form.is_enrolled ?? true}
              onChange={(e) => set("is_enrolled", e.target.checked)}
              style={{ width: 15, height: 15 }}
            />
            Currently enrolled at this school
          </label>
        </Row>

        {!(form.is_enrolled ?? true) && (
          <Row label="Exit Reason">
            <select style={inp} value={form.exit_reason ?? ""} onChange={(e) => set("exit_reason", e.target.value || null)}>
              <option value="">— none —</option>
              {EXIT_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Row>
        )}

        <Row label="Previous Year % (if applicable)">
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            style={inp}
            value={form.previous_year_percentage ?? ""}
            onChange={(e) => set("previous_year_percentage", e.target.value === "" ? null : Number(e.target.value))}
          />
        </Row>

        <Row label="Remarks">
          <textarea
            style={{ ...inp, resize: "vertical" }}
            rows={2}
            value={form.remarks ?? ""}
            onChange={(e) => set("remarks", e.target.value || null)}
          />
        </Row>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={btnSecondary} disabled={saving}>Cancel</button>
          <button onClick={handleSave} style={btnPrimary} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Record"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentProgressPage() {
  const { user } = useAuth();
  const isAdmin = user?.title === "Admin";
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(() => window.innerWidth > 640);
  const [filterDistrict, setFilterDistrict] = useState<number | "">("");
  const [filterCluster, setFilterCluster] = useState<number | "">("");
  const [filterYear, setFilterYear] = useState(CURRENT_YEAR);
  const [filterGrade, setFilterGrade] = useState<number | "">("");
  const [modal, setModal] = useState<(StudentProgressCreate & { id?: number }) | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data: progressList = [], isLoading } = useQuery<StudentProgress[]>({
    queryKey: ["progress", filterYear, filterGrade],
    queryFn: () => listProgress(),
  });

  const { data: schools = [] } = useQuery<School[]>({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
  });

  const { data: allStudents = [] } = useQuery({ queryKey: ["all-students"], queryFn: () => listStudents({ limit: 5000 }) });
  const { data: allKutirs = [] } = useQuery({ queryKey: ["all-kutirs"], queryFn: () => listKutirs() });
  const { data: allDistricts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { data: allAreas = [] } = useQuery({ queryKey: ["all-areas"], queryFn: () => listAreas() });
  const { data: allClusters = [] } = useQuery({ queryKey: ["all-clusters"], queryFn: () => listClusters() });

  const studentMap2 = new Map(allStudents.map(s => [s.id, s]));
  const kutirMap = new Map(allKutirs.map(k => [k.id, k]));
  const areaMap = new Map(allAreas.map(a => [a.id, a]));
  const clusterMap = new Map(allClusters.map(c => [c.id, c]));
  const filterClusters = allClusters.filter(c => filterDistrict === "" || areaMap.get(c.area_id)?.district_id === filterDistrict);

  const schoolMap = new Map(schools.map((s) => [s.id, s]));

  const deleteMut = useMutation({
    mutationFn: deleteProgress,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress"] }),
  });

  function refresh() { qc.invalidateQueries({ queryKey: ["progress"] }); }

  // Client-side filter by year, grade, search, district, cluster
  const filtered = progressList.filter((p) => {
    if (p.academic_year !== filterYear) return false;
    if (filterGrade && p.grade !== filterGrade) return false;
    if (search) {
      const s = studentMap2.get(p.student_id);
      if (!s) return false;
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      if (!name.includes(search.toLowerCase())) return false;
    }
    if (filterCluster !== "" || filterDistrict !== "") {
      const s = studentMap2.get(p.student_id);
      const kutir = s?.kutir_id != null ? kutirMap.get(s.kutir_id) : null;
      if (filterCluster !== "") {
        if (!kutir || kutir.cluster_id !== filterCluster) return false;
      } else if (filterDistrict !== "") {
        if (!kutir) return false;
        const cl = clusterMap.get(kutir.cluster_id);
        if (!cl) return false;
        const ar = areaMap.get(cl.area_id);
        if (!ar || ar.district_id !== filterDistrict) return false;
      }
    }
    return true;
  });

  // Grade distribution for current year
  const gradeCounts = GRADES.reduce((acc, g) => {
    acc[g] = progressList.filter((p) => p.academic_year === filterYear && p.grade === g).length;
    return acc;
  }, {} as Record<number, number>);

  const enrolledCount = filtered.filter((p) => p.is_enrolled).length;

  function openAdd() {
    setModal({
      student_id: 0,
      school_id: 0,
      academic_year: filterYear,
      grade: typeof filterGrade === "number" ? filterGrade : 6,
      is_enrolled: true,
      exit_reason: null,
      previous_year_percentage: null,
      remarks: null,
    });
    setShowModal(true);
  }

  function openEdit(p: StudentProgress) {
    setModal({
      id: p.id,
      student_id: p.student_id,
      school_id: p.school_id,
      academic_year: p.academic_year,
      grade: p.grade,
      is_enrolled: p.is_enrolled,
      exit_reason: p.exit_reason,
      previous_year_percentage: p.previous_year_percentage,
      remarks: p.remarks,
    });
    setShowModal(true);
  }

  function exportCsv() {
    const headers = ["Student", "Grade", "School", "Status", "Prev %", "Remarks"];
    const rows = filtered.map(p => {
      const s = studentMap2.get(p.student_id);
      const name = s ? `${s.first_name} ${s.last_name}` : String(p.student_id);
      const schoolName = p.school?.name ?? "";
      const statusStr = p.is_enrolled ? "Enrolled" : "Dropped";
      return [name, p.grade ?? "", schoolName, statusStr, p.previous_year_percentage ?? "", p.remarks ?? ""];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: "data:text/csv," + encodeURIComponent(csv), download: "progress.csv" });
    a.click();
  }

  function printTable() {
    const w = window.open("", "_blank")!;
    const rows = filtered.map(p => {
      const s = studentMap2.get(p.student_id);
      const name = s ? `${s.first_name} ${s.last_name}` : String(p.student_id);
      const schoolName = p.school?.name ?? "";
      const statusStr = p.is_enrolled ? "Enrolled" : "Dropped";
      return `<tr><td>${name}</td><td>${p.grade ?? ""}</td><td>${schoolName}</td><td>${statusStr}</td><td>${p.previous_year_percentage ?? ""}</td><td>${p.remarks ?? ""}</td></tr>`;
    }).join("");
    w.document.write(`<html><head><title>Student Progress</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 10px;font-size:13px}th{background:#f0f4ff}</style></head><body><h2>Student Progress</h2><table><thead><tr><th>Student</th><th>Grade</th><th>School</th><th>Status</th><th>Prev %</th><th>Remarks</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print();
  }

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: "#1a365d" }}>Student Progress</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={exportCsv} title="Export CSV" className="grs-ibtn" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", border: "1px solid #cbd5e0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.8rem", color: "#4a5568", fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span className="grs-lbl">Export CSV</span>
          </button>
          <button onClick={printTable} title="Print" className="grs-ibtn" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", border: "1px solid #cbd5e0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.8rem", color: "#4a5568", fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            <span className="grs-lbl">Print</span>
          </button>
          <button onClick={openAdd} style={btnPrimary}>+ Add Record</button>
        </div>
      </div>

      {/* Year tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map((y) => (
          <button
            key={y}
            onClick={() => setFilterYear(y)}
            style={{
              border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer",
              fontSize: "0.85rem", fontWeight: 600,
              background: filterYear === y ? "#2c5282" : "#ebf4ff",
              color: filterYear === y ? "#fff" : "#2c5282",
            }}
          >
            {y}-{String(y + 1).slice(2)}
          </button>
        ))}
      </div>

      {/* Search + geo filter bar */}
      <button className="grs-filter-toggle" onClick={() => setFiltersOpen(o => !o)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        <span>Filters {filtersOpen ? "▲" : "▼"}</span>
      </button>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }} className={filtersOpen ? "grs-fbar" : "grs-fbar grs-fbar--hidden"}>
        <input
          style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.875rem", minWidth: 200, boxSizing: "border-box" as const }}
          placeholder="Search by student name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.875rem", minWidth: 160, background: "#fff" }}
          value={filterDistrict}
          onChange={e => { setFilterDistrict(e.target.value === "" ? "" : Number(e.target.value)); setFilterCluster(""); }}
        >
          <option value="">All Districts</option>
          {allDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select
          style={{ padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.875rem", minWidth: 160, background: "#fff" }}
          value={filterCluster}
          onChange={e => setFilterCluster(e.target.value === "" ? "" : Number(e.target.value))}
          disabled={filterDistrict === ""}
        >
          <option value="">All Clusters</option>
          {filterClusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Grade chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        <button
          onClick={() => setFilterGrade("")}
          style={{ ...chip, background: filterGrade === "" ? "#553c9a" : "#f3f0ff", color: filterGrade === "" ? "#fff" : "#553c9a" }}
        >
          All Grades ({progressList.filter((p) => p.academic_year === filterYear).length})
        </button>
        {GRADES.filter((g) => gradeCounts[g] > 0).map((g) => (
          <button
            key={g}
            onClick={() => setFilterGrade(filterGrade === g ? "" : g)}
            style={{ ...chip, background: filterGrade === g ? "#553c9a" : "#f3f0ff", color: filterGrade === g ? "#fff" : "#553c9a" }}
          >
            Grade {g} ({gradeCounts[g]})
          </button>
        ))}
      </div>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
          <div style={{ background: "#f0fff4", border: "1px solid #9ae6b4", borderRadius: 8, padding: "10px 18px", fontSize: "0.85rem" }}>
            <span style={{ fontWeight: 700, color: "#276749", fontSize: "1.2rem" }}>{enrolledCount}</span>
            <span style={{ color: "#276749", marginLeft: 6 }}>Enrolled</span>
          </div>
          <div style={{ background: "#fff5f5", border: "1px solid #fc8181", borderRadius: 8, padding: "10px 18px", fontSize: "0.85rem" }}>
            <span style={{ fontWeight: 700, color: "#c53030", fontSize: "1.2rem" }}>{filtered.length - enrolledCount}</span>
            <span style={{ color: "#c53030", marginLeft: 6 }}>Exited</span>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <p style={{ color: "#718096" }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "#a0aec0", textAlign: "center", padding: "40px 0" }}>
          No progress records for {filterYear}-{String(filterYear + 1).slice(2)}
          {filterGrade ? ` · Grade ${filterGrade}` : ""}.
        </p>
      ) : (
        <>

        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr style={{ background: "#f3f0ff" }}>
                <th style={styles.th}>Student</th>
                <th style={styles.th}>Grade</th>
                <th style={styles.th}>School</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Prev %</th>
                <th style={styles.th}>Remarks</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const school = p.school ?? schoolMap.get(p.school_id);
                return (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? "#fff" : "#faf5ff" }}>
                    <td style={styles.td}>
                      <Link
                        to={`/students/${p.student_id}`}
                        style={{ color: "#553c9a", textDecoration: "none", fontWeight: 600 }}
                      >
                        {(() => { const s = studentMap2.get(p.student_id); return s ? `${s.first_name} ${s.last_name}` : `#${p.student_id}`; })()}
                      </Link>
                    </td>
                    <td style={styles.td}>
                      <span style={{ background: "#ede9fe", color: "#553c9a", borderRadius: 4, padding: "2px 8px", fontSize: "0.8rem", fontWeight: 700 }}>
                        Grade {p.grade}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontSize: "0.875rem", color: "#2d3748" }}>
                        {school?.name ?? `School #${p.school_id}`}
                      </div>
                      {school?.school_type && (
                        <div style={{ fontSize: "0.75rem", color: "#718096" }}>{school.school_type}</div>
                      )}
                    </td>
                    <td style={styles.td}>
                      {p.is_enrolled ? (
                        <span style={{ background: "#c6f6d5", color: "#276749", borderRadius: 4, padding: "2px 8px", fontSize: "0.78rem", fontWeight: 600 }}>
                          ✓ Enrolled
                        </span>
                      ) : (
                        <div>
                          <span style={{ background: "#fed7d7", color: "#c53030", borderRadius: 4, padding: "2px 8px", fontSize: "0.78rem", fontWeight: 600 }}>
                            Exited
                          </span>
                          {p.exit_reason && (
                            <div style={{ fontSize: "0.72rem", color: "#718096", marginTop: 2 }}>{p.exit_reason}</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      {p.previous_year_percentage != null ? (
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>
                          {p.previous_year_percentage.toFixed(1)}%
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ ...styles.td, maxWidth: 180, fontSize: "0.8rem", color: "#4a5568" }}>
                      {p.remarks ?? "—"}
                    </td>
                    <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                      <button
                        onClick={() => openEdit(p)}
                        style={{ background: "transparent", border: "1px solid #d6bcfa", color: "#553c9a", borderRadius: 5, padding: "3px 10px", cursor: "pointer", fontSize: "0.78rem", marginRight: 4 }}
                      >
                        Edit
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => { if (confirm("Delete this record?")) deleteMut.mutate(p.id); }}
                          style={{ background: "transparent", border: "1px solid #fc8181", color: "#c53030", borderRadius: 5, padding: "3px 10px", cursor: "pointer", fontSize: "0.78rem" }}
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {showModal && modal && (
        <ProgressModal
          initial={modal}
          schools={schools}
          onClose={() => setShowModal(false)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#4a5568", marginBottom: 3 }}>{label}</label>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", border: "1px solid #cbd5e0", borderRadius: 6,
  padding: "7px 10px", fontSize: "0.875rem", boxSizing: "border-box",
};
const btnPrimary: React.CSSProperties = {
  background: "#553c9a", color: "#fff", border: "none", borderRadius: 6,
  padding: "8px 18px", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600,
};
const btnSecondary: React.CSSProperties = {
  background: "#fff", color: "#4a5568", border: "1px solid #cbd5e0",
  borderRadius: 6, padding: "8px 18px", cursor: "pointer", fontSize: "0.875rem",
};
const chip: React.CSSProperties = {
  border: "none", borderRadius: 14, padding: "4px 12px",
  fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
};
const styles: Record<string, React.CSSProperties> = {
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
  th: { padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#553c9a", borderBottom: "2px solid #d6bcfa" },
  td: { padding: "10px 12px", borderBottom: "1px solid #e2e8f0", verticalAlign: "top" },
};
