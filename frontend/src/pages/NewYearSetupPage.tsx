import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listStudents } from "../api/students";
import { listSchools, type School } from "../api/schools";
import { listKutirs, type Kutir } from "../api/kutirs";
import { listDistricts, listAreas, listClusters } from "../api/geo";
import { createProgress, listProgress, listExams, type StudentProgress, type StudentExam } from "../api/admissions";
import { grs } from "../styles/grs";
import { useAuth } from "../context/AuthContext";
import { hasGlobalDataScope } from "../constants/roles";
import { GeoFilterBar } from "../components/GeoFilterBar";
import { scopeDistricts, scopeKutirs, type FilterId } from "../utils/geoFilters";
import { studentLabel } from "../utils/studentLabel";

const CURRENT_YEAR = new Date().getFullYear();
/** Base New Class options (1–12). Extra values from defaults are merged per render so they display. */
const CLASS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
/** Unpaginated fetch for bulk setup (API defaults to 25). */
const BULK_LIMIT = 5000;

interface RowState {
  student_id: number;
  first_name: string;
  last_name: string;
  father_name: string | null;
  class_in_year: number | null;
  school_id: number | null;
  previous_year_percentage: string;
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

/** Prior Progress class → New Class = that + 1 (always when source exists; do not drop for option list). */
function bumpClass(prev: number | null | undefined): number | null {
  if (prev == null || Number.isNaN(Number(prev))) return null;
  return Number(prev) + 1;
}

/** Admitted exam `admission_class` (5 or 8) used as-is when no usable prior Progress class. */
function classFromAdmission(admissionClass: number | null | undefined): number | null {
  if (admissionClass == null || Number.isNaN(Number(admissionClass))) return null;
  return Number(admissionClass);
}

function classSelectOptions(selected: number | null): number[] {
  if (selected == null || CLASS_OPTIONS.includes(selected)) return CLASS_OPTIONS;
  return [...CLASS_OPTIONS, selected].sort((a, b) => a - b);
}

export default function NewYearSetupPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const unscoped = hasGlobalDataScope(user?.title);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [filterDistrict, setFilterDistrict] = useState<FilterId>("");
  const [filterKutir, setFilterKutir] = useState<FilterId>("");
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
    queryKey: ["districts", { parivaar_presence: true }],
    queryFn: () => listDistricts(undefined, { parivaar_presence: true }),
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
    queryKey: ["progress", year, "bulk"],
    queryFn: () => listProgress({ academic_year: year, limit: BULK_LIMIT }),
  });
  const { data: prevProgress = [] } = useQuery<StudentProgress[]>({
    queryKey: ["progress", year - 1, "bulk"],
    queryFn: () => listProgress({ academic_year: year - 1, limit: BULK_LIMIT }),
  });
  // Broader progress for class/school defaults when year-1 row is missing or class_in_year null
  const { data: recentProgress = [] } = useQuery<StudentProgress[]>({
    queryKey: ["progress", "bulk-recent"],
    queryFn: () => listProgress({ limit: BULK_LIMIT }),
  });
  // admitted=true skips server pagination — full Admitted set for inclusion
  const { data: admittedExams = [] } = useQuery<StudentExam[]>({
    queryKey: ["exams", "admitted"],
    queryFn: () => listExams({ admitted: true }),
  });

  const kutirMap = new Map(allKutirs.map(k => [k.id, k]));
  const areaMap = new Map(allAreas.map(a => [a.id, a]));
  const clusterMap = new Map(allClusters.map(c => [c.id, c]));
  const schoolMap = new Map(schools.map(s => [s.id, s]));

  // Inclusion = prior-year Progress ∪ Admitted (deduped below)
  const admittedStudentIds = new Set(admittedExams.map(e => e.student_id));
  const prevProgressStudentIds = new Set(prevProgress.map(p => p.student_id));

  // Map: student_id → last year's progress (inclusion / preferred source)
  const prevByStudent = new Map(prevProgress.map(p => [p.student_id, p]));
  // Latest Progress before target year with a class (any status) — for enrolled gaps
  const priorClassSourceByStudent = new Map<number, StudentProgress>();
  for (const p of recentProgress) {
    if (p.academic_year >= year) continue;
    if (p.class_in_year == null) continue;
    const cur = priorClassSourceByStudent.get(p.student_id);
    if (!cur || p.academic_year > cur.academic_year) priorClassSourceByStudent.set(p.student_id, p);
  }
  // Prefer the admitted exam row (one admitted per student in product rules)
  const admittedByStudent = new Map<number, StudentExam>();
  for (const e of admittedExams) {
    if (!admittedByStudent.has(e.student_id)) admittedByStudent.set(e.student_id, e);
  }

  const scopedDistricts = scopeDistricts(allDistricts, user, unscoped);
  const scopedKutirs = scopeKutirs(allKutirs, user, unscoped);

  // Auto-select single assigned district for non-admin users
  useEffect(() => {
    if (scopedDistricts.length === 1) setFilterDistrict(scopedDistricts[0].id);
  }, [scopedDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild rows whenever filters or students change
  useEffect(() => {
    // Already have Progress for the selected target year — omit from list entirely
    const alreadyForTargetYear = new Set(existingProgress.map(p => p.student_id));
    const filtered = allStudents.filter(s => {
      if (!s.kutir_id) return false;
      if (alreadyForTargetYear.has(s.id)) return false;
      // Union: prior Progress OR Admitted; Set dedupes overlap
      if (!prevProgressStudentIds.has(s.id) && !admittedStudentIds.has(s.id)) return false;
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

    setRows(filtered.map(s => {
      const prev = prevByStudent.get(s.id);
      const priorWithClass = priorClassSourceByStudent.get(s.id);
      const adm = admittedByStudent.get(s.id);
      // 1) year-1 Progress class → +1
      // 2) else latest earlier Progress with class → +1
      // 3) else admission_class as-is (nullable on exam — may still be blank)
      const class_in_year =
        bumpClass(prev?.class_in_year) ??
        bumpClass(priorWithClass?.class_in_year) ??
        classFromAdmission(adm?.admission_class);
      return {
        student_id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        father_name: s.father_name ?? null,
        class_in_year,
        school_id: prev?.school_id ?? priorWithClass?.school_id ?? adm?.admitted_school_id ?? null,
        previous_year_percentage: "",
      };
    }));
    setResult(null);
  }, [allStudents, filterDistrict, filterKutir, existingProgress, prevProgress, recentProgress, schools, admittedExams, year]);

  function updateRow(idx: number, field: keyof RowState, value: unknown) {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  async function handleSave() {
    const toCreate = rows.filter(r => r.class_in_year && r.school_id);
    if (toCreate.length === 0) {
      setError("No complete rows to save. Fill in New Class for at least one student (School comes from prior progress / admission).");
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
        // Safety: API may still reject duplicates if row appeared after list load
        skipped++;
      }
    }
    setSaving(false);
    setResult({ created, skipped });
    qc.invalidateQueries({ queryKey: ["progress"] });
  }

  const readyCount = rows.filter(r => r.class_in_year && r.school_id).length;

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      <h2 style={{ margin: "0 0 4px", color: "var(--text-primary)" }}>Bulk Progress Update</h2>
      <p style={{ margin: "0 0 20px", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
        Bulk-create initial progress records for the start of an academic year. Status is set to <strong>Enrolled</strong> automatically. Use Progress menu for all other changes.
      </p>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        <GeoFilterBar
          labeled
          leading={
            <div>
              <label style={{ ...grs.fieldLabel, display: "block", marginBottom: 4 }}>Academic Year</label>
              <select style={grs.filterSelect} value={year} onChange={e => setYear(Number(e.target.value))}>
                {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => (
                  <option key={y} value={y}>{y}-{String(y + 1).slice(2)}</option>
                ))}
              </select>
            </div>
          }
          district={filterDistrict}
          kutir={filterKutir}
          onChange={({ district, kutir }) => {
            setFilterDistrict(district);
            setFilterKutir(kutir);
          }}
          districts={scopedDistricts}
          clusters={allClusters}
          areas={allAreas}
          kutirs={scopedKutirs}
          showCluster={false}
          kutirMode="by-district"
          kutirDisable="never"
          trailing={
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "flex-end" }}>
              <button onClick={handleSave} style={btnPrimary} disabled={saving || readyCount === 0}>
                {saving ? "Saving…" : `Save ${readyCount} Records`}
              </button>
            </div>
          }
        />
      </div>

      {/* Status bar */}
      {rows.length > 0 && (
        <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
          <span><strong style={{ color: "var(--text-primary)" }}>{rows.length}</strong> students shown</span>
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
                <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)", width: 110 }}>New Class *</th>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)" }}>School *</th>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)", width: 150 }}>Prev Year Marks %</th>

              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const school = r.school_id != null ? schoolMap.get(r.school_id) : undefined;
                const schoolText = school
                  ? `${school.name} (${school.school_type})`
                  : r.school_id != null
                    ? `School #${r.school_id}`
                    : "—";
                return (
                <tr key={r.student_id} style={{ background: idx % 2 === 0 ? "var(--bg-card)" : "var(--badge-purple-bg)" }}>
                  <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--border)", fontWeight: 600, color: "var(--text-primary)" }}>
                    <span>{studentLabel(r)}</span>
                  </td>
                  <td style={{ padding: "4px 12px", borderBottom: "1px solid var(--border)" }}>
                    <select
                      style={inp}
                      value={r.class_in_year ?? ""}
                      onChange={e => updateRow(idx, "class_in_year", e.target.value === "" ? null : Number(e.target.value))}
                    >
                      <option value="">—</option>
                      {classSelectOptions(r.class_in_year).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--border)", color: "var(--text-primary)" }}>
                    <span style={{ fontSize: "0.85rem" }}>{schoolText}</span>
                  </td>
                  <td style={{ padding: "4px 12px", borderBottom: "1px solid var(--border)" }}>
                    <input
                      type="number" min={0} max={100} step={0.1}
                      style={inp}
                      placeholder="optional"
                      value={r.previous_year_percentage}
                      onChange={e => updateRow(idx, "previous_year_percentage", e.target.value)}
                    />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
