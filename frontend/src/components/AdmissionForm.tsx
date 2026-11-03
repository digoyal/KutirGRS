/**
 * Shared admission form used by AdmissionAddPage and AdmissionDetailPage.
 * Caller owns form state; this component is presentational + interactive.
 * Modes: add (empty/editable + student search), edit (editable), view (read-only).
 */
import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listExamTypes,
  listExamTypeSubjects,
  type StudentExam,
  type StudentExamCreate,
  type ExamTypeMin,
  type ExamTypeSubjectRow,
} from "../api/admissions";
import { listStudents } from "../api/students";
import { listSchools } from "../api/schools";
import { listKutirs } from "../api/kutirs";
import {
  listDistricts,
  listAreas,
  listClusters,
  listExamCenters,
  listExamCategories,
  listNoExamReasons,
  listNoAdmitReasons,
} from "../api/geo";
import type { Kutir } from "../api/kutirs";
import type { Area, Cluster } from "../api/geo";
import { viewStyles } from "@parivaar/ui";
import { useAuth } from "../context/AuthContext";
import { hasGlobalDataScope } from "../constants/roles";
import { grs } from "../styles/grs";
import { studentLabel } from "../utils/studentLabel";
import { admissionFieldLabel } from "../constants/admissionsFields";
import { GeoFilterBar } from "./GeoFilterBar";
import { useGeoFilterAutoSelect } from "../hooks/useGeoFilterAutoSelect";
import {
  defaultsFromUser,
  scopeClusters,
  scopeDistricts,
  scopeKutirs,
  type FilterId,
} from "../utils/geoFilters";

/** Student district via kutir.district_id, else kutir → cluster → area → district. */
function districtIdForKutir(
  kutirId: number | null | undefined,
  kutirs: Kutir[],
  clusters: Cluster[],
  areas: Area[],
): number | null {
  if (!kutirId) return null;
  const k = kutirs.find((x) => x.id === kutirId);
  if (!k) return null;
  if (k.district_id != null) return k.district_id;
  const c = clusters.find((x) => x.id === k.cluster_id);
  if (!c) return null;
  const a = areas.find((x) => x.id === c.area_id);
  return a?.district_id ?? null;
}
import {
  type StageKey,
  type PipelineField,
  StageBadge,
  PipelineStepper,
  subjectsForExamType,
  pipelineFieldVisible,
  pipelineStage,
  normalizePipelineStages,
} from "./admissions-pipeline";
import { formatAcademicYear } from "../utils/academicYear";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 2 + i);

export interface AdmissionFormState {
  student_id: number;
  school_start_year: number;
  school_type: string;
  exam_type_id: number | null;
  exam_category_id: number | null;
  exam_center_id: number | null;
  application_number: string | null;
  roll_number: string | null;
  eligible: boolean;
  applied: boolean;
  admit_card: boolean;
  appeared: boolean;
  result_declared: boolean;
  selected: boolean;
  admitted: boolean;
  admitted_school_id: number | null;
  no_exam_reason_id: number | null;
  no_admit_reason_id: number | null;
  admission_class: number | null;
  scoreInputs: Record<number, string>;
  /** Subject display names from the loaded exam (view mode). */
  scoreLabels: Record<number, string>;
  /** UI-only filters (not sent to API); kept on form for validation. */
  ui_exam_district: number | "";
  ui_school_district: number | "";
}

export function emptyAdmissionForm(year = CURRENT_YEAR): AdmissionFormState {
  return {
    student_id: 0,
    school_start_year: year,
    school_type: "",
    exam_type_id: null,
    exam_category_id: null,
    exam_center_id: null,
    application_number: null,
    roll_number: null,
    // No stage selected until the user ticks Pipeline Stage — keeps Year editable on Add.
    eligible: false,
    applied: false,
    admit_card: false,
    appeared: false,
    result_declared: false,
    selected: false,
    admitted: false,
    admitted_school_id: null,
    no_exam_reason_id: null,
    no_admit_reason_id: null,
    admission_class: null,
    scoreInputs: {},
    scoreLabels: {},
    ui_exam_district: "",
    ui_school_district: "",
  };
}

export function admissionFormFromExam(exam: StudentExam): AdmissionFormState {
  const stages = normalizePipelineStages({
    eligible: exam.eligible,
    applied: exam.applied,
    admit_card: exam.admit_card,
    appeared: exam.appeared,
    result_declared: exam.result_declared,
    selected: exam.selected,
    admitted: exam.admitted,
  });
  return {
    student_id: exam.student_id,
    school_start_year: exam.school_start_year,
    school_type: exam.school_type ?? "",
    exam_type_id: exam.exam_type_id,
    exam_category_id: exam.exam_category_id,
    exam_center_id: exam.exam_center_id,
    application_number: exam.application_number,
    roll_number: exam.roll_number,
    eligible: stages.eligible,
    applied: stages.applied,
    admit_card: stages.admit_card,
    appeared: stages.appeared,
    result_declared: stages.result_declared,
    selected: stages.selected,
    admitted: stages.admitted,
    admitted_school_id: exam.admitted_school_id,
    no_exam_reason_id: exam.no_exam_reason_id,
    no_admit_reason_id: exam.no_admit_reason_id,
    admission_class: exam.admission_class,
    scoreInputs: Object.fromEntries(
      (exam.scores ?? []).map((s) => [s.subject_id, s.score != null ? String(s.score) : ""]),
    ),
    scoreLabels: Object.fromEntries(
      (exam.scores ?? [])
        .filter((s) => s.subject?.name)
        .map((s) => [s.subject_id, s.subject!.name]),
    ),
    ui_exam_district: "",
    ui_school_district: "",
  };
}

/** Build create/update payload from form state (scores as numbers). */
export function admissionPayloadFromForm(
  form: AdmissionFormState,
): Omit<StudentExamCreate, "student_id"> & { student_id: number } {
  const stageFlags = normalizePipelineStages({
    eligible: form.eligible,
    applied: form.applied,
    admit_card: form.admit_card,
    appeared: form.appeared,
    result_declared: form.result_declared,
    selected: form.selected,
    admitted: form.admitted,
  });
  const show = (field: Parameters<typeof pipelineFieldVisible>[1]) =>
    pipelineFieldVisible(stageFlags, field);
  const showScores = show("scores");
  const showSchool = show("school_name");
  return {
    student_id: form.student_id,
    school_id: null,
    school_type: showSchool ? form.school_type || null : null,
    exam_type_id: show("exam_type") ? form.exam_type_id : null,
    school_start_year: form.school_start_year,
    eligible: stageFlags.eligible,
    applied: stageFlags.applied,
    admit_card: stageFlags.admit_card,
    appeared: stageFlags.appeared,
    result_declared: stageFlags.result_declared,
    selected: stageFlags.selected,
    admitted: stageFlags.admitted,
    exam_category_id: show("exam_category") ? form.exam_category_id : null,
    exam_center_id: show("exam_center") ? form.exam_center_id : null,
    application_number: show("application_number") ? form.application_number : null,
    roll_number: show("roll_number") ? form.roll_number : null,
    scores: showScores
      ? Object.entries(form.scoreInputs)
          .filter(([, v]) => v !== "")
          .map(([id, v]) => ({ subject_id: Number(id), score: parseFloat(v) }))
      : [],
    no_exam_reason_id: show("reason_not_appeared") ? form.no_exam_reason_id : null,
    no_admit_reason_id: show("reason_not_admitted") ? form.no_admit_reason_id : null,
    admitted_school_id: showSchool ? form.admitted_school_id : null,
    admission_class: form.admission_class,
  };
}

export function admissionFieldVisible(
  form: Pick<AdmissionFormState, StageKey>,
  field: PipelineField,
): boolean {
  return pipelineFieldVisible(form, field);
}

/** Whether a pipeline-gated or always-on add/edit field is required (visible ⇒ required). */
export function admissionFieldRequired(
  form: Pick<AdmissionFormState, StageKey>,
  field: PipelineField | "student" | "admission_class",
): boolean {
  if (field === "student" || field === "admission_class") return true;
  return pipelineFieldVisible(form, field);
}

export type AdmissionFormValidateOpts = {
  mode: "add" | "edit";
  /** Subject ids for the selected exam type (score inputs when scores section is visible). */
  subjectIds: number[];
};

/** First validation error for visible fields, or null when the form can be saved. */
export function validateAdmissionForm(
  form: AdmissionFormState,
  opts: AdmissionFormValidateOpts,
): string | null {
  const show = (field: PipelineField) => pipelineFieldVisible(form, field);

  if (opts.mode === "add" && !form.student_id) {
    return `Select a ${admissionFieldLabel("student").toLowerCase()}.`;
  }
  if (form.admission_class == null) {
    return ADMISSION_CLASS_REQUIRED_MSG;
  }
  if (show("exam_type") && form.exam_type_id == null) {
    return "Exam type is required.";
  }
  if (show("exam_category") && form.exam_category_id == null) {
    return `${admissionFieldLabel("exam_category_id")} is required.`;
  }
  if (show("parivaar_district") && form.ui_exam_district === "") {
    return "Parivaar district is required.";
  }
  if (show("exam_center") && form.exam_center_id == null) {
    return `${admissionFieldLabel("exam_center_id")} is required.`;
  }
  if (show("application_number") && !form.application_number?.trim()) {
    return `${admissionFieldLabel("application_number")} is required.`;
  }
  if (show("roll_number") && !form.roll_number?.trim()) {
    return `${admissionFieldLabel("roll_number")} is required.`;
  }
  if (show("reason_not_appeared") && form.no_exam_reason_id == null) {
    return "Reason not appeared is required.";
  }
  if (show("scores") && opts.subjectIds.length > 0) {
    for (const subjectId of opts.subjectIds) {
      const raw = form.scoreInputs[subjectId];
      if (raw === undefined || raw.trim() === "") {
        return "Enter a score for every subject.";
      }
    }
  }
  if (show("school_district") && form.ui_school_district === "") {
    return "School district is required.";
  }
  if (show("school_type") && !form.school_type.trim()) {
    return "School type is required.";
  }
  if (show("school_name") && form.admitted_school_id == null) {
    return "School name is required.";
  }
  if (show("reason_not_admitted") && form.no_admit_reason_id == null) {
    return "Reason not admitted is required.";
  }
  return null;
}

export function admissionFormCanSave(
  form: AdmissionFormState,
  opts: AdmissionFormValidateOpts,
): boolean {
  return validateAdmissionForm(form, opts) == null;
}

/** @deprecated Use validateAdmissionForm / admissionFormCanSave */
export function admissionSchoolFieldsRequired(form: Pick<AdmissionFormState, StageKey>): boolean {
  return pipelineFieldVisible(form, "school_name");
}

export function admissionClassRequired(_form: Pick<AdmissionFormState, "admitted">): boolean {
  return true;
}

export function admissionClassMissing(form: Pick<AdmissionFormState, "admission_class">): boolean {
  return form.admission_class == null;
}

export const ADMISSION_CLASS_REQUIRED_MSG = "Class is required (select 5 or 8).";

interface AdmissionFormProps {
  form: AdmissionFormState;
  setForm: React.Dispatch<React.SetStateAction<AdmissionFormState>>;
  mode: "add" | "edit" | "view";
  /** Display name for edit/view (student cannot be changed). */
  studentName?: string;
  /** Student's kutir — used to prefill Parivaar District on edit. */
  studentKutirId?: number | null;
  /**
   * Other exams for this student (edit mode). Used to block a second Admit.
   * Pass the current exam id so it is excluded from the check.
   */
  siblingExams?: StudentExam[];
  currentExamId?: number;
  /** Set when an admit toggle is blocked; cleared on successful stage change. */
  admitBlockMsg?: string | null;
  onAdmitBlockMsg?: (msg: string | null) => void;
}

export function AdmissionForm({
  form,
  setForm,
  mode,
  studentName,
  studentKutirId,
  siblingExams = [],
  currentExamId,
  admitBlockMsg,
  onAdmitBlockMsg,
}: AdmissionFormProps) {
  const readOnly = mode === "view";
  const isAdd = mode === "add";
  const { user } = useAuth();
  const unscoped = !user || hasGlobalDataScope(user.title);

  const [search, setSearch] = useState("");
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const geoDefaults = useMemo(() => defaultsFromUser(user ?? undefined), [user]);
  const [filterDistrict, setFilterDistrict] = useState<FilterId>(() => geoDefaults.district);
  const [filterCluster, setFilterCluster] = useState<FilterId>(() => geoDefaults.cluster);
  const [filterKutir, setFilterKutir] = useState<FilterId>(() => geoDefaults.kutir);
  const [addGeoSeeded, setAddGeoSeeded] = useState(false);
  const examDistrictFilter = form.ui_exam_district;
  const schoolDistrictFilter = form.ui_school_district;

  const { data: examTypes = [] } = useQuery<ExamTypeMin[]>({
    queryKey: ["exam-types"],
    queryFn: listExamTypes,
    staleTime: 5 * 60 * 1000,
  });
  const { data: examTypeSubjects = [] } = useQuery<ExamTypeSubjectRow[]>({
    queryKey: ["exam-type-subjects"],
    queryFn: listExamTypeSubjects,
    staleTime: 5 * 60 * 1000,
  });
  const { data: schools = [] } = useQuery({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
  });
  const { data: presenceDistricts = [] } = useQuery({
    queryKey: ["districts", { parivaar_presence: true }],
    queryFn: () => listDistricts(undefined, { parivaar_presence: true }),
  });
  /** All districts for GRS School picker (no Parivaar Presence, no role geo scope). */
  const { data: allDistricts = [] } = useQuery({
    queryKey: ["districts", { unscoped: true }],
    queryFn: () => listDistricts(undefined, { unscoped: true }),
  });
  const { data: examCategories = [] } = useQuery({
    queryKey: ["exam-categories"],
    queryFn: () => listExamCategories(),
  });
  const { data: examCenters = [] } = useQuery({
    queryKey: ["exam-centers"],
    queryFn: () => listExamCenters(),
  });
  const { data: noExamReasons = [] } = useQuery({
    queryKey: ["no-exam-reasons"],
    queryFn: () => listNoExamReasons(),
  });
  const { data: noAdmitReasons = [] } = useQuery({
    queryKey: ["no-admit-reasons"],
    queryFn: () => listNoAdmitReasons(),
  });
  const needGeoForDistrict = isAdd || mode === "edit";
  const { data: allKutirsData = [] } = useQuery({
    queryKey: ["kutirs"],
    queryFn: () => listKutirs(),
    staleTime: 5 * 60 * 1000,
    enabled: needGeoForDistrict,
  });
  const { data: allClusters = [] } = useQuery({
    queryKey: ["all-clusters"],
    queryFn: () => listClusters(),
    staleTime: 5 * 60 * 1000,
    enabled: needGeoForDistrict,
  });
  const { data: allAreas = [] } = useQuery({
    queryKey: ["all-areas"],
    queryFn: () => listAreas(),
    staleTime: 5 * 60 * 1000,
    enabled: needGeoForDistrict,
  });
  const scopedPresenceDistricts = useMemo(
    () => scopeDistricts(presenceDistricts, user ?? undefined, unscoped),
    [presenceDistricts, user, unscoped],
  );
  const scopedClusters = useMemo(
    () => scopeClusters(allClusters, user ?? undefined, unscoped),
    [allClusters, user, unscoped],
  );
  const scopedKutirs = useMemo(
    () => scopeKutirs(allKutirsData, user ?? undefined, unscoped),
    [allKutirsData, user, unscoped],
  );

  useGeoFilterAutoSelect({
    scopedDistricts: scopedPresenceDistricts,
    scopedClusters,
    filterDistrict,
    filterCluster,
    setFilterDistrict,
    setFilterCluster,
    unscoped,
    clusterMode: isAdd ? "scoped-non-admin" : "none",
    skipDistrictAuto: !isAdd,
    skipClusterAuto: !isAdd,
  });

  useEffect(() => {
    if (!isAdd || filterCluster === "") return;
    const inCluster = scopedKutirs.filter((k) => k.cluster_id === filterCluster);
    if (inCluster.length === 1 && filterKutir === "") {
      setFilterKutir(inCluster[0].id);
    }
  }, [isAdd, filterCluster, scopedKutirs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const areaMap = useMemo(() => new Map(allAreas.map((a) => [a.id, a])), [allAreas]);

  // Role default kutir (e.g. Teacher): backfill district/cluster so Kutir is usable.
  useEffect(() => {
    if (
      !isAdd ||
      addGeoSeeded ||
      filterKutir === "" ||
      filterCluster !== "" ||
      scopedKutirs.length === 0 ||
      allClusters.length === 0
    ) {
      return;
    }
    const kutir = scopedKutirs.find((k) => k.id === filterKutir);
    if (!kutir?.cluster_id) return;
    const cluster = allClusters.find((c) => c.id === kutir.cluster_id);
    if (!cluster) return;
    const area = areaMap.get(cluster.area_id);
    if (area) setFilterDistrict(area.district_id);
    setFilterCluster(kutir.cluster_id);
    setAddGeoSeeded(true);
  }, [isAdd, filterKutir, filterCluster, scopedKutirs, allClusters, areaMap, addGeoSeeded]);

  function clearStudentPick() {
    setField("student_id", 0);
    setSearch("");
  }

  function onGeoFilterChange(next: {
    district: FilterId;
    cluster: FilterId;
    kutir: FilterId;
  }) {
    setFilterDistrict(next.district);
    setFilterCluster(next.cluster);
    setFilterKutir(next.kutir);
    clearStudentPick();
  }

  const searchTrim = search.trim();
  const { data: students = [], isFetching: studentsFetching } = useQuery({
    queryKey: ["students-search", "admissions", searchTrim, filterKutir],
    queryFn: () =>
      listStudents({
        name_only: true,
        ...(searchTrim ? { search: searchTrim } : {}),
        limit: 100,
        kutir_id: Number(filterKutir),
      }),
    enabled: isAdd && filterKutir !== "",
  });

  useEffect(() => {
    if (!isAdd || filterKutir === "") {
      setStudentPickerOpen(false);
      return;
    }
    setStudentPickerOpen(true);
  }, [isAdd, filterKutir]);

  function applyParivaarDistrict(districtId: number | null) {
    if (districtId == null) return;
    if (!scopedPresenceDistricts.some((d) => d.id === districtId)) return;
    setField("ui_exam_district", districtId);
  }

  function applySchoolDistrict(districtId: number | null) {
    if (districtId == null) return;
    if (!allDistricts.some((d) => d.id === districtId)) return;
    setField("ui_school_district", districtId);
  }

  useEffect(() => {
    if (scopedPresenceDistricts.length === 1 && form.ui_exam_district === "") {
      setField("ui_exam_district", scopedPresenceDistricts[0].id);
    }
  }, [scopedPresenceDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Edit: prefill Parivaar District from existing exam center, else student's kutir district
  useEffect(() => {
    if (mode !== "edit" || form.ui_exam_district !== "") return;
    const center = examCenters.find((c) => c.id === form.exam_center_id);
    if (center?.district_id != null) {
      applyParivaarDistrict(center.district_id);
      return;
    }
    applyParivaarDistrict(
      districtIdForKutir(studentKutirId, allKutirsData, allClusters, allAreas),
    );
  }, [mode, form.exam_center_id, studentKutirId, examCenters, allKutirsData, allClusters, allAreas, scopedPresenceDistricts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Edit: prefill GRS School District from admitted school, else student's kutir district
  useEffect(() => {
    if (mode !== "edit" || form.ui_school_district !== "") return;
    const school = schools.find((s) => s.id === form.admitted_school_id) as
      | { district_id?: number | null }
      | undefined;
    if (school?.district_id != null) {
      applySchoolDistrict(school.district_id);
      return;
    }
    applySchoolDistrict(
      districtIdForKutir(studentKutirId, allKutirsData, allClusters, allAreas),
    );
  }, [mode, form.admitted_school_id, studentKutirId, schools, allKutirsData, allClusters, allAreas, allDistricts]); // eslint-disable-line react-hooks/exhaustive-deps

  function setField<K extends keyof AdmissionFormState>(key: K, val: AdmissionFormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }
  function setScore(subjectId: number, val: string) {
    setForm((f) => ({ ...f, scoreInputs: { ...f.scoreInputs, [subjectId]: val } }));
  }

  function toggleStage(updates: Partial<Record<StageKey, boolean>>) {
    if (updates.admitted === true && mode === "edit") {
      const alreadyAdmitted = siblingExams.find(
        (e) =>
          e.student_id === form.student_id &&
          e.admitted &&
          e.school_start_year === form.school_start_year &&
          e.id !== currentExamId,
      );
      if (alreadyAdmitted) {
        onAdmitBlockMsg?.(
          `This student already has an admitted record for academic year ${form.school_start_year}.`,
        );
        return;
      }
    }
    onAdmitBlockMsg?.(null);
    setForm((f) => {
      const school_start_year = f.school_start_year;
      return {
        ...normalizePipelineStages({
          ...f,
          ...updates,
        }),
        school_start_year,
      };
    });
  }

  const schoolTypes = (
    Array.from(new Set(schools.map((sc) => sc.school_type).filter(Boolean))) as string[]
  ).sort();
  const subjects = subjectsForExamType(examTypeSubjects, form.exam_type_id);

  // Server filters by kutir (+ optional search); keep list as-is for the picker.
  const filteredStudents = students;
  const showStudentPicker =
    isAdd && filterKutir !== "" && !form.student_id && studentPickerOpen;

  const filteredExamCenters =
    examDistrictFilter === ""
      ? examCenters
      : examCenters.filter((c) => c.district_id === examDistrictFilter);

  const schoolTypeFiltered = form.school_type
    ? schools.filter((s) => s.school_type === form.school_type)
    : schools;
  const filteredGrsSchools =
    schoolDistrictFilter === ""
      ? schoolTypeFiltered
      : schoolTypeFiltered.filter(
          (s) => (s as { district_id?: number }).district_id === schoolDistrictFilter,
        );

  const pipelineExam = {
    ...form,
    id: currentExamId ?? 0,
    school_id: null,
    scores: [],
    created_at: "",
    updated_at: "",
  } as StudentExam;

  const show = (field: Parameters<typeof pipelineFieldVisible>[1]) =>
    pipelineFieldVisible(form, field);
  const showExamBasics = show("exam_type");
  const showExamGeo = show("parivaar_district");
  const showApplicationNumber = show("application_number");
  const showRoll = show("roll_number");
  const showReasonNotAppeared = show("reason_not_appeared");
  const showScores = show("scores");
  const showSchool = show("school_name");
  const showReasonNotAdmitted = show("reason_not_admitted");
  /** Year editable until first pipeline stage (Eligible+); lock preserves school_start_year in state. */
  const yearEditable = !readOnly && pipelineStage(form) < 0;

  const viewExamCategory = examCategories.find((c) => c.id === form.exam_category_id);
  const viewExamCenter = examCenters.find((c) => c.id === form.exam_center_id);
  const noExamReason = noExamReasons.find((r) => r.id === form.no_exam_reason_id);
  const noAdmitReason = noAdmitReasons.find((r) => r.id === form.no_admit_reason_id);
  const admittedSchool = schools.find((s) => s.id === form.admitted_school_id);
  const scoreEntries = Object.entries(form.scoreInputs)
    .filter(([, v]) => v !== "")
    .map(([id, v]) => ({
      subject_id: Number(id),
      score: parseFloat(v),
      name:
        form.scoreLabels[Number(id)] ??
        subjects.find((s) => s.id === Number(id))?.name ??
        `Subject ${id}`,
    }));
  const totalScore = scoreEntries.reduce((sum, s) => sum + (Number.isFinite(s.score) ? s.score : 0), 0);
  const hasScore = scoreEntries.length > 0;

  // ── VIEW ───────────────────────────────────────────────────────────────────
  if (readOnly) {
    return (
      <div className="grs-form-layout">
        <div
          style={{
            ...sec,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>STAGE</span>
          <StageBadge exam={pipelineExam} />
          {form.eligible === false && (
            <span
              style={{
                fontSize: 11,
                color: "var(--status-danger-fg, #e53e3e)",
                fontWeight: 600,
                marginLeft: 4,
              }}
            >
              Not eligible
            </span>
          )}
        </div>

        <section style={sec}>
          <div style={secTitle}>Student</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
            <div style={fieldStyle}>
              <span style={labelStyle}>{admissionFieldLabel("student")}</span>
              <span style={valueStyle}>{studentName ?? `Student #${form.student_id}`}</span>
            </div>
            <div style={fieldStyle}>
              <span style={labelStyle}>{admissionFieldLabel("admission_class")}</span>
              <span style={valueStyle}>
                {form.admission_class != null ? `Class ${form.admission_class}` : "—"}
              </span>
            </div>
          </div>
        </section>

        <section style={sec}>
          <div style={secTitle}>Exam Details</div>
          {showExamBasics && (
            <div style={{ display: "grid", gridTemplateColumns: "90px 130px 1fr", gap: 12 }}>
              <div style={fieldStyle}>
                <span style={labelStyle}>Year</span>
                <span style={valueStyle}>{formatAcademicYear(form.school_start_year)}</span>
              </div>
              <div style={fieldStyle}>
                <span style={labelStyle}>Exam Type</span>
                <span style={valueStyle}>
                  {examTypes.find((e) => e.id === form.exam_type_id)?.name ?? "—"}
                </span>
              </div>
              <div style={fieldStyle}>
                <span style={labelStyle}>{admissionFieldLabel("exam_category_id")}</span>
                <span style={valueStyle}>{viewExamCategory?.name ?? "—"}</span>
              </div>
            </div>
          )}
          {showExamGeo && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div style={fieldStyle}>
                <span style={labelStyle}>Parivaar District</span>
                <span style={valueStyle}>
                  {viewExamCenter?.district_id != null
                    ? (presenceDistricts.find((d) => d.id === viewExamCenter.district_id)?.name ?? "—")
                    : "—"}
                </span>
              </div>
              <div style={fieldStyle}>
                <span style={labelStyle}>{admissionFieldLabel("exam_center_id")}</span>
                <span style={valueStyle}>{viewExamCenter?.name ?? "—"}</span>
              </div>
            </div>
          )}
          {(showApplicationNumber || showRoll) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              {showApplicationNumber && (
                <div style={fieldStyle}>
                  <span style={labelStyle}>{admissionFieldLabel("application_number")}</span>
                  <span style={valueStyle}>{form.application_number ?? "—"}</span>
                </div>
              )}
              {showRoll && (
                <div style={fieldStyle}>
                  <span style={labelStyle}>{admissionFieldLabel("roll_number")}</span>
                  <span style={valueStyle}>{form.roll_number ?? "—"}</span>
                </div>
              )}
            </div>
          )}
        </section>

        {showScores && hasScore && (
          <section style={sec}>
            <div style={secTitle}>Scores</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                gap: 8,
              }}
            >
              {scoreEntries.map((s) => (
                <div
                  key={s.subject_id}
                  style={{
                    background: "var(--bg-input)",
                    borderRadius: 6,
                    padding: "8px 10px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--text-secondary)",
                      marginBottom: 2,
                    }}
                  >
                    {s.name}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {s.score}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 8,
                textAlign: "right",
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              Total:{" "}
              <strong style={{ color: "var(--text-primary)", fontSize: 15 }}>{totalScore}</strong>
            </div>
          </section>
        )}

        {showReasonNotAppeared && (
          <section style={sec}>
            <div style={secTitle}>Reason Not Appeared</div>
            <span style={valueStyle}>{noExamReason ? noExamReason.reason : "—"}</span>
          </section>
        )}

        {showSchool && (
          <section style={sec}>
            <div style={secTitle}>GRS School</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 2fr", gap: 8 }}>
              <div style={fieldStyle}>
                <span style={labelStyle}>District</span>
                <span style={valueStyle}>
                  {admittedSchool && (admittedSchool as { district_id?: number }).district_id
                    ? (allDistricts.find(
                        (d) =>
                          d.id === (admittedSchool as { district_id?: number }).district_id,
                      )?.name ?? "—")
                    : "—"}
                </span>
              </div>
              <div style={fieldStyle}>
                <span style={labelStyle}>School Type</span>
                <span style={valueStyle}>{form.school_type || "—"}</span>
              </div>
              <div style={fieldStyle}>
                <span style={labelStyle}>School Name</span>
                <span style={valueStyle}>
                  {admittedSchool
                    ? `${admittedSchool.name} (${admittedSchool.school_type})`
                    : "—"}
                </span>
              </div>
            </div>
          </section>
        )}

        {showReasonNotAdmitted && (
          <section style={sec}>
            <div style={secTitle}>Reason Not Admitted</div>
            <span style={valueStyle}>{noAdmitReason ? noAdmitReason.reason : "—"}</span>
          </section>
        )}
      </div>
    );
  }

  const yearField = (
    <div>
      <label style={grs.fieldLabel}>
        Year
        {admissionFieldRequired(form, "year") && (
          <span style={{ color: "var(--danger)" }}> *</span>
        )}
      </label>
      {yearEditable ? (
        <select
          value={form.school_start_year}
          onChange={(e) => setField("school_start_year", Number(e.target.value))}
          style={selStyles}
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {formatAcademicYear(y)}
            </option>
          ))}
        </select>
      ) : (
        <input
          readOnly
          value={formatAcademicYear(form.school_start_year)}
          style={{ ...inputStyles, opacity: 0.6, cursor: "not-allowed" }}
        />
      )}
    </div>
  );

  // ── ADD / EDIT ─────────────────────────────────────────────────────────────
  return (
    <div className="grs-form">
      {/* Student */}
      <section style={sec}>
        <div style={secTitle}>Student</div>
        {isAdd ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <GeoFilterBar
              labeled
              district={filterDistrict}
              cluster={filterCluster}
              kutir={filterKutir}
              onChange={onGeoFilterChange}
              districts={scopedPresenceDistricts}
              clusters={scopedClusters}
              areas={allAreas}
              kutirs={scopedKutirs}
              kutirMode="by-cluster-or-selected"
              clusterDisable="no-district-unless-kutir"
              kutirDisable="no-cluster-unless-default-kutir"
              kutirVisibility="always"
              defaultKutir={geoDefaults.kutir}
              selectStyle={selStyles}
              districtEmptyLabel="— Select —"
              clusterEmptyLabel="— Select —"
              kutirEmptyLabel="— Select —"
              districtLabel="District"
              clusterLabel="Cluster"
              kutirLabel={admissionFieldLabel("kutir")}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 90px 120px",
                gap: 8,
                alignItems: "end",
              }}
            >
            <div style={{ position: "relative", minWidth: 0 }}>
              <label style={grs.fieldLabel}>
                {admissionFieldLabel("student")} <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                placeholder={
                  filterKutir === ""
                    ? "Select district, cluster, and kutir first…"
                    : "Search or pick a student below…"
                }
                value={search}
                disabled={filterKutir === ""}
                onFocus={() => {
                  if (filterKutir !== "") setStudentPickerOpen(true);
                }}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setField("student_id", 0);
                  setStudentPickerOpen(true);
                }}
                style={{
                  ...inputStyles,
                  ...(filterKutir === "" ? { opacity: 0.6, cursor: "not-allowed" } : {}),
                  borderRadius:
                    showStudentPicker && filteredStudents.length > 0
                      ? "6px 6px 0 0"
                      : undefined,
                }}
              />
              {showStudentPicker && filteredStudents.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    border: "1px solid var(--border)",
                    borderTop: "none",
                    borderRadius: "0 0 6px 6px",
                    maxHeight: 160,
                    overflowY: "auto",
                    background: "var(--bg-card)",
                  }}
                >
                  {filteredStudents.map((s) => {
                    const label = studentLabel(s);
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setField("student_id", s.id);
                          setSearch(label);
                          setStudentPickerOpen(false);
                          const did = districtIdForKutir(
                            s.kutir_id,
                            allKutirsData,
                            allClusters,
                            allAreas,
                          );
                          applyParivaarDistrict(did);
                          applySchoolDistrict(did);
                          // Drop center from another district when student (district) changes
                          if (did != null && form.exam_center_id != null) {
                            const cur = examCenters.find((c) => c.id === form.exam_center_id);
                            if (cur?.district_id != null && cur.district_id !== did) {
                              setField("exam_center_id", null);
                            }
                          }
                          if (did != null && form.admitted_school_id != null) {
                            const sch = schools.find((x) => x.id === form.admitted_school_id) as
                              | { district_id?: number | null }
                              | undefined;
                            if (sch?.district_id != null && sch.district_id !== did) {
                              setField("admitted_school_id", null);
                            }
                          }
                        }}
                        style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.875rem" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "var(--badge-blue-bg)")
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>
              )}
              {showStudentPicker && !studentsFetching && filteredStudents.length === 0 && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  {searchTrim
                    ? "No students match your search in this kutir."
                    : "No students in this kutir."}
                </div>
              )}
            </div>
            {yearField}
            <div>
              <label style={grs.fieldLabel}>
                {admissionFieldLabel("admission_class")} <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select
                value={form.admission_class ?? ""}
                onChange={(e) =>
                  setField(
                    "admission_class",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                style={selStyles}
              >
                <option value="">-- select --</option>
                <option value={5}>Class 5</option>
                <option value={8}>Class 8</option>
              </select>
            </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 90px 120px",
              gap: 8,
              alignItems: "end",
            }}
          >
            <div>
              <label style={grs.fieldLabel}>{admissionFieldLabel("student")}</label>
              <input
                readOnly
                value={studentName ?? `Student #${form.student_id}`}
                style={{ ...inputStyles, opacity: 0.6, cursor: "not-allowed" }}
              />
            </div>
            {yearField}
            <div>
              <label style={grs.fieldLabel}>
                {admissionFieldLabel("admission_class")}
                <span style={{ color: "var(--danger)" }}> *</span>
              </label>
              <select
                value={form.admission_class ?? ""}
                onChange={(e) =>
                  setField(
                    "admission_class",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                style={selStyles}
              >
                <option value="">-- select --</option>
                <option value={5}>Class 5</option>
                <option value={8}>Class 8</option>
              </select>
            </div>
          </div>
        )}
      </section>

      {/* Pipeline */}
      <section style={sec}>
        <div style={secTitle}>Pipeline Stage</div>
        <PipelineStepper exam={pipelineExam} onChange={toggleStage} />
      </section>

      {/* Exam Details */}
      <section style={sec}>
        <div style={secTitle}>Exam Details</div>

        {showExamBasics && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "130px 1fr",
              gap: 12,
              alignItems: "end",
            }}
          >
            <div>
              <label style={grs.fieldLabel}>
                {admissionFieldLabel("exam_type_id")}
                {admissionFieldRequired(form, "exam_type") && (
                  <span style={{ color: "var(--danger)" }}> *</span>
                )}
              </label>
              <select
                value={form.exam_type_id ?? ""}
                onChange={(e) =>
                  setField("exam_type_id", e.target.value === "" ? null : Number(e.target.value))
                }
                style={selStyles}
              >
                <option value="">-- select --</option>
                {examTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={grs.fieldLabel}>
                {admissionFieldLabel("exam_category_id")}
                {admissionFieldRequired(form, "exam_category") && (
                  <span style={{ color: "var(--danger)" }}> *</span>
                )}
              </label>
              <select
                value={form.exam_category_id ?? ""}
                onChange={(e) =>
                  setField(
                    "exam_category_id",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                style={selStyles}
              >
                <option value="">-- select --</option>
                {examCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {showExamGeo && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              alignItems: "end",
              marginTop: 12,
            }}
          >
            <div>
              <label style={grs.fieldLabel}>
                Parivaar District
                {admissionFieldRequired(form, "parivaar_district") && (
                  <span style={{ color: "var(--danger)" }}> *</span>
                )}
              </label>
              <select
                value={examDistrictFilter}
                onChange={(e) => {
                  setField("ui_exam_district", e.target.value === "" ? "" : Number(e.target.value));
                  setField("exam_center_id", null);
                }}
                style={selStyles}
              >
                <option value="">-- all --</option>
                {scopedPresenceDistricts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={grs.fieldLabel}>
                {admissionFieldLabel("exam_center_id")}
                {admissionFieldRequired(form, "exam_center") && (
                  <span style={{ color: "var(--danger)" }}> *</span>
                )}
              </label>
              <select
                value={form.exam_center_id ?? ""}
                onChange={(e) =>
                  setField("exam_center_id", e.target.value === "" ? null : Number(e.target.value))
                }
                style={selStyles}
              >
                <option value="">-- select --</option>
                {filteredExamCenters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {(showApplicationNumber || showRoll) && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              alignItems: "end",
              marginTop: 12,
            }}
          >
            {showApplicationNumber ? (
              <div>
                <label style={grs.fieldLabel}>
                  {admissionFieldLabel("application_number")}
                  {admissionFieldRequired(form, "application_number") && (
                    <span style={{ color: "var(--danger)" }}> *</span>
                  )}
                </label>
                <input
                  value={form.application_number ?? ""}
                  onChange={(e) => setField("application_number", e.target.value || null)}
                  style={inputStyles}
                />
              </div>
            ) : (
              <div />
            )}
            {showRoll ? (
              <div>
                <label style={grs.fieldLabel}>
                  {admissionFieldLabel("roll_number")}
                  {admissionFieldRequired(form, "roll_number") && (
                    <span style={{ color: "var(--danger)" }}> *</span>
                  )}
                </label>
                <input
                  value={form.roll_number ?? ""}
                  onChange={(e) => setField("roll_number", e.target.value || null)}
                  style={inputStyles}
                />
              </div>
            ) : (
              <div />
            )}
          </div>
        )}
      </section>

      {/* Scores */}
      {showScores && subjects.length > 0 && (
        <section style={sec}>
          <div style={secTitle}>Scores</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {subjects.map((subj) => (
              <div key={subj.id}>
                <label style={grs.fieldLabel}>
                  {subj.name}
                  {admissionFieldRequired(form, "scores") && (
                    <span style={{ color: "var(--danger)" }}> *</span>
                  )}
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={form.scoreInputs[subj.id] ?? ""}
                  onChange={(e) => setScore(subj.id, e.target.value)}
                  style={inputStyles}
                  placeholder="—"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reason Not Appeared — only at Admin Card Downloaded stage */}
      {showReasonNotAppeared && (
        <section style={sec}>
          <div style={secTitle}>
            Reason Not Appeared for Exam
            {admissionFieldRequired(form, "reason_not_appeared") && (
              <span style={{ color: "var(--danger)" }}> *</span>
            )}
          </div>
          <select
            value={form.no_exam_reason_id ?? ""}
            onChange={(e) =>
              setField(
                "no_exam_reason_id",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            style={selStyles}
          >
            <option value="">-- select --</option>
            {noExamReasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.reason}
              </option>
            ))}
          </select>
        </section>
      )}

      {/* GRS School — Selected + Admitted */}
      {showSchool && (
        <section style={sec}>
          <div style={secTitle}>GRS School</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 130px 2fr",
              gap: 8,
              alignItems: "end",
            }}
          >
            <div>
              <label style={grs.fieldLabel}>
                District
                {admissionFieldRequired(form, "school_district") && (
                  <span style={{ color: "var(--danger)" }}> *</span>
                )}
              </label>
              <select
                value={schoolDistrictFilter}
                onChange={(e) => {
                  setField("ui_school_district", e.target.value === "" ? "" : Number(e.target.value));
                  setField("admitted_school_id", null);
                }}
                style={selStyles}
              >
                <option value="">-- select --</option>
                {allDistricts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={grs.fieldLabel}>
                {admissionFieldLabel("school_type")} <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select
                value={form.school_type}
                onChange={(e) => {
                  setField("school_type", e.target.value);
                  setField("admitted_school_id", null);
                }}
                style={selStyles}
              >
                <option value="">-- select --</option>
                {schoolTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={grs.fieldLabel}>
                School Name <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select
                value={form.admitted_school_id ?? ""}
                onChange={(e) =>
                  setField(
                    "admitted_school_id",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                disabled={!form.school_type}
                style={{
                  ...selStyles,
                  ...(!form.school_type
                    ? { opacity: 0.6, cursor: "not-allowed" }
                    : {}),
                }}
              >
                <option value="">-- select --</option>
                {filteredGrsSchools.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name} ({sc.school_type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
      )}

      {/* Reason Not Admitted — Selected only */}
      {showReasonNotAdmitted && (
        <section style={sec}>
          <div style={secTitle}>
            Reason Not Admitted
            {admissionFieldRequired(form, "reason_not_admitted") && (
              <span style={{ color: "var(--danger)" }}> *</span>
            )}
          </div>
          <select
            value={form.no_admit_reason_id ?? ""}
            onChange={(e) =>
              setField(
                "no_admit_reason_id",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            style={selStyles}
          >
            <option value="">-- select --</option>
            {noAdmitReasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.reason}
              </option>
            ))}
          </select>
        </section>
      )}

      {admitBlockMsg && (
        <div
          style={{
            marginTop: 16,
            padding: "8px 12px",
            background: "var(--warning-bg, #fffbeb)",
            border: "1px solid var(--warning-border, #fcd34d)",
            borderRadius: 6,
            color: "var(--warning-text, #92400e)",
            fontSize: 13,
          }}
        >
          ⚠️ {admitBlockMsg}
        </div>
      )}
    </div>
  );
}

const selStyles: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--bg-input)",
  color: "var(--text-primary)",
  boxSizing: "border-box",
};
const inputStyles: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--bg-input)",
  color: "var(--text-primary)",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = viewStyles.label;
const valueStyle: React.CSSProperties = viewStyles.value;
const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 2 };
const sec: React.CSSProperties = viewStyles.section;
const secTitle: React.CSSProperties = viewStyles.sectionTitle;
