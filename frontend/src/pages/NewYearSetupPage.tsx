import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listStudents } from "../api/students";
import { listSchools, type School } from "../api/schools";
import { listKutirs, type Kutir } from "../api/kutirs";
import { listDistricts, listAreas, listClusters } from "../api/geo";
import { createProgress, listProgress, listExams, type StudentProgress, type StudentExam } from "../api/admissions";
import { grs } from "../styles/grs";

const CURRENT_YEAR = new Date().getFullYear();

interface RowState {
  student_id: number;
  first_name: string;
  last_name: string;
  class_in_year: number | null;
  school_id: number | null;
  previous_year_percentage: string;
  exists: boolean;   // already has a record for this year
}

const inp: React.CSSProperties = {
  padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 6,
  background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "0.85rem",
  width: "100%", boxSizing: "border-box",
};

const btnPrimary: React.CSSProperties = {
  background: "var(--badge-purple-fg)", color: "#fff", border: "none",
  borderRadius: 6, padding: "7px 18px", fontWeight: 600, fontSize: "0.875rem",
  cursor: "pointer",
};

export default function NewYearSetupPage() {
  const qc = useQueryClient();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [filterDistrict, setFilterDistrict] = useState<number | "">("");
  const [filterKutir, setFilterKutir] = useState<number | "">("");
  const [rows, setRows] = useState<RowState[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: allStudents = [] } = useQuery({
    queryKey: ["students-names"],
    queryFn: () => listStudents({ name_only: true }),
  });
  const { data: schools = [] } = useQuery<School[]>({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
  });
  const { data: allKutirs = [] } = useQuery<Kutir[]>({
    queryKey: ["all-kutirs"],
    queryFn: () => listKutirs(),
  });
  const { data: allDistricts = [] } = useQuery({
    queryKey: ["all-districts"],
    queryFn: () => listDistricts(),
  });
  const { data: allAreas = [] } = useQuery({
    queryKey: ["all-areas"],
    queryFn: () => listAreas(),
  });
  const { data: allClusters = [] } = useQuery({
    queryKey: ["all-clusters"],
    queryFn: () => listClusters(),
  });
  const { data: existingProgress = [] } = useQuery<StudentProgress[]>({
    queryKey: ["progress", year],
    queryFn: () => listProgress({ academic_year: year }),
  });
  const { data: prevProgress = [] } = useQuery<StudentProgress[]>({
    queryKey: ["progress", year - 1],
    queryFn: () => listProgress({ academic_year: year - 1 }),
  });
  const { data: allExams = [] } = useQuery<StudentExam[]>({
    queryKey: ["all-exams"],
    queryFn: () => listExams(),
  });

  const kutirMap = new Map(allKutirs.map(k => [k.id, k]));
  const areaMap = new Map(allAreas.map(a => [a.id, a]));
  const clusterMap = new Map(allClusters.map(c => [c.id, c]));

  // Set of student IDs with at least one admitted exam record
  const admittedStudentIds = new Set(allExams.filter(e => e.admitted).map(e => e.student_id));

  // Map: student_id → school_id from last year's progress record
  const prevSchoolMap = new Map(prevProgress.map(p => [p.student_id, p.school_id]));
  // Map: student_id → admitted_school_id from admitted exam record
  const admittedSchoolMap = new Map(
    allExams.filter(e => e.admitted && e.admitted_school_id != null)
            .map(e => [e.student_id, e.admitted_school_id as number])
  );

  // Kutirs filtered by selected district
  const filteredKutirs = allKutirs.filter(k => {
    if (filterDistrict === "") return true;
    const cl = clusterMap.get(k.cluster_id);
    if (!cl) return false;
    const ar = areaMap.get(cl.area_id);
    return ar?.district_id === filterDistrict;
  });

  // Rebuild rows whenever filters or students change
  useEffect(() => {
    const defaultSchool = schools.find(s => s.name.toLowerCase().includes("local govt"));
    const existingSet = new Set(existingProgress.map(p => p.student_id));
    const filtered = allStudents.filter(s => {
      if (!s.kutir_id) return false;
      if (!admittedStudentIds.has(s.id)) return false;
      if (filterKutir !== "" && s.kutir_id !== filterKutir) return false;
      if (filterDistrict !== "") {
        const kutir = kutirMap.get(s.kutir_id);
        if (!kutir) return false;
        const cl = clusterMap.get(kutir.cluster_id);
        if (!cl) return false;
        const ar = areaMap.get(cl.area_id);
        if (!ar || ar.district_id !== filterDistrict) return false;
      }
      return true;
    });

    setRows(filtered.map(s => ({
      student_id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      class_in_year: null,
      school_id: prevSchoolMap.get(s.id) ?? admittedSchoolMap.get(s.id) ?? defaultSchool?.id ?? null,
      previous_year_percentage: "",
      exists: existingSet.has(s.id),
    })));
    setResult(null);
  }, [allStudents, filterDistrict, filterKutir, existingProgress, prevProgress, schools, allExams]);

  function updateRow(idx: number, field: keyof RowState, value: unknown) {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  async function handleSave() {
    const toCreate = rows.filter(r => !r.exists && r.class_in_year && r.school_id);
    if (toCreate.length === 0) {
      setError("No complete rows to save. Fill in Class and School for at least one student.");
      return;
    }
    setSaving(true);
    setError(null);
    let created = 0;
    let skipped = 0;
    for (const r of toCreate) {
      try {
        await createProgress({
          student_id: r.student_id,
          school_id: r.school_id!,
          academic_year: year,
          class_in_year: r.class_in_year,
          status: "enrolled",
          previous_year_percentage: r.previous_year_percentage !== "" ? Number(r.previous_year_percentage) : null,
          transfer_school: null,
          exit_reason: null,
          remarks: null,
        });
        created++;
      } catch {
        skipped++;
      }
    }
    setSaving(false);
    setResult({ created, skipped });
    qc.invalidateQueries({ queryKey: ["progress"] });
  }

  const readyCount = rows.filter(r => !r.exists && r.class_in_year && r.school_id).length;

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      <h2 style={{ margin: "0 0 4px", color: "var(--text-primary)" }}>New Year Setup</h2>
      <p style={{ margin: "0 0 20px", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
        Bulk-create initial progress records for the start of an academic year. Status is set to <strong>Enrolled</strong> automatically.
      </p>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={{ ...grs.fieldLabel, display: "block", marginBottom: 4 }}>Academic Year</label>
          <select style={grs.filterSelect} value={year} onChange={e => setYear(Number(e.target.value))}>
            {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => (
              <option key={y} value={y}>{y}-{String(y + 1).slice(2)}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ ...grs.fieldLabel, display: "block", marginBottom: 4 }}>District</label>
          <select
            style={grs.filterSelect}
            value={filterDistrict}
            onChange={e => { setFilterDistrict(e.target.value === "" ? "" : Number(e.target.value)); setFilterKutir(""); }}
          >
            <option value="">All Districts</option>
            {allDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ ...grs.fieldLabel, display: "block", marginBottom: 4 }}>Kutir</label>
          <select
            style={grs.filterSelect}
            value={filterKutir}
            onChange={e => setFilterKutir(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">All Kutirs</option>
            {filteredKutirs.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "flex-end" }}>
          <button onClick={handleSave} style={btnPrimary} disabled={saving || readyCount === 0}>
            {saving ? "Saving…" : `Save ${readyCount} Records`}
          </button>
        </div>
      </div>

      {/* Status bar */}
      {rows.length > 0 && (
        <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
          <span><strong style={{ color: "var(--text-primary)" }}>{rows.length}</strong> students shown</span>
          <span><strong style={{ color: "var(--text-primary)" }}>{rows.filter(r => r.exists).length}</strong> already have records</span>
          <span><strong style={{ color: "var(--badge-purple-fg)" }}>{readyCount}</strong> ready to save</span>
        </div>
      )}

      {error && (
        <div style={{ background: "var(--status-danger-bg)", border: "1px solid var(--badge-red-fg)", color: "var(--status-danger-fg)", borderRadius: 6, padding: "8px 14px", marginBottom: 14, fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ background: "var(--status-success-bg)", border: "1px solid var(--status-success-fg)", color: "var(--status-success-fg)", borderRadius: 6, padding: "8px 14px", marginBottom: 14, fontSize: "0.85rem", fontWeight: 600 }}>
          ✓ Created {result.created} records{result.skipped > 0 ? `, ${result.skipped} skipped (duplicates)` : ""}.
        </div>
      )}

      {/* Grid */}
      {rows.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>No students found for the selected filters.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "var(--badge-purple-bg)" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)" }}>Student</th>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)", width: 110 }}>Class *</th>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)" }}>School *</th>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)", width: 130 }}>Prev Year %</th>

              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.student_id} style={{ background: idx % 2 === 0 ? "var(--bg-card)" : "var(--badge-purple-bg)", opacity: r.exists ? 0.5 : 1 }}>
                  <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--border)", fontWeight: 600, color: "var(--text-primary)" }}>
                    <span>{r.first_name} {r.last_name}</span>
                    {r.exists && (
                      <span style={{ marginLeft: 8, background: "var(--status-success-bg)", color: "var(--status-success-fg)", borderRadius: 4, padding: "2px 8px", fontSize: "0.75rem", fontWeight: 600 }}>✓ Done</span>
                    )}
                  </td>
                  <td style={{ padding: "4px 12px", borderBottom: "1px solid var(--border)" }}>
                    {r.exists ? (
                      <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>—</span>
                    ) : (
                      <select
                        style={inp}
                        value={r.class_in_year ?? ""}
                        onChange={e => updateRow(idx, "class_in_year", e.target.value === "" ? null : Number(e.target.value))}
                      >
                        <option value="">—</option>
                        {[5, 8].map(c => <option key={c} value={c}>Class {c}</option>)}
                      </select>
                    )}
                  </td>
                  <td style={{ padding: "4px 12px", borderBottom: "1px solid var(--border)" }}>
                    {r.exists ? (
                      <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>—</span>
                    ) : (
                      <select
                        style={inp}
                        value={r.school_id ?? ""}
                        onChange={e => updateRow(idx, "school_id", e.target.value === "" ? null : Number(e.target.value))}
                      >
                        <option value="">— select —</option>
                        {schools.map(s => <option key={s.id} value={s.id}>{s.name} ({s.school_type})</option>)}
                      </select>
                    )}
                  </td>
                  <td style={{ padding: "4px 12px", borderBottom: "1px solid var(--border)" }}>
                    {r.exists ? (
                      <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>—</span>
                    ) : (
                      <input
                        type="number" min={0} max={100} step={0.1}
                        style={inp}
                        placeholder="optional"
                        value={r.previous_year_percentage}
                        onChange={e => updateRow(idx, "previous_year_percentage", e.target.value)}
                      />
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
