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
  form_received: boolean;
  applied: boolean;
  admit_card: boolean;
  appeared: boolean;
  selected: boolean;
  admitted: boolean;
  admitted_school_id: number | null;
  no_exam_reason_id: number | null;
  no_admit_reason_id: number | null;
  admission_class: number | null;
  scoreInputs: Record<number, string>;
  /** Subject display names from the loaded exam (view mode). */
  scoreLabels: Record<number, string>;
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
    form_received: false,
    applied: false,
    admit_card: false,
    appeared: false,
    selected: false,
    admitted: false,
    admitted_school_id: null,
    no_exam_reason_id: null,
    no_admit_reason_id: null,
    admission_class: null,
    scoreInputs: {},
    scoreLabels: {},
  };
}

export function admissionFormFromExam(exam: StudentExam): AdmissionFormState {
  const stages = normalizePipelineStages({
    eligible: exam.eligible,
    applied: exam.applied,
    admit_card: exam.admit_card,
    appeared: exam.appeared,
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
    form_received: exam.form_received,
    applied: stages.applied,
    admit_card: stages.admit_card,
    appeared: stages.appeared,
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
    exam_type_id: form.exam_type_id,
    school_start_year: form.school_start_year,
    eligible: stageFlags.eligible,
    form_received: form.form_received,
    applied: stageFlags.applied,
    admit_card: stageFlags.admit_card,
    appeared: stageFlags.appeared,
    selected: stageFlags.selected,
    admitted: stageFlags.admitted,
    exam_category_id: form.exam_category_id,
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

/** Whether school fields are required for the current pipeline stage. */
export function admissionSchoolFieldsRequired(form: Pick<AdmissionFormState, StageKey>): boolean {
  return pipelineFieldVisible(form, "school_name");
}

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
  const [kutirFilter, setKutirFilter] = useState<number | "">("");
  const [schoolDistrictFilter, setSchoolDistrictFilter] = useState<number | "">("");
  const [examDistrictFilter, setExamDistrictFilter] = useState<number | "">("");

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
  const { data: students = [] } = useQuery({
    queryKey: ["students-search", "admissions", search.trim(), kutirFilter],
    queryFn: () =>
      listStudents({
        name_only: true,
        search: search.trim(),
        limit: 100,
        ...(kutirFilter !== "" ? { kutir_id: Number(kutirFilter) } : {}),
      }),
    enabled: isAdd && search.trim().length >= 1,
  });

  const kutirs = useMemo(() => {
    if (unscoped) return allKutirsData;
    return user!.kutir_ids.length > 0
      ? allKutirsData.filter((k) => user!.kutir_ids.includes(k.id))
      : allKutirsData;
  }, [allKutirsData, user, unscoped]);

  useEffect(() => {
    if (!isAdd) return;
    if (kutirs.length === 1 && kutirFilter === "") setKutirFilter(kutirs[0].id);
  }, [isAdd, kutirs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const scopeByUser = (list: typeof allDistricts) => {
    if (unscoped) return list;
    return user!.district_ids?.length > 0
      ? list.filter((d) => user!.district_ids.includes(d.id))
      : list;
  };
  const scopedPresenceDistricts = useMemo(
    () => scopeByUser(presenceDistricts),
    [presenceDistricts, user, unscoped],
  );

  function applyParivaarDistrict(districtId: number | null) {
    if (districtId == null) return;
    if (!scopedPresenceDistricts.some((d) => d.id === districtId)) return;
    setExamDistrictFilter(districtId);
  }

  useEffect(() => {
    if (scopedPresenceDistricts.length === 1 && examDistrictFilter === "") {
      setExamDistrictFilter(scopedPresenceDistricts[0].id);
    }
  }, [scopedPresenceDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Edit: prefill Parivaar District from existing exam center, else student's kutir district
  useEffect(() => {
    if (mode !== "edit" || examDistrictFilter !== "") return;
    const center = examCenters.find((c) => c.id === form.exam_center_id);
    if (center?.district_id != null) {
      applyParivaarDistrict(center.district_id);
      return;
    }
    applyParivaarDistrict(
      districtIdForKutir(studentKutirId, allKutirsData, allClusters, allAreas),
    );
  }, [mode, form.exam_center_id, studentKutirId, examCenters, allKutirsData, allClusters, allAreas, scopedPresenceDistricts]); // eslint-disable-line react-hooks/exhaustive-deps

  function setField<K extends keyof AdmissionFormState>(key: K, val: AdmissionFormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }
  function setScore(subjectId: number, val: string) {
    setForm((f) => ({ ...f, scoreInputs: { ...f.scoreInputs, [subjectId]: val } }));
  }

  function toggleStage(updates: Partial<Record<StageKey, boolean>>) {
    if (updates.admitted === true && mode === "edit") {
      const alreadyAdmitted = siblingExams.find(
        (e) => e.student_id === form.student_id && e.admitted && e.id !== currentExamId,
      );
      if (alreadyAdmitted) {
        onAdmitBlockMsg?.(
          `This student is already admitted via ${alreadyAdmitted.school_type ?? "another school"}. Only one admission is allowed.`,
        );
        return;
      }
    }
    onAdmitBlockMsg?.(null);
    setForm((f) =>
      normalizePipelineStages({
        ...f,
        ...updates,
      }),
    );
  }

  const schoolTypes = (
    Array.from(new Set(schools.map((sc) => sc.school_type).filter(Boolean))) as string[]
  ).sort();
  const subjects = subjectsForExamType(examTypeSubjects, form.exam_type_id);

  // Server already filters by search (+ kutir when selected); keep list as-is for the picker.
  const filteredStudents = students;

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
  const showAppliedExam = show("parivaar_district");
  const showRoll = show("roll_number");
  const showReasonNotAppeared = show("reason_not_appeared");
  const showScores = show("scores");
  const showSchool = show("school_name");
  const showReasonNotAdmitted = show("reason_not_admitted");
  /** Year editable only while no pipeline stage is selected (pipelineStage === -1). */
  const yearEditable = pipelineStage(form) < 0;

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
      <div>
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
              <span style={labelStyle}>Student</span>
              <span style={valueStyle}>{studentName ?? `Student #${form.student_id}`}</span>
            </div>
            <div style={fieldStyle}>
              <span style={labelStyle}>Class</span>
              <span style={valueStyle}>
                {form.admission_class != null ? `Class ${form.admission_class}` : "—"}
              </span>
            </div>
          </div>
        </section>

        <section style={sec}>
          <div style={secTitle}>Exam Details</div>
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
              <span style={labelStyle}>Exam Category</span>
              <span style={valueStyle}>{viewExamCategory?.name ?? "—"}</span>
            </div>
          </div>
          {showAppliedExam && (
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
                <span style={labelStyle}>Exam Center</span>
                <span style={valueStyle}>{viewExamCenter?.name ?? "—"}</span>
              </div>
            </div>
          )}
          {(showAppliedExam || showRoll) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              {showAppliedExam && (
                <div style={fieldStyle}>
                  <span style={labelStyle}>Application #</span>
                  <span style={valueStyle}>{form.application_number ?? "—"}</span>
                </div>
              )}
              {showRoll && (
                <div style={fieldStyle}>
                  <span style={labelStyle}>Roll #</span>
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

  // ── ADD / EDIT ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Student */}
      <section style={sec}>
        <div style={secTitle}>Student</div>
        {isAdd ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 120px", gap: 8 }}>
            <div>
              <label style={grs.fieldLabel}>Kutir</label>
              <select
                value={kutirFilter}
                onChange={(e) => {
                  setKutirFilter(e.target.value === "" ? "" : Number(e.target.value));
                  setField("student_id", 0);
                  setSearch("");
                }}
                style={selStyles}
              >
                <option value="">-- Select Kutir --</option>
                {kutirs.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ position: "relative" }}>
              <label style={grs.fieldLabel}>
                Student <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                placeholder="Type name to search…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setField("student_id", 0);
                }}
                style={{
                  ...inputStyles,
                  borderRadius:
                    filteredStudents.length > 0 && search && !form.student_id
                      ? "6px 6px 0 0"
                      : undefined,
                }}
              />
              {filteredStudents.length > 0 && search && !form.student_id && (
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
                          const did = districtIdForKutir(
                            s.kutir_id,
                            allKutirsData,
                            allClusters,
                            allAreas,
                          );
                          applyParivaarDistrict(did);
                          // Drop center from another district when student (district) changes
                          if (did != null && form.exam_center_id != null) {
                            const cur = examCenters.find((c) => c.id === form.exam_center_id);
                            if (cur?.district_id != null && cur.district_id !== did) {
                              setField("exam_center_id", null);
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
            </div>
            <div>
              <label style={grs.fieldLabel}>
                Class <span style={{ color: "var(--danger)" }}>*</span>
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
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8 }}>
            <div>
              <label style={grs.fieldLabel}>Student</label>
              <input
                readOnly
                value={studentName ?? `Student #${form.student_id}`}
                style={{ ...inputStyles, opacity: 0.6, cursor: "not-allowed" }}
              />
            </div>
            <div>
              <label style={grs.fieldLabel}>Class</label>
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "90px 130px 1fr",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div>
            <label style={grs.fieldLabel}>Year</label>
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
          <div>
            <label style={grs.fieldLabel}>Exam Type</label>
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
            <label style={grs.fieldLabel}>Exam Category</label>
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

        {showAppliedExam && (
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
              <label style={grs.fieldLabel}>Parivaar District</label>
              <select
                value={examDistrictFilter}
                onChange={(e) => {
                  setExamDistrictFilter(e.target.value === "" ? "" : Number(e.target.value));
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
              <label style={grs.fieldLabel}>Exam Center</label>
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

        {(showAppliedExam || showRoll) && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              alignItems: "end",
              marginTop: 12,
            }}
          >
            {showAppliedExam ? (
              <div>
                <label style={grs.fieldLabel}>Application #</label>
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
                <label style={grs.fieldLabel}>Roll #</label>
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
                <label style={grs.fieldLabel}>{subj.name}</label>
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

      {/* Reason Not Appeared — only at Admit Card Downloaded stage */}
      {showReasonNotAppeared && (
        <section style={sec}>
          <div style={secTitle}>Reason Not Appeared for Exam</div>
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
              <label style={grs.fieldLabel}>District</label>
              <select
                value={schoolDistrictFilter}
                onChange={(e) => {
                  setSchoolDistrictFilter(e.target.value === "" ? "" : Number(e.target.value));
                  setField("admitted_school_id", null);
                }}
                style={selStyles}
              >
                <option value="">-- all --</option>
                {allDistricts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={grs.fieldLabel}>
                School Type <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select
                value={form.school_type}
                onChange={(e) => setField("school_type", e.target.value)}
                style={selStyles}
              >
                <option value="">-- all --</option>
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
                style={selStyles}
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
          <div style={secTitle}>Reason Not Admitted</div>
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
