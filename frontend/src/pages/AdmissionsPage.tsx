import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listExams, createExam, updateExam, deleteExam } from "../api/admissions";
import type { StudentExam, StudentExamCreate } from "../api/admissions";
import { listStudents } from "../api/students";
import type { Student } from "../api/students";
import { listSchools } from "../api/schools";
import { useAuth } from "../context/AuthContext";
import { listKutirs } from "../api/kutirs";
import { listDistricts, listAreas, listClusters } from "../api/geo";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 2 + i);

// Pipeline stages in order
const STAGES = [
  { key: "form_received", label: "Form" },
  { key: "applied",       label: "Applied" },
  { key: "appeared",      label: "Appeared" },
  { key: "selected",      label: "Selected" },
  { key: "admitted",      label: "Admitted" },
] as const;

type StageKey = typeof STAGES[number]["key"];

function pipelineStage(exam: StudentExam): number {
  // Returns index (0-based) of the highest completed stage, or -1 if none
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (exam[STAGES[i].key as StageKey]) return i;
  }
  return -1;
}

function StageBadge({ exam }: { exam: StudentExam }) {
  const idx = pipelineStage(exam);
  if (idx < 0) {
    return (
      <span style={{
        background: "#f3f4f6", color: "#6b7280",
        padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600
      }}>Registered</span>
    );
  }
  const colors: Record<number, { bg: string; color: string }> = {
    0: { bg: "#dbeafe", color: "#1d4ed8" },
    1: { bg: "#e0e7ff", color: "#4338ca" },
    2: { bg: "#fef3c7", color: "#92400e" },
    3: { bg: "#dcfce7", color: "#166534" },
    4: { bg: "#f0fdf4", color: "#15803d" },
  };
  const { bg, color } = colors[idx] || colors[0];
  const stage = STAGES[idx];
  return (
    <span style={{
      background: bg, color,
      padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 700,
      letterSpacing: "0.02em"
    }}>{stage.label}</span>
  );
}

function PipelineStepper({ exam, onChange }: {
  exam: StudentExam;
  onChange: (updates: Partial<Record<StageKey, boolean>>) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 0, alignItems: "center", flexWrap: "wrap" }}>
      {STAGES.map((stage, i) => {
        const done = exam[stage.key as StageKey] as boolean;
        return (
          <label key={stage.key} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 13 }}>
            {i > 0 && <span style={{ color: "#d1d5db", margin: "0 4px" }}>›</span>}
            <input
              type="checkbox"
              checked={done}
              onChange={e => {
                const updates: Partial<Record<StageKey, boolean>> = {};
                if (e.target.checked) {
                  // Check all stages up to this one
                  STAGES.slice(0, i + 1).forEach(s => { updates[s.key as StageKey] = true; });
                } else {
                  // Uncheck this and all subsequent
                  STAGES.slice(i).forEach(s => { updates[s.key as StageKey] = false; });
                }
                onChange(updates);
              }}
              style={{ accentColor: "#2563eb" }}
            />
            <span style={{ color: done ? "#1d4ed8" : "#9ca3af", fontWeight: done ? 600 : 400 }}>
              {stage.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

// ── Modal for adding a new application ──────────────────────────────────────
function AddModal({
  students, schools, year,
  onClose, onSave
}: {
  students: Student[];
  schools: { id: number; name: string; school_type: string }[];
  year: number;
  onClose: () => void;
  onSave: (data: StudentExamCreate) => void;
}) {
  const [studentId, setStudentId] = useState<number | "">("");
  const [schoolId, setSchoolId] = useState<number | "">("");
  const [sy, setSy] = useState<number>(year);
  const [search, setSearch] = useState("");

  const filtered = students.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
    }}>
      <div style={{
        background: "var(--bg-card)", borderRadius: 12, padding: 28,
        width: 440, maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 18, color: "var(--text-primary)" }}>
          Add Application
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>
              Student
            </label>
            <input
              placeholder="Search student..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", marginBottom: 6, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box" }}
            />
            <select
              value={studentId}
              onChange={e => setStudentId(Number(e.target.value))}
              style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box" }}
            >
              <option value="">-- select student --</option>
              {filtered.map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>
              School
            </label>
            <select
              value={schoolId}
              onChange={e => setSchoolId(Number(e.target.value))}
              style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box" }}
            >
              <option value="">-- select school --</option>
              {schools.map(sc => (
                <option key={sc.id} value={sc.id}>{sc.name} ({sc.school_type})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>
              Year
            </label>
            <select
              value={sy}
              onChange={e => setSy(Number(e.target.value))}
              style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box" }}
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}>
            Cancel
          </button>
          <button
            disabled={!studentId || !schoolId}
            onClick={() => onSave({ student_id: Number(studentId), school_id: Number(schoolId), school_start_year: sy })}
            style={{ padding: "8px 18px", borderRadius: 7, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, opacity: (!studentId || !schoolId) ? 0.5 : 1 }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Inline edit modal ────────────────────────────────────────────────────────
function EditModal({ exam, onClose, onSave }: {
  exam: StudentExam;
  onClose: () => void;
  onSave: (updates: Partial<StudentExamCreate>) => void;
}) {
  const [form, setForm] = useState({ ...exam });

  function toggleStage(updates: Partial<Record<StageKey, boolean>>) {
    setForm(f => ({ ...f, ...updates }));
  }

  function set(k: string, v: unknown) {
    setForm(f => ({ ...f, [k]: v }));
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      padding: 16
    }}>
      <div style={{
        background: "var(--bg-card)", borderRadius: 12, padding: 28,
        width: 560, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 18, color: "var(--text-primary)" }}>
          Edit Application
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-secondary)" }}>
          School start year: <strong>{exam.school_start_year}</strong>
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Pipeline stepper */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Pipeline Stage
            </label>
            <PipelineStepper exam={form as StudentExam} onChange={toggleStage} />
          </div>

          {/* Application info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>Application #</label>
              <input
                value={form.application_number || ""}
                onChange={e => set("application_number", e.target.value || null)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>Roll #</label>
              <input
                value={form.roll_number || ""}
                onChange={e => set("roll_number", e.target.value || null)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* Scores */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Scores
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {(["math", "english", "reasoning", "evs"] as const).map(subj => (
                <div key={subj}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)", textTransform: "capitalize" }}>{subj}</label>
                  <input
                    type="number"
                    min={0} max={100} step={0.01}
                    value={form[subj] ?? ""}
                    onChange={e => set(subj, e.target.value === "" ? null : parseFloat(e.target.value))}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box" }}
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Eligible checkbox */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-primary)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.eligible}
              onChange={e => set("eligible", e.target.checked)}
              style={{ accentColor: "#2563eb" }}
            />
            Eligible for exam
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}>
            Cancel
          </button>
          <button
            onClick={() => onSave({
              eligible: form.eligible,
              form_received: form.form_received,
              applied: form.applied,
              appeared: form.appeared,
              selected: form.selected,
              admitted: form.admitted,
              application_number: form.application_number,
              roll_number: form.roll_number,
              math: form.math,
              english: form.english,
              reasoning: form.reasoning,
              evs: form.evs,
            })}
            style={{ padding: "8px 18px", borderRadius: 7, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main AdmissionsPage ───────────────────────────────────────────────────────
export default function AdmissionsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.title === "Admin";

  const [year, setYear] = useState(CURRENT_YEAR);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(() => window.innerWidth > 640);
  const [filterDistrict, setFilterDistrict] = useState<number | "">("");
  const [filterCluster, setFilterCluster] = useState<number | "">("");
  const [showAdd, setShowAdd] = useState(false);
  const [editExam, setEditExam] = useState<StudentExam | null>(null);

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ["student-exams", year],
    queryFn: () => listExams({ school_start_year: year }),
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => listStudents(),
  });

  const { data: schools = [] } = useQuery({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
  });

  const { data: allKutirs = [] } = useQuery({ queryKey: ["all-kutirs"], queryFn: () => listKutirs() });
  const { data: allDistricts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { data: allAreas = [] } = useQuery({ queryKey: ["all-areas"], queryFn: () => listAreas() });
  const { data: allClusters = [] } = useQuery({ queryKey: ["all-clusters"], queryFn: () => listClusters() });

  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
  const schoolMap = Object.fromEntries(schools.map(sc => [sc.id, sc]));

  const addMut = useMutation({
    mutationFn: createExam,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["student-exams"] }); setShowAdd(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<StudentExamCreate> }) => updateExam(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["student-exams"] }); setEditExam(null); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteExam,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student-exams"] }),
  });

  const kutirMap2 = new Map(allKutirs.map(k => [k.id, k]));
  const areaMap = new Map(allAreas.map(a => [a.id, a]));
  const clusterMap = new Map(allClusters.map(c => [c.id, c]));
  const filterClusters = allClusters.filter(c => filterDistrict === "" || areaMap.get(c.area_id)?.district_id === filterDistrict);
  const filtered = exams.filter(e => {
    const s = studentMap[e.student_id];
    if (search && s) {
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      if (!name.includes(search.toLowerCase())) return false;
    }
    if (filterCluster !== "" || filterDistrict !== "") {
      const kutir = s?.kutir_id != null ? kutirMap2.get(s.kutir_id) : null;
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

  // Stage counts for header stat chips
  const stageCounts = STAGES.map(stage => ({
    label: stage.label,
    count: exams.filter(e => e[stage.key as StageKey]).length,
  }));

  function exportCsv() {
    const headers = ["Student", "School", "Stage", "Math", "English", "Reasoning", "EVS", "Total"];
    const rows = filtered.map(e => {
      const s = studentMap[e.student_id];
      const name = s ? `${s.first_name} ${s.last_name}` : e.student_id;
      const total = [e.math, e.english, e.reasoning, e.evs].filter(v => v != null).reduce((a,b) => (a as number)+(b as number), 0);
      const status = e.admitted ? "Admitted" : e.selected ? "Selected" : e.appeared ? "Appeared" : e.applied ? "Applied" : e.form_received ? "Form Received" : "Eligible";
      return [name, e.school ?? "", status, e.math ?? "", e.english ?? "", e.reasoning ?? "", e.evs ?? "", total];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: "data:text/csv," + encodeURIComponent(csv), download: "admissions.csv" });
    a.click();
  }

  function printTable() {
    const w = window.open("", "_blank")!;
    const rows = filtered.map(e => {
      const s = studentMap[e.student_id];
      const name = s ? `${s.first_name} ${s.last_name}` : String(e.student_id);
      const total = [e.math, e.english, e.reasoning, e.evs].filter(v => v != null).reduce((a,b) => (a as number)+(b as number), 0);
      const status = e.admitted ? "Admitted" : e.selected ? "Selected" : e.appeared ? "Appeared" : e.applied ? "Applied" : e.form_received ? "Form Received" : "Eligible";
      return `<tr><td>${name}</td><td>${e.school ?? ""}</td><td>${status}</td><td>${e.math ?? ""}</td><td>${e.english ?? ""}</td><td>${e.reasoning ?? ""}</td><td>${e.evs ?? ""}</td><td>${total}</td></tr>`;
    }).join("");
    w.document.write(`<html><head><title>Admissions</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 10px;font-size:13px}th{background:#f0f4ff}</style></head><body><h2>Admissions</h2><table><thead><tr><th>Student</th><th>School</th><th>Stage</th><th>Math</th><th>English</th><th>Reasoning</th><th>EVS</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print();
  }

  return (
    <div className="grs-page" style={{ padding: "24px 28px", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Admissions</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
            School entrance exam pipeline tracking
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={exportCsv} title="Export CSV" className="grs-ibtn" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", border: "1px solid #cbd5e0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.8rem", color: "#4a5568", fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span className="grs-lbl">Export CSV</span>
          </button>
          <button onClick={printTable} title="Print" className="grs-ibtn" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", border: "1px solid #cbd5e0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.8rem", color: "#4a5568", fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            <span className="grs-lbl">Print</span>
          </button>
          <button
            onClick={() => setShowAdd(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}
          >
            + Add Application
          </button>
        </div>
      </div>

      {/* Year filter + search */}
      <button className="grs-filter-toggle" onClick={() => setFiltersOpen(o => !o)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        <span>Filters {filtersOpen ? "▲" : "▼"}</span>
      </button>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }} className={filtersOpen ? "grs-fbar" : "grs-fbar grs-fbar--hidden"}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Year:</label>
          {YEARS.map(y => (
            <button
              key={y}
              onClick={() => setYear(y)}
              style={{
                padding: "5px 12px", borderRadius: 20, border: "1px solid var(--border)",
                background: y === year ? "#2563eb" : "transparent",
                color: y === year ? "#fff" : "var(--text-secondary)",
                cursor: "pointer", fontSize: 13, fontWeight: 600
              }}
            >
              {y}
            </button>
          ))}
        </div>
        <input
          placeholder="Search student..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: 14, minWidth: 200 }}
        />
        <select
          value={filterDistrict}
          onChange={e => { setFilterDistrict(e.target.value === "" ? "" : Number(e.target.value)); setFilterCluster(""); }}
          style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: 14, minWidth: 160 }}
        >
          <option value="">All Districts</option>
          {allDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select
          value={filterCluster}
          onChange={e => setFilterCluster(e.target.value === "" ? "" : Number(e.target.value))}
          disabled={filterDistrict === ""}
          style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: 14, minWidth: 160 }}
        >
          <option value="">All Clusters</option>
          {filterClusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Stage counts */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {stageCounts.map((s, i) => (
          <div key={i} style={{ padding: "6px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }}>
            <span style={{ color: "var(--text-secondary)" }}>{s.label}: </span>
            <strong style={{ color: "var(--text-primary)" }}>{s.count}</strong>
          </div>
        ))}
        <div style={{ padding: "6px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }}>
          <span style={{ color: "var(--text-secondary)" }}>Total: </span>
          <strong style={{ color: "var(--text-primary)" }}>{exams.length}</strong>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
            No applications for {year}.
          </div>
        ) : (
          <>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-thead)" }}>
                  {["Student", "School", "Stage", "Scores", ""].map(h => (
                    <th key={h} style={{
                      padding: "10px 14px", textAlign: "left", fontSize: 12,
                      fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase",
                      letterSpacing: "0.05em", borderBottom: "1px solid var(--border)"
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((exam, idx) => {
                  const s = studentMap[exam.student_id];
                  const sc = schoolMap[exam.school_id] || exam.school;
                  const totalScore = [exam.math, exam.english, exam.reasoning, exam.evs]
                    .filter(v => v !== null && v !== undefined)
                    .reduce((a, b) => (a as number) + (b as number), 0);
                  const hasScore = [exam.math, exam.english, exam.reasoning, exam.evs].some(v => v !== null && v !== undefined);
                  return (
                    <tr key={exam.id} style={{
                      borderBottom: idx < filtered.length - 1 ? "1px solid var(--border)" : undefined,
                      background: "transparent"
                    }}>
                      <td style={{ padding: "12px 14px" }}>
                        {s ? (
                          <Link to={`/students/${s.id}`} style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
                            {s.first_name} {s.last_name}
                          </Link>
                        ) : `Student #${exam.student_id}`}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--text-secondary)" }}>
                        {sc ? `${sc.name}` : `School #${exam.school_id}`}
                        {sc && <span style={{ marginLeft: 6, fontSize: 11, background: "var(--bg-badge)", padding: "1px 6px", borderRadius: 10, color: "var(--text-secondary)" }}>{sc.school_type}</span>}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <StageBadge exam={exam} />
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                        {hasScore ? (
                          <span>
                            {[exam.math, exam.english, exam.reasoning, exam.evs]
                              .map((v, i) => v !== null && v !== undefined ? (["M","E","R","EVS"][i] + ":" + v) : null)
                              .filter(Boolean).join(" ")}
                            {" "}
                            <strong style={{ color: "var(--text-primary)" }}>= {totalScore}</strong>
                          </span>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button
                            onClick={() => setEditExam(exam)}
                            style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}
                          >
                            Edit
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => { if (confirm("Delete this application?")) deleteMut.mutate(exam.id); }}
                              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #fca5a5", background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: 13 }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <AddModal
          students={students}
          schools={schools}
          year={year}
          onClose={() => setShowAdd(false)}
          onSave={data => addMut.mutate(data)}
        />
      )}

      {editExam && (
        <EditModal
          exam={editExam}
          onClose={() => setEditExam(null)}
          onSave={data => updateMut.mutate({ id: editExam.id, data })}
        />
      )}
    </div>
  );
}
