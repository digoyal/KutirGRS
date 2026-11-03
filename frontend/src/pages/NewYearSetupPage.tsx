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
import type { Student } from "../api/students";

const BULK_LIMIT = 5000;

type BulkAdmittedRow = {
  student: Student;
  exam: StudentExam;
  hasProgress: boolean;
};

function admittedSchoolId(exam: StudentExam): number | null {
  return exam.admitted_school_id ?? exam.school_id ?? null;
}

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
    staleTime: 0,
  });
  const { data: admittedExams = [] } = useQuery<StudentExam[]>({
    queryKey: ["exams", "admitted"],
    queryFn: () => listExams({ admitted: true }),
    staleTime: 0,
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

  const admittedRows = useMemo((): BulkAdmittedRow[] => {
    const rows: BulkAdmittedRow[] = [];
    for (const s of allStudents) {
      if (!s.kutir_id) continue;
      const exam = admittedByStudent.get(s.id);
      if (!exam?.admitted || exam.admission_class == null) continue;
      if (admittedSchoolId(exam) == null) continue;
      if (filterKutir !== "" && s.kutir_id !== filterKutir) continue;
      if (filterDistrict !== "") {
        const kutir = kutirMap.get(s.kutir_id);
        if (!kutir) continue;
        const cl = clusterMap.get(kutir.cluster_id);
        if (!cl) continue;
        const ar = areaMap.get(cl.area_id);
        if (!ar || ar.district_id !== filterDistrict) continue;
      }
      rows.push({
        student: s,
        exam,
        hasProgress: progressStudentIds.has(s.id),
      });
    }
    rows.sort((a, b) => studentLabel(a.student).localeCompare(studentLabel(b.student)));
    return rows;
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

  const missingRows = useMemo(
    () => admittedRows.filter((r) => !r.hasProgress),
    [admittedRows],
  );

  async function handleSave() {
    if (missingRows.length === 0) {
      setError("No admitted students without a progress record in this filter.");
      return;
    }
    setSaving(true);
    setError(null);
    let created = 0;
    let skipped = 0;
    for (const { student: s, exam } of missingRows) {
      const schoolId = admittedSchoolId(exam);
      if (schoolId == null || exam.admission_class == null) {
        skipped++;
        continue;
      }
      try {
        await createProgress({
          student_id: s.id,
          school_id: schoolId,
          academic_year: exam.school_start_year + 1,
          class_in_year: exam.admission_class + 1,
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
        Saving an admission as <strong>Admitted</strong> creates a Progress record automatically.
        This page lists all admitted students in your filters: use <strong>Create</strong> only for
        rows marked missing a record (legacy backfill). Students who already have Progress appear
        for review — open them from the Progress menu.
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

      {admittedRows.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", marginTop: 16 }}>
          No admitted students match these filters.
        </p>
      ) : (
        <div style={{ marginTop: 16, overflowX: "auto" }}>
          <p style={{ margin: "0 0 10px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            {missingRows.length} missing record{missingRows.length === 1 ? "" : "s"},{" "}
            {admittedRows.length - missingRows.length} already on Progress.
          </p>
          <table className="grs-table" style={{ minWidth: 420 }}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Progress record</th>
              </tr>
            </thead>
            <tbody>
              {admittedRows.map(({ student, hasProgress }) => (
                <tr key={student.id}>
                  <td>{studentLabel(student)}</td>
                  <td>
                    {hasProgress ? (
                      <span style={{ color: "var(--status-success-fg)", fontWeight: 600 }}>
                        Exists (created on Admit)
                      </span>
                    ) : (
                      <span style={{ color: "var(--badge-purple-fg)", fontWeight: 600 }}>
                        Missing — will backfill
                      </span>
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
