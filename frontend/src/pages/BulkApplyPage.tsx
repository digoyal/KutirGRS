import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listStudents, type Student } from "../api/students";
import { listKutirs, type Kutir } from "../api/kutirs";
import { listDistricts, listAreas, listClusters } from "../api/geo";
import { createExam, type StudentExamCreate } from "../api/admissions";
import { normalizePipelineStages } from "../components/admissions-pipeline";
import { useAuth } from "../context/AuthContext";
import { hasGlobalDataScope } from "../constants/roles";
import { GeoFilterBar } from "../components/GeoFilterBar";
import {
  defaultsFromUser,
  scopeClusters,
  scopeDistricts,
  scopeKutirs,
  type FilterId,
} from "../utils/geoFilters";
import { useGeoFilterAutoSelect } from "../hooks/useGeoFilterAutoSelect";
import { studentLabel } from "../utils/studentLabel";
import { apiErrorDetail } from "../utils/apiError";
import { invalidateAdmissionCaches } from "../utils/invalidateAdmissionCaches";
import { MultiSelectList, type MultiSelectListItem } from "@parivaar/ui";
import type { Area, Cluster } from "../api/geo";

type AdmissionClass = 5 | 8;

const CURRENT_YEAR = new Date().getFullYear();

const DOB_BY_CLASS: Record<
  AdmissionClass,
  { start: string; end: string; display: string }
> = {
  5: {
    start: "2015-01-05",
    end: "2017-07-31",
    display: "Jan 05, 2015 – Jul 31, 2017",
  },
  8: {
    start: "2012-05-01",
    end: "2014-07-31",
    display: "May 01, 2012 – Jul 31, 2014",
  },
};

function dobInInclusiveRange(dob: string | null, start: string, end: string): boolean {
  if (!dob?.trim()) return false;
  const day = dob.slice(0, 10);
  return day >= start && day <= end;
}

function studentPassesGeo(
  s: Student,
  filterDistrict: FilterId,
  filterCluster: FilterId,
  filterKutir: FilterId,
  kutirMap: Map<number, Kutir>,
  clusterMap: Map<number, Cluster>,
  areaMap: Map<number, Area>,
): boolean {
  if (!s.kutir_id) return false;
  if (filterKutir !== "" && s.kutir_id !== filterKutir) return false;
  const kutir = kutirMap.get(s.kutir_id);
  if (!kutir) return false;
  if (filterCluster !== "" && kutir.cluster_id !== filterCluster) return false;
  if (filterDistrict !== "") {
    const cl = clusterMap.get(kutir.cluster_id);
    if (!cl) return false;
    const ar = areaMap.get(cl.area_id);
    if (!ar || ar.district_id !== filterDistrict) return false;
  }
  return true;
}

function rowLabel(student: Student, kutirMap: Map<number, Kutir>): string {
  const kutir = student.kutir_id != null ? kutirMap.get(student.kutir_id) : undefined;
  const name = studentLabel(student);
  return kutir ? `${name} — ${kutir.name}` : name;
}

function kutirSecondary(student: Student, kutirMap: Map<number, Kutir>): string {
  if (student.kutir_id == null) return `Student #${student.id}`;
  return kutirMap.get(student.kutir_id)?.name ?? `Kutir #${student.kutir_id}`;
}

function emptyAdmissionCreatePayload(
  studentId: number,
  admissionClass: AdmissionClass,
): StudentExamCreate {
  const stages = normalizePipelineStages({
    eligible: true,
    applied: false,
    admit_card: false,
    appeared: false,
    result_declared: false,
    selected: false,
    admitted: false,
  });
  return {
    student_id: studentId,
    school_id: null,
    school_type: null,
    exam_type_id: null,
    school_start_year: CURRENT_YEAR,
    ...stages,
    admitted_school_id: null,
    no_admit_reason_id: null,
    exam_category_id: null,
    application_number: null,
    exam_center_id: null,
    roll_number: null,
    no_exam_reason_id: null,
    admission_class: admissionClass,
    scores: [],
  };
}

export default function BulkApplyPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const unscoped = hasGlobalDataScope(user?.title);

  const defaults = defaultsFromUser(user);
  const [admissionClass, setAdmissionClass] = useState<AdmissionClass>(5);
  const [filterDistrict, setFilterDistrict] = useState<FilterId>(defaults.district);
  const [filterCluster, setFilterCluster] = useState<FilterId>(defaults.cluster);
  const [filterKutir, setFilterKutir] = useState<FilterId>(defaults.kutir);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    failed: { label: string; detail: string }[];
  } | null>(null);
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

  const kutirMap = useMemo(() => new Map(allKutirs.map((k) => [k.id, k])), [allKutirs]);
  const areaMap = useMemo(() => new Map(allAreas.map((a) => [a.id, a])), [allAreas]);
  const clusterMap = useMemo(() => new Map(allClusters.map((c) => [c.id, c])), [allClusters]);

  const scopedDistricts = scopeDistricts(allDistricts, user, unscoped, {
    areas: allAreas,
    clusters: allClusters,
    kutirs: allKutirs,
  });
  const scopedClusters = scopeClusters(allClusters, user, unscoped);
  const scopedKutirs = scopeKutirs(allKutirs, user, unscoped);

  useGeoFilterAutoSelect({
    scopedDistricts,
    scopedClusters,
    scopedKutirs,
    areas: allAreas,
    filterDistrict,
    filterCluster,
    filterKutir,
    setFilterDistrict,
    setFilterCluster,
    setFilterKutir,
    kutirMode: "by-cluster",
    clusterDisable: "no-district-unless-kutir",
    kutirDisable: "no-cluster-unless-default-kutir",
    defaultCluster: defaults.cluster,
    defaultKutir: defaults.kutir,
    kutirVisibility: "always",
    unscoped,
    clusterMode: "scoped-non-admin",
  });

  const dobRange = DOB_BY_CLASS[admissionClass];

  const eligibleStudents = useMemo(() => {
    const rows: Student[] = [];
    for (const s of allStudents) {
      if ((s.exam_count ?? 0) !== 0) continue;
      if (!dobInInclusiveRange(s.dob, dobRange.start, dobRange.end)) continue;
      if (
        !studentPassesGeo(
          s,
          filterDistrict,
          filterCluster,
          filterKutir,
          kutirMap,
          clusterMap,
          areaMap,
        )
      ) {
        continue;
      }
      rows.push(s);
    }
    rows.sort((a, b) => rowLabel(a, kutirMap).localeCompare(rowLabel(b, kutirMap)));
    return rows;
  }, [
    allStudents,
    admissionClass,
    dobRange.start,
    dobRange.end,
    filterDistrict,
    filterCluster,
    filterKutir,
    kutirMap,
    clusterMap,
    areaMap,
  ]);

  useEffect(() => {
    setSelected(new Set());
    setResult(null);
    setError(null);
  }, [admissionClass, filterDistrict, filterCluster, filterKutir]);

  const eligibleIds = useMemo(() => new Set(eligibleStudents.map((s) => s.id)), [eligibleStudents]);
  const selectedInView = useMemo(
    () => [...selected].filter((id) => eligibleIds.has(id)),
    [selected, eligibleIds],
  );

  const listItems = useMemo((): MultiSelectListItem[] => {
    return eligibleStudents.map((s) => ({
      id: s.id,
      primary: studentLabel(s),
      secondary: kutirSecondary(s, kutirMap),
    }));
  }, [eligibleStudents, kutirMap]);

  async function handleCreate() {
    if (selectedInView.length === 0) {
      setError("Select at least one student.");
      return;
    }
    setSaving(true);
    setError(null);
    setResult(null);
    const failed: { label: string; detail: string }[] = [];
    let created = 0;

    for (const id of selectedInView) {
      const student = eligibleStudents.find((s) => s.id === id);
      const label = student ? rowLabel(student, kutirMap) : `Student #${id}`;
      try {
        await createExam(emptyAdmissionCreatePayload(id, admissionClass));
        created++;
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } catch (e: unknown) {
        failed.push({ label, detail: apiErrorDetail(e) });
      }
    }

    if (created > 0) {
      invalidateAdmissionCaches(qc);
      void qc.invalidateQueries({ queryKey: ["students-names"] });
      void qc.invalidateQueries({ queryKey: ["students"] });
    }

    setSaving(false);
    setResult({ created, failed });
  }

  const fieldControlBase: React.CSSProperties = {
    fontSize: "max(16px, 0.875rem)",
    padding: "7px 10px",
    borderRadius: 8,
    border: "1px solid var(--border, var(--input-border))",
    background: "var(--bg-input, var(--input-bg))",
    color: "var(--text-primary)",
    boxSizing: "border-box",
    minHeight: 40,
  };

  const filterSelectStyle: React.CSSProperties = {
    padding: "7px 10px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    fontSize: "max(16px, 14px)",
    flexShrink: 0,
  };

  return (
    <div className="grs-page grs-bulk-apply-page" style={{ maxWidth: 900 }}>
      <h2 className="grs-page-title grs-bulk-apply-page__title">Bulk Apply</h2>
      <p className="grs-bulk-apply-page__lead">
        Create initial admission records for students with no existing admission (any year), whose
        date of birth matches the class eligibility range. Edit pipeline stages on the Admissions
        detail page afterward.
      </p>

      <div className="grs-bulk-apply-class-dob">
        <label className="grs-bulk-apply-field grs-bulk-apply-field--class">
          <span className="grs-bulk-apply-field__label">Admission class</span>
          <select
            value={admissionClass}
            onChange={(e) => setAdmissionClass(Number(e.target.value) as AdmissionClass)}
            className="grs-bulk-apply-field__control"
            style={{ ...fieldControlBase, width: "100%" }}
            aria-label="Admission class"
          >
            <option value={5}>5th</option>
            <option value={8}>8th</option>
          </select>
        </label>

        <label className="grs-bulk-apply-field grs-bulk-apply-field--dob">
          <span className="grs-bulk-apply-field__label">DOB range (inclusive)</span>
          <div
            className="grs-bulk-apply-field__control grs-bulk-apply-field__control--readonly"
            aria-readonly
          >
            {dobRange.display}
          </div>
        </label>
      </div>

      <div className="grs-bulk-apply-page__filters grs-filter-row">
      <GeoFilterBar
        labeled
        selectStyle={filterSelectStyle}
        districtStyle={{ width: 140 }}
        clusterStyle={{ width: 140 }}
        kutirStyle={{ width: 130 }}
        district={filterDistrict}
        cluster={filterCluster}
        kutir={filterKutir}
        onChange={({ district, cluster, kutir }) => {
          setFilterDistrict(district);
          setFilterCluster(cluster);
          setFilterKutir(kutir);
        }}
        districts={scopedDistricts}
        clusters={scopedClusters}
        areas={allAreas}
        kutirs={scopedKutirs}
        kutirMode="by-cluster"
        clusterDisable="no-district-unless-kutir"
        kutirDisable="no-cluster-unless-default-kutir"
        defaultCluster={defaults.cluster}
        defaultKutir={defaults.kutir}
        kutirVisibility="always"
        kutirEmptyLabel="-- Select Kutir --"
        trailing={
          <div className="grs-bulk-apply-page__create">
            <button
              type="button"
              className="grs-bulk-apply-page__create-btn"
              onClick={handleCreate}
              disabled={saving || selectedInView.length === 0}
            >
              {saving
                ? "Creating…"
                : `Create Admission Record${selectedInView.length === 1 ? "" : "s"} (${selectedInView.length})`}
            </button>
          </div>
        }
      />
      </div>

      {error && (
        <div className="grs-bulk-apply-page__alert grs-bulk-apply-page__alert--error" role="alert">
          {error}
        </div>
      )}

      {result && (
        <div className="grs-bulk-apply-page__result">
          <div className="grs-bulk-apply-page__alert grs-bulk-apply-page__alert--success">
            Created {result.created} admission record{result.created === 1 ? "" : "s"} (school start
            year {CURRENT_YEAR}, class {admissionClass}).
          </div>
          {result.failed.length > 0 && (
            <div className="grs-bulk-apply-page__alert grs-bulk-apply-page__alert--error">
              <div className="grs-bulk-apply-page__alert-title">
                {result.failed.length} failed or skipped
              </div>
              <ul className="grs-bulk-apply-page__fail-list">
                {result.failed.map((f) => (
                  <li key={f.label}>
                    <strong>{f.label}:</strong> {f.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grs-bulk-apply-page__list">
        <MultiSelectList
          className="grs-bulk-apply-list"
          title="Eligible students"
          items={listItems}
          selectedIds={selectedInView}
          onChangeSelected={(ids) => setSelected(new Set(ids))}
          disabled={saving}
          emptyMessage="No students in scope match this class DOB range without an admission record."
        />
      </div>
    </div>
  );
}