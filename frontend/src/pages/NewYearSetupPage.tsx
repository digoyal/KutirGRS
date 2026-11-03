import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listStudents } from "../api/students";
import { listKutirs, type Kutir } from "../api/kutirs";
import { listDistricts, listAreas, listClusters } from "../api/geo";
import { createProgress, listProgress, listExams, type StudentExam } from "../api/admissions";
import { useAuth } from "../context/AuthContext";
import { hasGlobalDataScope } from "../constants/roles";
import { GeoFilterBar } from "../components/GeoFilterBar";
import { scopeDistricts, scopeKutirs, type FilterId } from "../utils/geoFilters";
import { studentLabel } from "../utils/studentLabel";

const BULK_LIMIT = 5000;

export default function NewYearSetupPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const unscoped = hasGlobalDataScope(user?.title);
  const [filterDistrict, setFilterDistrict] = useState<FilterId>("");
  const [filterKutir, setFilterKutir] = useState<FilterId>("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: allStudents = [] } = useQuery({
    queryKey: ["students-names"],
    queryFn: () => listStudents({ name_only: true }),
  });
  const { data: allKutirs = [] } = useQuery<Kutir[]>({
    queryKey: ["all-kutirs"],
    queryFn: () => listKutirs(),
  });
  const { data: allDistricts = [] } = useQuery({
    queryKey: ["districts", { parivaar_presence: true }],
    queryFn: () => listDistricts(undefined, { parivaar_presence: true }),
  });
  const { data: allAreas = [] } = useQuery({ queryKey: ["all-areas"], queryFn: () => listAreas() });
  const { data: allClusters = [] } = useQuery({
    queryKey: ["all-clusters"],
    queryFn: () => listClusters(),
  });
  const { data: existingProgress = [] } = useQuery({
    queryKey: ["progress", "bulk-all"],
    queryFn: () => listProgress({ limit: BULK_LIMIT }),
  });
  const { data: admittedExams = [] } = useQuery<StudentExam[]>({
    queryKey: ["exams", "admitted"],
    queryFn: () => listExams({ admitted: true }),
  });

  const kutirMap = new Map(allKutirs.map((k) => [k.id, k]));
  const areaMap = new Map(allAreas.map((a) => [a.id, a]));
  const clusterMap = new Map(allClusters.map((c) => [c.id, c]));

  const progressStudentIds = useMemo(
    () => new Set(existingProgress.map((p) => p.student_id)),
    [existingProgress],
  );

  const admittedByStudent = useMemo(() => {
    const m = new Map<number, StudentExam>();
    for (const e of admittedExams) {
      if (!m.has(e.student_id)) m.set(e.student_id, e);
    }
    return m;
  }, [admittedExams]);

  const scopedDistricts = scopeDistricts(allDistricts, user, unscoped);
  const scopedKutirs = scopeKutirs(allKutirs, user, unscoped);

  useEffect(() => {
    if (scopedDistricts.length === 1) setFilterDistrict(scopedDistricts[0].id);
  }, [scopedDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const missingRows = useMemo(() => {
    return allStudents.filter((s) => {
      if (!s.kutir_id) return false;
      if (progressStudentIds.has(s.id)) return false;
      const exam = admittedByStudent.get(s.id);
      if (!exam?.admitted || !exam.admitted_school_id || exam.admission_class == null) return false;
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
  }, [
    allStudents,
    progressStudentIds,
    admittedByStudent,
    filterDistrict,
    filterKutir,
    kutirMap,
    clusterMap,
    areaMap,
  ]);

  async function handleSave() {
    if (missingRows.length === 0) {
      setError("No admitted students without a progress record in this filter.");
      return;
    }
    setSaving(true);
    setError(null);
    let created = 0;
    let skipped = 0;
    for (const s of missingRows) {
      const exam = admittedByStudent.get(s.id)!;
      try {
        await createProgress({
          student_id: s.id,
          school_id: exam.admitted_school_id!,
          academic_year: exam.school_start_year + 1,
          class_in_year: exam.admission_class! + 1,
          track: exam.admission_class === 8 ? "nine_twelve" : "six_twelve",
          status: "enrolled",
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

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      <h2 style={{ margin: "0 0 4px", color: "var(--text-primary)" }}>Bulk Progress Update</h2>
      <p style={{ margin: "0 0 20px", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
        Progress is created automatically when a student is <strong>Admitted</strong>. Use this page
        only to backfill missing journey records for admitted students (one record per student).
      </p>

      <GeoFilterBar
        labeled
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
            <button
              type="button"
              onClick={handleSave}
              style={{
                background: "var(--badge-purple-fg)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "7px 18px",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
              disabled={saving || missingRows.length === 0}
            >
              {saving ? "Saving…" : `Create ${missingRows.length} Records`}
            </button>
          </div>
        }
      />

      {error && (
        <div
          style={{
            background: "var(--status-danger-bg)",
            border: "1px solid var(--badge-red-fg)",
            color: "var(--status-danger-fg)",
            borderRadius: 6,
            padding: "8px 14px",
            margin: "14px 0",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div
          style={{
            background: "var(--status-success-bg)",
            border: "1px solid var(--status-success-fg)",
            color: "var(--status-success-fg)",
            borderRadius: 6,
            padding: "8px 14px",
            margin: "14px 0",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          ✓ Created {result.created} records
          {result.skipped > 0 ? `, ${result.skipped} skipped` : ""}.
        </div>
      )}

      {missingRows.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", marginTop: 16 }}>No missing progress records for these filters.</p>
      ) : (
        <ul style={{ marginTop: 16, paddingLeft: 20, color: "var(--text-primary)" }}>
          {missingRows.map((s) => (
            <li key={s.id} style={{ marginBottom: 4 }}>
              {studentLabel(s)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
