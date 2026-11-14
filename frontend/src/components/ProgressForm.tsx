/**
 * Shared progress form used by ProgressDetailPage (edit/view).
 */
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import {
  listExams,
  listExamTypes,
  type StudentExam,
  type ProgressStatus,
  type ProgressTrack,
} from "../api/admissions";
import { listSchools, type School } from "../api/schools";
import { listKutirs } from "../api/kutirs";
import { listDistricts, listAreas, listClusters } from "../api/geo";
import { useAuth } from "../context/AuthContext";
import { hasGlobalDataScope } from "../constants/roles";
import { ViewField, viewStyles } from "@parivaar/ui";
import {
  STATUS_LABELS,
  STATUS_BADGES,
  progressStatusShowsRemarks,
  progressStatusSelectOptions,
} from "../constants/progressStatus";
import { formatAcademicYear, progressFilterYearOptions } from "../utils/academicYear";
import { studentLabel } from "../utils/studentLabel";
import { progressFieldLabel } from "../constants/progressFields";
import {
  classesForTrack,
  enabledMarkClasses,
  markField,
  type MarkFieldKey,
} from "../utils/progressTrack";

const CURRENT_YEAR = new Date().getFullYear();

export interface ProgressFormState {
  student_id: number;
  school_id: number;
  academic_year: number;
  class_in_year: number | null;
  track: ProgressTrack;
  status: ProgressStatus;
  transfer_school: string | null;
  /** UI + PATCH-only: maps to student_exams.admitted_school_id on save. */
  transfer_grs_school_id: number | null;
  marks_6: number | null;
  marks_7: number | null;
  marks_8: number | null;
  marks_9: number | null;
  marks_10: number | null;
  marks_11: number | null;
  marks_12: number | null;
  remarks: string | null;
}

export function emptyProgressForm(year = CURRENT_YEAR): ProgressFormState {
  return {
    student_id: 0,
    school_id: 0,
    academic_year: year,
    class_in_year: null,
    track: "six_twelve",
    status: "enrolled",
    transfer_school: null,
    transfer_grs_school_id: null,
    marks_6: null,
    marks_7: null,
    marks_8: null,
    marks_9: null,
    marks_10: null,
    marks_11: null,
    marks_12: null,
    remarks: null,
  };
}

/** PATCH payload: student/class/year/track/school are server-managed (admit + marks sync). */
export function progressUpdatePayloadFromForm(
  form: ProgressFormState,
): Omit<
  ProgressFormState,
  "student_id" | "school_id" | "academic_year" | "class_in_year" | "track"
> {
  const {
    student_id: _studentId,
    school_id: _schoolId,
    academic_year: _year,
    class_in_year: _class,
    track: _track,
    ...writable
  } = form;
  if (form.status === "transferred") {
    const base = progressStatusShowsRemarks(form.status)
      ? writable
      : { ...writable, remarks: null };
    return {
      ...base,
      transfer_grs_school_id: form.transfer_grs_school_id,
      transfer_school: null,
    };
  }
  return {
    ...writable,
    transfer_grs_school_id: null,
    transfer_school: null,
    remarks: progressStatusShowsRemarks(form.status) ? writable.remarks : null,
  };
}

/** Client-side validation before save (Progress edit). */
export function validateProgressSave(form: ProgressFormState): string | null {
  if (form.status !== "transferred") return null;
  if (!form.transfer_grs_school_id) {
    return "Transferred requires district, school type, and school name.";
  }
  return null;
}

export function progressToFormState(record: {
  student_id: number;
  school_id: number;
  academic_year: number;
  class_in_year: number | null;
  track: ProgressTrack;
  status: ProgressStatus;
  transfer_school: string | null;
  transfer_grs_school_id?: number | null;
  marks_6: number | null;
  marks_7: number | null;
  marks_8: number | null;
  marks_9: number | null;
  marks_10: number | null;
  marks_11: number | null;
  marks_12: number | null;
  remarks: string | null;
}): ProgressFormState {
  return {
    ...record,
    transfer_grs_school_id: record.transfer_grs_school_id ?? null,
  };
}

interface StudentMin {
  id: number;
  first_name: string;
  last_name: string;
  kutir_id: number | null;
}

interface ProgressFormProps {
  form: ProgressFormState;
  setForm: React.Dispatch<React.SetStateAction<ProgressFormState>>;
  mode: "add" | "edit" | "view";
  studentName?: string;
  schoolName?: string;
}

function trackFromAdmissionClass(admissionClass: number | null | undefined): ProgressTrack {
  return admissionClass === 8 ? "nine_twelve" : "six_twelve";
}

function classColumnLabel(classNum: number): string {
  const mod100 = classNum % 100;
  const mod10 = classNum % 10;
  let suffix = "th";
  if (mod10 === 1 && mod100 !== 11) suffix = "st";
  else if (mod10 === 2 && mod100 !== 12) suffix = "nd";
  else if (mod10 === 3 && mod100 !== 13) suffix = "rd";
  return `${classNum}${suffix}`;
}

export function ProgressForm({
  form,
  setForm,
  mode,
  studentName,
  schoolName,
}: ProgressFormProps) {
  const readOnly = mode === "view";
  const isAdd = mode === "add";
  const { user } = useAuth();
  const unscoped = hasGlobalDataScope(user?.title);

  const [search, setSearch] = useState("");
  const [modalDistrict, setModalDistrict] = useState<number | "">("");
  const [modalCluster, setModalCluster] = useState<number | "">("");
  const [transferDistrict, setTransferDistrict] = useState<number | "">("");
  const [transferSchoolType, setTransferSchoolType] = useState("");

  const needsGrsSchools = isAdd || (!readOnly && form.status === "transferred");
  const { data: schools = [] } = useQuery<School[]>({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
    enabled: needsGrsSchools || form.status === "transferred",
  });

  const { data: allKutirs = [] } = useQuery({
    queryKey: ["all-kutirs"],
    queryFn: () => listKutirs(),
    enabled: isAdd,
  });
  const { data: allDistricts = [] } = useQuery({
    queryKey: ["districts", { parivaar_presence: true }],
    queryFn: () => listDistricts(undefined, { parivaar_presence: true }),
    enabled: isAdd || form.status === "transferred",
  });
  const { data: allAreas = [] } = useQuery({
    queryKey: ["all-areas"],
    queryFn: () => listAreas(),
    enabled: isAdd,
  });
  const { data: allClusters = [] } = useQuery({
    queryKey: ["all-clusters"],
    queryFn: () => listClusters(),
    enabled: isAdd,
  });
  const { data: allExams = [] } = useQuery<StudentExam[]>({
    queryKey: ["all-exams-admitted"],
    queryFn: () => listExams({ admitted: true }),
    enabled: isAdd,
  });

  const { data: studentExams = [] } = useQuery<StudentExam[]>({
    queryKey: ["student-exams", form.student_id],
    queryFn: () => listExams({ student_id: form.student_id, admitted: true, limit: 50 }),
    enabled: !isAdd && form.student_id > 0,
  });

  const needsTransferExamTypes = !readOnly && form.status === "transferred";
  const { data: examTypes = [] } = useQuery({
    queryKey: ["exam-types"],
    queryFn: listExamTypes,
    enabled: needsTransferExamTypes,
  });

  const admissionExamForProgress = useMemo(() => {
    const startYear = form.academic_year - 1;
    return (
      studentExams.find((e) => e.admitted && e.school_start_year === startYear) ??
      studentExams.find((e) => e.admitted) ??
      null
    );
  }, [studentExams, form.academic_year]);

  const transferAdmissionExamTypeId = admissionExamForProgress?.exam_type_id ?? null;

  const linkedTransferSchoolTypeNames = useMemo(() => {
    if (transferAdmissionExamTypeId == null) return [] as string[];
    const et = examTypes.find((e) => e.id === transferAdmissionExamTypeId);
    const names = (et?.school_types ?? []).map((st) => st.name);
    return [...names].sort();
  }, [transferAdmissionExamTypeId, examTypes]);

  /** Exam-type junction options; keep current selection on edit if linkage changed. */
  const transferSchoolTypeOptions = useMemo(() => {
    const names = [...linkedTransferSchoolTypeNames];
    const saved = transferSchoolType.trim();
    if (saved && !names.includes(saved)) {
      names.push(saved);
      names.sort();
    }
    return names;
  }, [linkedTransferSchoolTypeNames, transferSchoolType]);

  const scopedDistricts =
    unscoped || !user
      ? allDistricts
      : allDistricts.filter((d) => user.district_ids.includes(d.id));
  const scopedClusters =
    unscoped || !user
      ? allClusters
      : user.cluster_ids.length > 0
        ? allClusters.filter((c) => user.cluster_ids.includes(c.id))
        : allClusters;
  const scopedKutirs =
    unscoped || !user
      ? allKutirs
      : user.kutir_ids.length > 0
        ? allKutirs.filter((k) => user.kutir_ids.includes(k.id))
        : allKutirs;

  const kutirMap = useMemo(
    () => new Map(scopedKutirs.map((k: { id: number; cluster_id: number }) => [k.id, k.cluster_id])),
    [scopedKutirs],
  );
  const clusterAreaMap = useMemo(
    () => new Map(allClusters.map((c: { id: number; area_id: number }) => [c.id, c.area_id])),
    [allClusters],
  );
  const areaDistrictMap = useMemo(
    () => new Map(allAreas.map((a: { id: number; district_id: number }) => [a.id, a.district_id])),
    [allAreas],
  );

  const modalClusters = useMemo(
    () =>
      scopedClusters.filter(
        (c: { id: number }) =>
          modalDistrict === "" ||
          areaDistrictMap.get(clusterAreaMap.get(c.id) ?? -1) === modalDistrict,
      ),
    [scopedClusters, modalDistrict, areaDistrictMap, clusterAreaMap],
  );

  const admittedExamByStudent = useMemo(() => {
    const m = new Map<number, StudentExam>();
    for (const e of allExams) {
      if (e.admitted && !m.has(e.student_id)) m.set(e.student_id, e);
    }
    return m;
  }, [allExams]);

  useEffect(() => {
    if (!isAdd) return;
    if (scopedDistricts.length === 1 && modalDistrict === "") {
      setModalDistrict(scopedDistricts[0].id);
    }
  }, [isAdd, scopedDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAdd || modalDistrict === "") return;
    const cls = scopedClusters.filter(
      (c: { id: number }) =>
        areaDistrictMap.get(clusterAreaMap.get(c.id) ?? -1) === modalDistrict,
    );
    if (cls.length === 1 && modalCluster === "") setModalCluster(cls[0].id);
  }, [isAdd, modalDistrict, scopedClusters.length, allAreas.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: rawStudents = [] } = useQuery<StudentMin[]>({
    queryKey: ["students-search", search],
    queryFn: async () =>
      (await api.get("/students", { params: { search, name_only: true, limit: 100 } })).data,
    enabled: isAdd && search.trim().length >= 1,
  });

  const students = useMemo(() => {
    if (modalCluster !== "") {
      return rawStudents.filter(
        (s) => s.kutir_id != null && kutirMap.get(s.kutir_id!) === modalCluster,
      );
    }
    if (modalDistrict !== "") {
      return rawStudents.filter((s) => {
        if (s.kutir_id == null) return false;
        const cid = kutirMap.get(s.kutir_id);
        if (cid == null) return false;
        const aid = clusterAreaMap.get(cid);
        if (aid == null) return false;
        return areaDistrictMap.get(aid) === modalDistrict;
      });
    }
    return rawStudents.slice(0, 20);
  }, [rawStudents, modalDistrict, modalCluster, kutirMap, clusterAreaMap, areaDistrictMap]);

  function set<K extends keyof ProgressFormState>(key: K, val: ProgressFormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const currentStatus = (form.status || "enrolled") as ProgressStatus;
  const badge = STATUS_BADGES[currentStatus] ?? STATUS_BADGES.enrolled;
  const markClasses = classesForTrack(form.track);
  const enabled = enabledMarkClasses(form.track, form.class_in_year, form.status, form);
  const statusSelectOptions = useMemo(
    () => progressStatusSelectOptions(form.marks_12),
    [form.marks_12],
  );
  const showRemarks = progressStatusShowsRemarks(currentStatus);
  const showTransferSchool = currentStatus === "transferred";
  const classYearReadOnly = readOnly || !isAdd;

  const transferDestSchool = useMemo(
    () => schools.find((s) => s.id === form.transfer_grs_school_id) ?? null,
    [schools, form.transfer_grs_school_id],
  );

  const transferSchoolsFiltered = useMemo(() => {
    return schools.filter((s) => {
      if (transferDistrict !== "" && s.district_id !== transferDistrict) return false;
      if (transferSchoolType && s.school_type !== transferSchoolType) return false;
      return true;
    });
  }, [schools, transferDistrict, transferSchoolType]);

  useEffect(() => {
    if (isAdd || form.status !== "transferred" || form.transfer_grs_school_id != null) return;
    const fromExam =
      admissionExamForProgress?.admitted_school_id ?? admissionExamForProgress?.school_id ?? null;
    if (fromExam) {
      setForm((f) => ({ ...f, transfer_grs_school_id: fromExam }));
    }
  }, [isAdd, form.status, form.transfer_grs_school_id, admissionExamForProgress]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!form.transfer_grs_school_id || schools.length === 0) return;
    const sc = schools.find((s) => s.id === form.transfer_grs_school_id);
    if (!sc) return;
    if (sc.district_id != null && transferDistrict === "") {
      setTransferDistrict(sc.district_id);
    }
    if (sc.school_type && transferSchoolType === "") {
      setTransferSchoolType(sc.school_type);
    }
  }, [form.transfer_grs_school_id, schools.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (form.status !== "transferred" || readOnly) return;
    if (
      transferSchoolType.trim() !== "" &&
      transferAdmissionExamTypeId != null &&
      !linkedTransferSchoolTypeNames.includes(transferSchoolType)
    ) {
      setTransferSchoolType("");
      setForm((f) => ({ ...f, transfer_grs_school_id: null }));
    }
  }, [
    form.status,
    readOnly,
    transferAdmissionExamTypeId,
    linkedTransferSchoolTypeNames,
    transferSchoolType,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const transferDistrictName =
    transferDestSchool?.district_id != null
      ? allDistricts.find((d) => d.id === transferDestSchool.district_id)?.name
      : transferDistrict !== ""
        ? allDistricts.find((d) => d.id === transferDistrict)?.name
        : undefined;

  return (
    <div className={readOnly ? "grs-form-layout" : "grs-form"}>
      {isAdd && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>District</label>
              <select
                style={inp}
                value={modalDistrict}
                onChange={(e) => {
                  setModalDistrict(e.target.value === "" ? "" : Number(e.target.value));
                  setModalCluster("");
                }}
              >
                <option value="">— Select District —</option>
                {scopedDistricts.map((d: { id: number; name: string }) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Cluster</label>
              <select
                style={inp}
                value={modalCluster}
                onChange={(e) =>
                  setModalCluster(e.target.value === "" ? "" : Number(e.target.value))
                }
                disabled={modalDistrict === ""}
              >
                <option value="">— Select Cluster —</option>
                {modalClusters.map((c: { id: number; name: string }) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{progressFieldLabel("student", { required: true })}</label>
            <input
              style={inp}
              placeholder="Type name to search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {students.length > 0 && (
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderTop: "none",
                  borderRadius: "0 0 6px 6px",
                  maxHeight: 160,
                  overflowY: "auto",
                }}
              >
                {students.map((s) => {
                  const label = studentLabel(s);
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        set("student_id", s.id);
                        setSearch(label);
                        const exam = admittedExamByStudent.get(s.id);
                        if (exam?.admitted_school_id) set("school_id", exam.admitted_school_id);
                        if (exam?.admission_class != null) {
                          set("track", trackFromAdmissionClass(exam.admission_class));
                          set("class_in_year", exam.admission_class + 1);
                          set("academic_year", exam.school_start_year + 1);
                        }
                      }}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        background:
                          form.student_id === s.id ? "var(--badge-blue-bg)" : "var(--bg-card)",
                      }}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {!isAdd && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <ViewField
            label={progressFieldLabel("student")}
            labelStyle={progressViewLabelStyle}
            valueStyle={progressViewValueStyle}
            style={{ flex: 1, minWidth: 140 }}
          >
            {form.student_id ? (
              readOnly ? (
                <Link
                  to={`/students/${form.student_id}`}
                  style={{
                    color: "var(--badge-purple-fg)",
                    textDecoration: "none",
                    fontWeight: 400,
                    fontSize: progressViewValueStyle.fontSize,
                  }}
                >
                  {studentName ?? `Student #${form.student_id}`}
                </Link>
              ) : (
                (studentName ?? `Student #${form.student_id}`)
              )
            ) : null}
          </ViewField>
          <ViewField
            label={progressFieldLabel("school_id")}
            labelStyle={progressViewLabelStyle}
            valueStyle={progressViewValueStyle}
            style={{ flex: 1, minWidth: 140 }}
          >
            {schoolName ?? "—"}
          </ViewField>
        </div>
      )}

      {classYearReadOnly ? (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <ViewField
            label="Academic Year"
            labelStyle={progressViewLabelStyle}
            valueStyle={progressViewValueStyle}
            style={{ flex: 1, minWidth: 120 }}
          >
            {formatAcademicYear(form.academic_year)}
          </ViewField>
          <ViewField
            label={progressFieldLabel("class_in_year")}
            labelStyle={progressViewLabelStyle}
            valueStyle={progressViewValueStyle}
            style={{ flex: 1, minWidth: 100 }}
          >
            {form.class_in_year != null ? `Class ${form.class_in_year}` : null}
          </ViewField>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={labelStyle}>Academic Year</label>
            <select
              style={inp}
              value={form.academic_year}
              onChange={(e) => set("academic_year", Number(e.target.value))}
            >
              {progressFilterYearOptions(CURRENT_YEAR).map((y) => (
                <option key={y} value={y}>
                  {formatAcademicYear(y)}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <label style={labelStyle}>{progressFieldLabel("class_in_year")}</label>
            <select
              style={inp}
              value={form.class_in_year ?? ""}
              onChange={(e) =>
                set("class_in_year", e.target.value === "" ? null : Number(e.target.value))
              }
            >
              <option value="">— select —</option>
              {markClasses.map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isAdd && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{progressFieldLabel("school_id", { required: true })}</label>
          <select
            style={inp}
            value={form.school_id || ""}
            onChange={(e) => set("school_id", Number(e.target.value))}
          >
            <option value="">— select —</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.school_type})
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Marks by Class (%)</label>
        <div className="grs-scroll-x">
          <div style={marksGridStyle(markClasses.length)}>
            <span style={marksRowLabel}>Class</span>
            {markClasses.map((classNum) => (
              <span key={classNum} style={marksClassHeader}>
                {classColumnLabel(classNum)}
              </span>
            ))}
            <span style={marksRowLabel}>Marks</span>
            {markClasses.map((classNum) => {
              const field: MarkFieldKey = markField(classNum);
              const val = form[field];
              const canEdit = !readOnly && enabled.includes(classNum);
              const disabled = readOnly || !canEdit;
              if (readOnly) {
                return (
                  <span key={classNum} style={marksViewCell}>
                    {val != null ? `${parseFloat(String(val)).toFixed(1)}%` : "—"}
                  </span>
                );
              }
              return (
                <input
                  key={classNum}
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  aria-label={`Marks for class ${classNum}`}
                  style={{
                    ...inp,
                    ...marksInputCell,
                    opacity: disabled ? 0.55 : 1,
                  }}
                  disabled={disabled}
                  value={val ?? ""}
                  onChange={(e) =>
                    set(field, e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        {readOnly ? (
          <ViewField
            label={progressFieldLabel("status")}
            labelStyle={progressViewLabelStyle}
            valueStyle={progressViewValueStyle}
          >
            <span
              style={{
                background: badge.bg,
                color: badge.fg,
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: 14,
                fontWeight: 400,
              }}
            >
              {badge.prefix}
              {STATUS_LABELS[currentStatus]}
            </span>
          </ViewField>
        ) : (
          <>
            <label style={labelStyle}>{progressFieldLabel("status")}</label>
            <select
              style={inp}
              value={currentStatus}
              onChange={(e) => {
                const next = e.target.value as ProgressStatus;
                setForm((f) => ({
                  ...f,
                  status: next,
                  ...(next === "transferred"
                    ? {}
                    : { transfer_grs_school_id: null, transfer_school: null }),
                  ...(progressStatusShowsRemarks(next) ? {} : { remarks: null }),
                }));
                if (next !== "transferred") {
                  setTransferDistrict("");
                  setTransferSchoolType("");
                }
              }}
            >
              {statusSelectOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {showTransferSchool && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 8,
              alignItems: "end",
            }}
          >
            {readOnly ? (
              <>
                <ViewField
                  label="District"
                  labelStyle={progressViewLabelStyle}
                  valueStyle={progressViewValueStyle}
                >
                  {transferDistrictName ?? "—"}
                </ViewField>
                <ViewField
                  label="School Type"
                  labelStyle={progressViewLabelStyle}
                  valueStyle={progressViewValueStyle}
                >
                  {transferDestSchool?.school_type ?? "—"}
                </ViewField>
                <ViewField
                  label="School Name"
                  labelStyle={progressViewLabelStyle}
                  valueStyle={progressViewValueStyle}
                >
                  {transferDestSchool?.name ?? form.transfer_school ?? "—"}
                </ViewField>
              </>
            ) : (
              <>
                <div>
                  <label style={labelStyle}>
                    District <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <select
                    style={inp}
                    value={transferDistrict}
                    onChange={(e) => {
                      const v = e.target.value === "" ? "" : Number(e.target.value);
                      setTransferDistrict(v);
                      set("transfer_grs_school_id", null);
                    }}
                  >
                    <option value="">— select —</option>
                    {allDistricts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>
                    School Type <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <select
                    value={transferSchoolType}
                    onChange={(e) => {
                      setTransferSchoolType(e.target.value);
                      set("transfer_grs_school_id", null);
                    }}
                    disabled={transferAdmissionExamTypeId == null}
                    style={{
                      ...inp,
                      ...(transferAdmissionExamTypeId == null
                        ? { opacity: 0.6, cursor: "not-allowed" }
                        : {}),
                    }}
                  >
                    <option value="">
                      {transferAdmissionExamTypeId == null
                        ? "— no exam type on admission —"
                        : transferSchoolTypeOptions.length === 0
                          ? "— no school types for exam type —"
                          : "— select —"}
                    </option>
                    {transferSchoolTypeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>
                    School Name <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <select
                    value={form.transfer_grs_school_id ?? ""}
                    onChange={(e) =>
                      set(
                        "transfer_grs_school_id",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                    disabled={!transferSchoolType}
                    style={{
                      ...inp,
                      ...(!transferSchoolType ? { opacity: 0.6, cursor: "not-allowed" } : {}),
                    }}
                  >
                    <option value="">
                      {!transferSchoolType ? "— select school type first —" : "— select —"}
                    </option>
                    {transferSchoolsFiltered.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name} ({sc.school_type})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showRemarks && (
        <div style={{ marginBottom: 14 }}>
          {readOnly ? (
            <ViewField
              label={progressFieldLabel("remarks")}
              labelStyle={progressViewLabelStyle}
              valueStyle={{ ...progressViewValueStyle, whiteSpace: "pre-wrap" }}
            >
              {form.remarks}
            </ViewField>
          ) : (
            <>
              <label style={labelStyle}>{progressFieldLabel("remarks")}</label>
              <textarea
                style={{ ...inp, resize: "vertical" }}
                rows={2}
                value={form.remarks ?? ""}
                onChange={(e) => set("remarks", e.target.value || null)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Title-case read-only labels; 14px reads like Admission view labels without uppercase. */
const progressViewLabelStyle: React.CSSProperties = {
  textTransform: "none",
  letterSpacing: "normal",
  fontSize: 14,
};

/** Read-only values match 16px form inputs and marks cells on this form. */
const progressViewValueStyle: React.CSSProperties = {
  ...viewStyles.value,
  fontSize: 16,
};

const labelStyle: React.CSSProperties = {
  ...viewStyles.label,
  ...progressViewLabelStyle,
  marginBottom: 3,
};

const inp: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "7px 10px",
  fontSize: 16,
  boxSizing: "border-box",
  background: "var(--bg-input)",
  color: "var(--text-primary)",
};

/** Fit all track columns inside the form shell; scroll only on very narrow viewports. */
function marksGridStyle(columnCount: number): React.CSSProperties {
  const labelRem = 4.25;
  const colMinPx = 44;
  const gapPx = 8;
  const minWidth =
    labelRem * 16 + columnCount * colMinPx + Math.max(0, columnCount - 1) * gapPx;
  return {
    display: "grid",
    gridTemplateColumns: `${labelRem}rem repeat(${columnCount}, minmax(0, 1fr))`,
    columnGap: gapPx,
    rowGap: gapPx,
    alignItems: "center",
    width: "100%",
    minWidth: Math.max(280, minWidth),
  };
}

const marksRowLabel: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--text-secondary)",
};

const marksClassHeader: React.CSSProperties = {
  minWidth: 0,
  textAlign: "center",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--text-secondary)",
};

const marksInputCell: React.CSSProperties = {
  minWidth: 0,
  width: "100%",
};

const marksViewCell: React.CSSProperties = {
  minWidth: 0,
  textAlign: "center",
  fontSize: 16,
  color: "var(--text-primary)",
  padding: "7px 4px",
  boxSizing: "border-box",
};
