import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listExams, createExam, updateExam, deleteExam } from "../api/admissions";
import type { StudentExam, StudentExamCreate } from "../api/admissions";
import { listStudents, listSchoolTypeSubjects } from "../api/students";
import type { SchoolTypeSubjectRow } from "../api/students";
import type { Student } from "../api/students";
import { listSchools } from "../api/schools";
import { useAuth } from "../context/AuthContext";
import { listKutirs } from "../api/kutirs";
import { grs } from "../styles/grs";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { ADMISSIONS_FIELDS } from "../constants/admissionsFields";
import { listDistricts, listAreas, listClusters, listExamCenters, listExamCategories, listNoExamReasons, listNoAdmitReasons } from "../api/geo";
import type { ExamCenter, ExamCategory, NoExamReason, NoAdmitReason } from "../api/geo";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 2 + i);

// Pipeline stages in order
const STAGES = [
  { key: "eligible",       label: "Eligible" },
  { key: "applied",        label: "Applied" },
  { key: "admit_card",     label: "Admit Card Downloaded" },
  { key: "appeared",       label: "Appeared" },
  { key: "selected",       label: "Selected" },
  { key: "admitted",       label: "Admitted" },
] as const;

type StageKey = typeof STAGES[number]["key"];
// Returns the subjects configured for a given school type (from Lookups)
function subjectsForType(
  rows: SchoolTypeSubjectRow[],
  schoolType: string | null
): { id: number; name: string }[] {
  if (!schoolType) return [];
  return rows.find(r => r.school_type === schoolType)?.subjects ?? [];
}

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
        background: "var(--badge-grey-bg)", color: "var(--badge-grey-fg)",
        padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600
      }}>Registered</span>
    );
  }
  const colors: Record<number, { bg: string; color: string }> = {
    0: { bg: "var(--badge-sky-bg)",    color: "var(--badge-sky-fg)"    },
    1: { bg: "var(--badge-indigo-bg)", color: "var(--badge-indigo-fg)" },
    2: { bg: "var(--badge-yellow-bg)", color: "var(--badge-yellow-fg)" },
    3: { bg: "var(--badge-green-bg)",  color: "var(--badge-green-fg)"  },
    4: { bg: "var(--badge-green-bg)",  color: "var(--badge-green-fg)"  },
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
            {i > 0 && <span style={{ color: "var(--border)", margin: "0 4px" }}>›</span>}
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
              style={{ accentColor: "var(--link-color)" }}
            />
            <span style={{ color: done ? "var(--badge-sky-fg)" : "var(--text-secondary)", fontWeight: done ? 600 : 400 }}>
              {stage.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

// ── Unified AdmissionModal ────────────────────────────────────────────────────
function AdmissionModal({
  mode, exam, student, students, schools, districts, year = CURRENT_YEAR,
  examCategories, examCenters, noExamReasons, noAdmitReasons,
  allExams = [], onClose, onSave, onEdit,
  saveError, saving,
}: {
  mode: "add" | "edit" | "view";
  exam?: StudentExam;
  student?: Student;
  students: Student[];
  schools: { id: number; name: string; school_type: string; district_id: number | null }[];
  districts: { id: number; name: string }[];
  year?: number;
  examCategories: ExamCategory[];
  examCenters: ExamCenter[];
  noExamReasons: NoExamReason[];
  noAdmitReasons: NoAdmitReason[];
  allExams?: StudentExam[];
  onClose: () => void;
  onSave?: (data: StudentExamCreate | Partial<StudentExamCreate>) => void;
  onEdit?: () => void;
  saveError?: string | null;
  saving?: boolean;
}) {
  const isAdd  = mode === "add";
  const isEdit = mode === "edit";
  const isView = mode === "view";

  // — Student picker (add mode only) —
  const [studentId, setStudentId] = useState<number | "">(isAdd ? "" : (exam?.student_id ?? ""));
  const [search, setSearch]       = useState("");
  const [kutirFilter, setKutirFilter] = useState<number | "">("");
  const { data: kutirs = [] } = useQuery({
    queryKey: ["kutirs"], queryFn: () => listKutirs(), staleTime: 5 * 60 * 1000,
  });
  const { data: schoolTypeSubjects = [] } = useQuery<SchoolTypeSubjectRow[]>({
    queryKey: ["school-type-subjects"], queryFn: listSchoolTypeSubjects, staleTime: 5 * 60 * 1000,
  });

  // — District filter for GRS School dropdown —
  const [schoolDistrictFilter, setSchoolDistrictFilter] = useState<number | "">("");

  // — School type state (editable in add/edit; read-only display in view) —
  const [schoolType, setSchoolType] = useState<string>(isAdd ? "" : (exam?.school_type ?? ""));

  // — Year (selectable in add; read-only in edit/view) —
  const [sy, setSy] = useState<number>(isAdd ? year : (exam?.school_start_year ?? year));

  // — Form/pipeline state —
  const [form, setForm] = useState<Partial<StudentExamCreate>>(() =>
    isAdd
      ? { eligible: true, form_received: false, applied: false, appeared: false, selected: false, admitted: false }
      : { ...exam }
  );
  const [scoreInputs, setScoreInputs] = useState<Record<number, string>>(() =>
    isAdd ? {} : Object.fromEntries((exam?.scores ?? []).map(s => [s.subject_id, s.score != null ? String(s.score) : ""]))
  );
  const [admitBlockMsg, setAdmitBlockMsg] = useState<string | null>(null);

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })); }
  function setScore(subjectId: number, val: string) { setScoreInputs(prev => ({ ...prev, [subjectId]: val })); }

  function toggleStage(updates: Partial<Record<StageKey, boolean>>) {
    if (updates.admitted === true && isEdit && exam) {
      const alreadyAdmitted = allExams.find(
        e => e.student_id === exam.student_id && e.admitted && e.id !== exam.id
      );
      if (alreadyAdmitted) {
        setAdmitBlockMsg(
          `This student is already admitted via ${alreadyAdmitted.school_type ?? "another school"}. Only one admission is allowed.`
        );
        return;
      }
    }
    setAdmitBlockMsg(null);
    setForm(f => ({ ...f, ...updates }));
  }

  const schoolTypes = Array.from(new Set(schools.map(sc => sc.school_type))).sort();
  const subjects     = subjectsForType(schoolTypeSubjects, schoolType || null);
  const scoreEnabled = !!form.selected;

  const filteredStudents = students.filter(s => {
    const matchSearch = `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase());
    const matchKutir  = kutirFilter === "" || s.kutir_id === Number(kutirFilter);
    return matchSearch && matchKutir;
  });

  // Derived display values (mainly used in view mode)
  const currentStudent  = isAdd ? students.find(s => s.id === Number(studentId)) : student;
  const viewExamCategory = examCategories.find(c => c.id === exam?.exam_category_id);
  const viewExamCenter   = examCenters.find(c => c.id === exam?.exam_center_id);
  const noExamReason     = noExamReasons.find(r => r.id === exam?.no_exam_reason_id);
  const noAdmitReason    = noAdmitReasons.find(r => r.id === exam?.no_admit_reason_id);
  const admittedSchool   = schools.find(s => s.id === exam?.admitted_school_id);
  const schoolTypeFiltered = schoolType ? schools.filter(s => s.school_type === schoolType) : schools;
  const filteredGrsSchools = schoolDistrictFilter === ""
    ? schoolTypeFiltered
    : schoolTypeFiltered.filter(s => s.district_id === schoolDistrictFilter);
  const totalScore = (exam?.scores ?? []).reduce<number>((sum, s) => sum + (s.score != null ? Number(s.score) : 0), 0);
  const hasScore   = (exam?.scores ?? []).length > 0 && (exam?.scores ?? []).some(s => s.score != null);

  const selStyles: React.CSSProperties   = { width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box" };
  const inputStyles: React.CSSProperties = { width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box" };
  const fieldStyle: React.CSSProperties  = { display: "flex", flexDirection: "column", gap: 2 };
  const labelStyle: React.CSSProperties  = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)" };
  const valueStyle: React.CSSProperties  = { fontSize: 14, color: "var(--text-primary)", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", boxSizing: "border-box", display: "block", width: "100%" };

  const title = isAdd ? "Add Admission" : isEdit ? "Edit Admission" : "View Admission";

  function handleSave() {
    if (!onSave) return;
    if (isAdd && !schoolType) return;  // school type required
    if (isAdd) {
      onSave({
        student_id:           Number(studentId),
        school_id:            null,
        school_type:          schoolType || null,
        school_start_year:    sy,
        eligible:             form.eligible ?? true,
        form_received:        form.form_received,
        applied:              form.applied,
        appeared:             form.appeared,
        selected:             form.selected,
        admitted:             form.admitted,
        exam_category_id:     form.exam_category_id ?? null,
        exam_center_id:       form.exam_center_id ?? null,
        application_number:   form.application_number ?? null,
        roll_number:          form.roll_number ?? null,
        scores: Object.entries(scoreInputs)
          .filter(([, v]) => v !== "")
          .map(([id, v]) => ({ subject_id: Number(id), score: parseFloat(v) })),
        no_exam_reason_id:  form.appeared ? null : (form.no_exam_reason_id ?? null),
        no_admit_reason_id: (form.selected && !form.admitted) ? (form.no_admit_reason_id ?? null) : null,
        admitted_school_id: form.admitted ? (form.admitted_school_id ?? null) : null,
        admission_class:    form.admission_class ?? null,
      } as StudentExamCreate);
    } else {
      onSave({
        eligible:           form.eligible,
        form_received:      form.form_received,
        applied:            form.applied,
        appeared:           form.appeared,
        selected:           form.selected,
        admitted:           form.admitted,
        application_number: form.application_number,
        roll_number:        form.roll_number,
        scores: Object.entries(scoreInputs)
          .filter(([, v]) => v !== "")
          .map(([id, v]) => ({ subject_id: Number(id), score: parseFloat(v) })),
        exam_category_id:   form.exam_category_id,
        exam_center_id:     form.exam_center_id,
        no_exam_reason_id:  form.appeared ? null : form.no_exam_reason_id,
        no_admit_reason_id: (form.selected && !form.admitted) ? form.no_admit_reason_id : null,
        admitted_school_id: form.admitted ? form.admitted_school_id : null,
        admission_class:    form.admission_class ?? null,
        school_type:        schoolType || null,
      });
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: "var(--bg-card)", borderRadius: 12, padding: 28,
        width: 560, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>

        {/* ── Title ── */}
        {isView ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 18, color: "var(--text-primary)" }}>{title}</h3>
            <button onClick={onClose} style={{ ...grs.btnIcon, fontSize: 18, lineHeight: 1 }}>✕</button>
          </div>
        ) : (
          <h3 style={{ margin: "0 0 20px", fontSize: 18, color: "var(--text-primary)" }}>{title}</h3>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Stage badge (view only) ── */}
          {isView && exam && (
            <div style={{ background: "var(--bg-input)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>STAGE</span>
              <StageBadge exam={exam} />
              {exam.eligible === false && (
                <span style={{ fontSize: 11, color: "#e53e3e", fontWeight: 600, marginLeft: 4 }}>Not eligible</span>
              )}
            </div>
          )}

          {/* ── Student + Class ── */}
          {isAdd ? (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 6 }}>
                <input
                  placeholder="Search student..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={inputStyles}
                />
                <select
                  value={kutirFilter}
                  onChange={e => { setKutirFilter(e.target.value === "" ? "" : Number(e.target.value)); setStudentId(""); }}
                  style={selStyles}
                >
                  <option value="">-- all kutirs --</option>
                  {kutirs.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8 }}>
                <div>
                  <label style={grs.fieldLabel}>Student <span style={{ color: "var(--danger)" }}>*</span></label>
                  <select value={studentId} onChange={e => setStudentId(Number(e.target.value))} style={selStyles}>
                    <option value="">-- select student --</option>
                    {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={grs.fieldLabel}>Class <span style={{ color: "var(--danger)" }}>*</span></label>
                  <select
                    value={form.admission_class ?? ""}
                    onChange={e => set("admission_class", e.target.value === "" ? null : Number(e.target.value))}
                    style={selStyles}
                  >
                    <option value="">-- select --</option>
                    <option value={5}>Class 5</option>
                    <option value={8}>Class 8</option>
                  </select>
                </div>
              </div>
            </div>
          ) : isView ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
              <div style={fieldStyle}>
                <span style={labelStyle}>Student</span>
                <span style={valueStyle}>{currentStudent ? `${currentStudent.first_name} ${currentStudent.last_name}` : `Student #${exam?.student_id}`}</span>
              </div>
              <div style={fieldStyle}>
                <span style={labelStyle}>Class</span>
                <span style={valueStyle}>{exam?.admission_class != null ? `Class ${exam.admission_class}` : "—"}</span>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8 }}>
              <div>
                <label style={grs.fieldLabel}>Student</label>
                <input
                  readOnly
                  value={currentStudent ? `${currentStudent.first_name} ${currentStudent.last_name}` : `Student #${exam?.student_id}`}
                  style={{ ...inputStyles, opacity: 0.6, cursor: "not-allowed" }}
                />
              </div>
              <div>
                <label style={grs.fieldLabel}>Class</label>
                <select
                  value={form.admission_class ?? ""}
                  onChange={e => set("admission_class", e.target.value === "" ? null : Number(e.target.value))}
                  style={selStyles}
                >
                  <option value="">-- select --</option>
                  <option value={5}>Class 5</option>
                  <option value={8}>Class 8</option>
                </select>
              </div>
            </div>
          )}

          {/* ── Pipeline stepper (add/edit only) ── */}
          {!isView && (
            <div>
              <label style={{ ...grs.fieldLabel, fontWeight: 700, marginBottom: 8 }}>Pipeline Stage</label>
              <PipelineStepper
                exam={isAdd
                  ? { ...form, id: 0, student_id: 0, school_id: 0, school_start_year: sy,
                      eligible: form.eligible ?? true, form_received: form.form_received ?? false,
                      applied: form.applied ?? false, appeared: form.appeared ?? false,
                      selected: form.selected ?? false, admitted: form.admitted ?? false,
                      admitted_school_id: null, no_admit_reason_id: null, exam_category_id: null,
                      application_number: null, exam_center_id: null, roll_number: null,
                      no_exam_reason_id: null, math: null, english: null, reasoning: null,
                      evs: null, scores: [], created_at: "", updated_at: "",
                      school_type: schoolType || null } as StudentExam
                  : form as StudentExam
                }
                onChange={toggleStage}
              />
            </div>
          )}

          {/* ── Year + School Type + Exam Category ── */}
          {isView ? (
            <div style={{ display: "grid", gridTemplateColumns: "90px 130px 1fr", gap: 12 }}>
              <div style={fieldStyle}><span style={labelStyle}>Year</span><span style={valueStyle}>{exam?.school_start_year}</span></div>
              <div style={fieldStyle}><span style={labelStyle}>School Type</span><span style={valueStyle}>{exam?.school_type ?? "—"}</span></div>
              <div style={fieldStyle}><span style={labelStyle}>Exam Category</span><span style={valueStyle}>{viewExamCategory?.name ?? "—"}</span></div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "90px 130px 1fr", gap: 12, alignItems: "end" }}>
              <div>
                <label style={grs.fieldLabel}>Year</label>
                {isAdd ? (
                  <select value={sy} onChange={e => setSy(Number(e.target.value))} style={selStyles}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                ) : (
                  <input readOnly value={exam?.school_start_year} style={{ ...inputStyles, opacity: 0.6, cursor: "not-allowed" }} />
                )}
              </div>
              <div>
                <label style={grs.fieldLabel}>School Type <span style={{ color: "var(--danger)" }}>*</span></label>
                <select value={schoolType} onChange={e => setSchoolType(e.target.value)} style={selStyles}>
                  <option value="">-- select --</option>
                  {schoolTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={grs.fieldLabel}>Exam Category</label>
                <select value={form.exam_category_id ?? ""} onChange={e => set("exam_category_id", e.target.value === "" ? null : Number(e.target.value))} style={{ ...selStyles, opacity: form.selected ? 1 : 0.45, cursor: form.selected ? "auto" : "not-allowed" }} disabled={!form.selected}>
                  <option value="">-- select --</option>
                  {examCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* ── Exam Center + App# + Roll# ── */}
          {isView ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div style={fieldStyle}><span style={labelStyle}>Exam Center</span><span style={valueStyle}>{viewExamCenter?.name ?? "—"}</span></div>
              <div style={fieldStyle}><span style={labelStyle}>Application #</span><span style={valueStyle}>{exam?.application_number ?? "—"}</span></div>
              <div style={fieldStyle}><span style={labelStyle}>Roll #</span><span style={valueStyle}>{exam?.roll_number ?? "—"}</span></div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, alignItems: "end" }}>
              <div>
                <label style={grs.fieldLabel}>Exam Center</label>
                <select value={form.exam_center_id ?? ""} onChange={e => set("exam_center_id", e.target.value === "" ? null : Number(e.target.value))} style={{ ...selStyles, opacity: form.admit_card ? 1 : 0.45, cursor: form.admit_card ? "auto" : "not-allowed" }} disabled={!form.admit_card}>
                  <option value="">-- select --</option>
                  {examCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {form.applied ? (
              <div>
                <label style={grs.fieldLabel}>Application #</label>
                <input value={form.application_number ?? ""} onChange={e => set("application_number", e.target.value || null)} style={inputStyles} />
              </div>
              ) : <div />}
              <div>
                <label style={grs.fieldLabel}>Roll #</label>
                <input value={form.roll_number ?? ""} onChange={e => set("roll_number", e.target.value || null)} style={{ ...inputStyles, opacity: form.admit_card ? 1 : 0.45, cursor: form.admit_card ? "auto" : "not-allowed" }} readOnly={!form.admit_card} />
              </div>
            </div>
          )}

          {/* ── Scores ── */}
          {isView ? (
            hasScore && (
              <div>
                <span style={{ ...labelStyle, display: "block", marginBottom: 8 }}>Scores</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
                  {(exam?.scores ?? []).filter(s => s.score != null).map(s => (
                    <div key={s.subject_id} style={{ background: "var(--bg-input)", borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", marginBottom: 2 }}>
                        {s.subject?.name ?? `Subject ${s.subject_id}`}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                        {s.score}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8, textAlign: "right", fontSize: 13, color: "var(--text-secondary)" }}>
                  Total: <strong style={{ color: "var(--text-primary)", fontSize: 15 }}>{totalScore}</strong>
                </div>
              </div>
            )
          ) : subjects.length > 0 ? (
            <div>
              <label style={{ ...grs.fieldLabel, fontWeight: 700, marginBottom: 4 }}>Scores</label>
              {!scoreEnabled && (
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 8px" }}>Enable by checking Selected above</p>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {subjects.map(subj => (
                  <div key={subj.id}>
                    <label style={grs.fieldLabel}>{subj.name}</label>
                    <input
                      type="number" min={0} max={100} step={0.01}
                      value={scoreInputs[subj.id] ?? ""}
                      onChange={e => setScore(subj.id, e.target.value)}
                      style={{ ...inputStyles, opacity: scoreEnabled ? 1 : 0.45, cursor: scoreEnabled ? "auto" : "not-allowed" }}
                      placeholder="—"
                      disabled={!scoreEnabled}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* ── Reason Not Appeared ── */}
          {isView ? (
            noExamReason && (
              <div style={fieldStyle}>
                <span style={labelStyle}>Reason Not Appeared</span>
                <span style={valueStyle}>{noExamReason.reason}</span>
              </div>
            )
          ) : !form.appeared ? (
            <div>
              <label style={grs.fieldLabel}>Reason Not Appeared for Exam</label>
              <select value={form.no_exam_reason_id ?? ""} onChange={e => set("no_exam_reason_id", e.target.value === "" ? null : Number(e.target.value))} style={selStyles}>
                <option value="">-- select --</option>
                {noExamReasons.map(r => <option key={r.id} value={r.id}>{r.reason}</option>)}
              </select>
            </div>
          ) : null}

          {/* ── GRS School ── */}
          {isView ? (
            exam?.selected ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
                <div style={fieldStyle}>
                  <span style={labelStyle}>District</span>
                  <span style={valueStyle}>
                    {admittedSchool?.district_id
                      ? (districts.find(d => d.id === admittedSchool.district_id)?.name ?? "—")
                      : "—"}
                  </span>
                </div>
                <div style={fieldStyle}>
                  <span style={labelStyle}>GRS School</span>
                  <span style={valueStyle}>{admittedSchool ? `${admittedSchool.name} (${admittedSchool.school_type})` : "—"}</span>
                </div>
              </div>
            ) : null
          ) : form.selected ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, alignItems: "end" }}>
              <div>
                <label style={grs.fieldLabel}>District</label>
                <select
                  value={schoolDistrictFilter}
                  onChange={e => {
                    setSchoolDistrictFilter(e.target.value === "" ? "" : Number(e.target.value));
                    set("admitted_school_id", null);
                  }}
                  style={selStyles}
                >
                  <option value="">-- all --</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label style={grs.fieldLabel}>GRS School</label>
                <select value={form.admitted_school_id ?? ""} onChange={e => set("admitted_school_id", e.target.value === "" ? null : Number(e.target.value))} style={selStyles}>
                  <option value="">-- select --</option>
                  {filteredGrsSchools.map(sc => <option key={sc.id} value={sc.id}>{sc.name} ({sc.school_type})</option>)}
                </select>
              </div>
            </div>
          ) : null}

          {/* ── Reason Not Admitted ── */}
          {isView ? (
            (exam?.selected && !exam?.admitted) ? (
              <div style={fieldStyle}>
                <span style={labelStyle}>Reason Not Admitted</span>
                <span style={valueStyle}>{noAdmitReason ? noAdmitReason.reason : "—"}</span>
              </div>
            ) : null
          ) : (form.selected && !form.admitted) ? (
            <div>
              <label style={grs.fieldLabel}>Reason Not Admitted</label>
              <select value={form.no_admit_reason_id ?? ""} onChange={e => set("no_admit_reason_id", e.target.value === "" ? null : Number(e.target.value))} style={selStyles}>
                <option value="">-- select --</option>
                {noAdmitReasons.map(r => <option key={r.id} value={r.id}>{r.reason}</option>)}
              </select>
            </div>
          ) : null}

        </div>

        {/* ── Error messages ── */}
        {admitBlockMsg && (
          <div style={{ marginTop: 16, padding: "8px 12px", background: "var(--warning-bg, #fffbeb)", border: "1px solid var(--warning-border, #fcd34d)", borderRadius: 6, color: "var(--warning-text, #92400e)", fontSize: 13 }}>
            ⚠️ {admitBlockMsg}
          </div>
        )}
        {saveError && (
          <div style={{ marginTop: 16, padding: "8px 12px", background: "var(--danger-bg, #fef2f2)", border: "1px solid var(--danger-border, #fca5a5)", borderRadius: 6, color: "var(--danger, #dc2626)", fontSize: 13 }}>
            {saveError}
          </div>
        )}

        {/* ── Action buttons ── */}
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          {isView ? (
            <>
              <button onClick={onClose} style={grs.btnSecondary}>Close</button>
              <button onClick={onEdit} style={grs.btnPrimary}>Edit</button>
            </>
          ) : (
            <>
              <button onClick={onClose} style={grs.btnSecondary}>Cancel</button>
              <button
                disabled={isAdd ? (!studentId || !schoolType || !!saving) : !!saving}
                onClick={handleSave}
                style={{ ...grs.btnPrimary, opacity: (isAdd && (!studentId || !schoolType)) ? 0.5 : 1 }}
              >
                {isAdd ? "Add" : "Save Changes"}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Main AdmissionsPage ───────────────────────────────────────────────────────
// ── Main AdmissionsPage ───────────────────────────────────────────────────────
export default function AdmissionsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.title === "Admin";

  useEffect(() => {
    if (window.location.search.includes("_=")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const [year, setYear] = useState(CURRENT_YEAR);
  const [filterDistrict, setFilterDistrict] = useState<number | "">("");
  const [filterCluster, setFilterCluster] = useState<number | "">("");
  const [showAdd, setShowAdd] = useState(false);
  const [editExam, setEditExam] = useState<StudentExam | null>(null);
  const [viewExam, setViewExam] = useState<StudentExam | null>(null);

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
  const { data: examCategories = [] } = useQuery({ queryKey: ["exam-categories"], queryFn: () => listExamCategories() });
  const { data: examCenters = [] } = useQuery({ queryKey: ["exam-centers"], queryFn: () => listExamCenters() });
  const { data: noExamReasons = [] } = useQuery({ queryKey: ["no-exam-reasons"], queryFn: () => listNoExamReasons() });
  const { data: noAdmitReasons = [] } = useQuery({ queryKey: ["no-admit-reasons"], queryFn: () => listNoAdmitReasons() });

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
  const examCategoryMap = new Map(examCategories.map(c => [c.id, c.name]));
  const examCenterMap = new Map(examCenters.map(c => [c.id, c.name]));
  const districtMap = new Map(allDistricts.map(d => [d.id, d.name]));
  const areaMap = new Map(allAreas.map(a => [a.id, a]));
  const clusterMap = new Map(allClusters.map(c => [c.id, c]));
  const filterClusters = allClusters.filter(c => filterDistrict === "" || areaMap.get(c.area_id)?.district_id === filterDistrict);
  const filtered = exams.filter(e => {
    const s = studentMap[e.student_id];
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


  const allColumns = useMemo((): Col<StudentExam>[] => [
    {
      key: "district", label: "District", sortable: true,
      sortValue: (exam) => {
        const s = studentMap[exam.student_id];
        const kutir = s?.kutir_id != null ? kutirMap2.get(s.kutir_id) : null;
        const cluster = kutir ? clusterMap.get(kutir.cluster_id) : null;
        const area = cluster ? areaMap.get(cluster.area_id) : null;
        return area ? (districtMap.get(area.district_id) ?? "") : "";
      },
      render: (exam) => {
        const s = studentMap[exam.student_id];
        const kutir = s?.kutir_id != null ? kutirMap2.get(s.kutir_id) : null;
        const cluster = kutir ? clusterMap.get(kutir.cluster_id) : null;
        const area = cluster ? areaMap.get(cluster.area_id) : null;
        return area ? (districtMap.get(area.district_id) ?? "—") : "—";
      },
      csvValue: (exam) => {
        const s = studentMap[exam.student_id];
        const kutir = s?.kutir_id != null ? kutirMap2.get(s.kutir_id) : null;
        const cluster = kutir ? clusterMap.get(kutir.cluster_id) : null;
        const area = cluster ? areaMap.get(cluster.area_id) : null;
        return area ? (districtMap.get(area.district_id) ?? "") : "";
      },
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" },
    },
    {
      key: "kutir", label: "Kutir", sortable: true,
      sortValue: (exam) => {
        const s = studentMap[exam.student_id];
        return s?.kutir_id != null ? (kutirMap2.get(s.kutir_id)?.name ?? "") : "";
      },
      render: (exam) => {
        const s = studentMap[exam.student_id];
        return s?.kutir_id != null ? (kutirMap2.get(s.kutir_id)?.name ?? "—") : "—";
      },
      csvValue: (exam) => {
        const s = studentMap[exam.student_id];
        return s?.kutir_id != null ? (kutirMap2.get(s.kutir_id)?.name ?? "") : "";
      },
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" },
    },
    {
      key: "student", label: "Student", sortable: true,
      sortValue: (exam) => {
        const s = studentMap[exam.student_id];
        return s ? `${s.first_name} ${s.last_name}`.toLowerCase() : "";
      },
      render: (exam) => {
        const s = studentMap[exam.student_id];
        return s ? (
          <Link to={`/students/${s.id}`} style={{ color: "var(--text-primary)", textDecoration: "none", fontWeight: 500, fontSize: 13 }}>
            {s.first_name} {s.last_name}
          </Link>
        ) : `#${exam.student_id}`;
      },
      csvValue: (exam) => {
        const s = studentMap[exam.student_id];
        return s ? `${s.first_name} ${s.last_name}` : String(exam.student_id);
      },
      tdStyle: { whiteSpace: "nowrap" },
    },
    {
      key: "gender", label: "Gender", sortable: true,
      sortValue: (exam) => studentMap[exam.student_id]?.gender ?? "",
      render: (exam) => studentMap[exam.student_id]?.gender ?? "—",
      csvValue: (exam) => studentMap[exam.student_id]?.gender ?? "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)" },
    },
    {
      key: "school", label: "School", sortable: true,
      sortValue: (exam) => {
        const sc = exam.school_id != null ? schoolMap[exam.school_id] : null;
        return sc?.name ?? exam.school_type ?? "";
      },
      render: (exam) => {
        const sc = exam.school_id != null ? schoolMap[exam.school_id] : null;
        if (sc) return (
          <span>
            {sc.name}
            <span style={{ marginLeft: 5, fontSize: 10, background: "var(--bg-badge)", padding: "1px 5px", borderRadius: 8, color: "var(--text-secondary)" }}>{sc.school_type}</span>
          </span>
        );
        return exam.school_type ?? "—";
      },
      csvValue: (exam) => {
        const sc = exam.school_id != null ? schoolMap[exam.school_id] : null;
        return sc?.name ?? exam.school_type ?? "";
      },
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" },
    },
    {
      key: "stage", label: "Stage", sortable: true,
      sortValue: (exam) => pipelineStage(exam),
      render: (exam) => <StageBadge exam={exam} />,
      csvValue: (exam) => {
        const idx = pipelineStage(exam);
        return idx >= 0 ? STAGES[idx].label : "Registered";
      },
    },
    {
      key: "exam_category_id", label: "Exam Cat.", sortable: true,
      sortValue: (exam) => exam.exam_category_id ? (examCategoryMap.get(exam.exam_category_id) ?? "") : "",
      render: (exam) => exam.exam_category_id ? (examCategoryMap.get(exam.exam_category_id) ?? "—") : "—",
      csvValue: (exam) => exam.exam_category_id ? (examCategoryMap.get(exam.exam_category_id) ?? "") : "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" },
    },
    {
      key: "exam_center_id", label: "Center", sortable: true,
      sortValue: (exam) => exam.exam_center_id ? (examCenterMap.get(exam.exam_center_id) ?? "") : "",
      render: (exam) => exam.exam_center_id ? (examCenterMap.get(exam.exam_center_id) ?? "—") : "—",
      csvValue: (exam) => exam.exam_center_id ? (examCenterMap.get(exam.exam_center_id) ?? "") : "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" },
    },
    {
      key: "application_number", label: "App #", sortable: true,
      render: (exam) => exam.application_number ?? "—",
      csvValue: (exam) => exam.application_number ?? "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" },
    },
    {
      key: "roll_number", label: "Roll #", sortable: true,
      render: (exam) => exam.roll_number ?? "—",
      csvValue: (exam) => exam.roll_number ?? "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" },
    },
    {
      key: "scores", label: "Scores", sortable: true,
      sortValue: (exam) => exam.scores.reduce<number>((sum, s) => sum + (s.score != null ? Number(s.score) : 0), 0),
      render: (exam) => {
        const total = exam.scores.reduce<number>((sum, s) => sum + (s.score != null ? Number(s.score) : 0), 0);
        const hasScore = exam.scores.length > 0 && exam.scores.some(s => s.score != null);
        return hasScore ? (
          <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {exam.scores.filter(s => s.score != null).map(s => `${s.subject?.name ?? "S" + s.subject_id}:${s.score}`).join(" ")}
            {" "}<strong style={{ color: "var(--text-primary)" }}>={total}</strong>
          </span>
        ) : "—";
      },
      csvValue: (exam) => {
        const total = exam.scores.reduce<number>((sum, s) => sum + (s.score != null ? Number(s.score) : 0), 0);
        return exam.scores.some(s => s.score != null) ? String(total) : "";
      },
      tdStyle: { fontSize: 12, color: "var(--text-secondary)" },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [studentMap, schoolMap, kutirMap2, clusterMap, areaMap, districtMap, examCategoryMap, examCenterMap]);

  const { isVisible, orderedMetas } = useFieldConfig("admissions", ADMISSIONS_FIELDS);
  const columns = useMemo(() => {
    const colByKey = new Map(allColumns.map(c => [c.key, c]));
    return orderedMetas
      .filter(m => isVisible(m.key))
      .map(m => colByKey.get(m.key))
      .filter((c): c is NonNullable<typeof c> => c != null);
  }, [allColumns, orderedMetas, isVisible]);

  const filterSelectStyle: React.CSSProperties = {
    padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)",
    background: "var(--bg-input)", color: "var(--text-primary)", fontSize: 14, flexShrink: 0,
  };

  return (
    <div className="grs-page" style={{ padding: "24px 28px", maxWidth: 1200 }}>
      <GrsTable<StudentExam>
        title="Admissions"
        subtitle="School entrance exam pipeline tracking"
        columns={columns}
        data={filtered}
        rowKey={exam => exam.id}
        isLoading={isLoading}
        emptyMessage={`No admissions for ${year}.`}
        searchable
        searchPlaceholder="Search student..."
        searchFn={(exam, q) => {
          const s = studentMap[exam.student_id];
          return s ? `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) : false;
        }}
        filters={<>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{ ...filterSelectStyle, width: 90 }}
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={filterDistrict}
            onChange={e => { setFilterDistrict(e.target.value === "" ? "" : Number(e.target.value)); setFilterCluster(""); }}
            style={{ ...filterSelectStyle, width: 140 }}
          >
            <option value="">All Districts</option>
            {allDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select
            value={filterCluster}
            onChange={e => setFilterCluster(e.target.value === "" ? "" : Number(e.target.value))}
            disabled={filterDistrict === ""}
            style={{ ...filterSelectStyle, width: 140 }}
          >
            <option value="">All Clusters</option>
            {filterClusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </>}
        headerExtra={isAdmin ? (
          <a href="/admin/field-config?table=admissions" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8125rem", color: "var(--text-secondary)", textDecoration: "none", padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <span>Columns</span>
          </a>
        ) : undefined}
        exportFilename="admissions"
        printTitle="Admissions"
        onAdd={() => setShowAdd(true)}
        addLabel="+ Add Admission"
        actions={(exam) => ({
          onView: () => setViewExam(exam),
          onEdit: () => setEditExam(exam),
          onDelete: () => { if (confirm("Delete this admission?")) deleteMut.mutate(exam.id); },
        })}
      />

      {/* Modals */}
      {showAdd && (
        <AdmissionModal
          mode="add"
          students={students}
          schools={schools}
          districts={allDistricts}
          year={year}
          examCategories={examCategories}
          examCenters={examCenters}
          noExamReasons={noExamReasons}
          noAdmitReasons={noAdmitReasons}
          onClose={() => setShowAdd(false)}
          onSave={data => addMut.mutate(data as StudentExamCreate)}
          saveError={addMut.error ? ((addMut.error as any)?.response?.data?.detail ?? "Save failed.") : null}
          saving={addMut.isPending}
        />
      )}

      {viewExam && (
        <AdmissionModal
          mode="view"
          exam={viewExam}
          student={studentMap[viewExam.student_id]}
          students={students}
          schools={schools}
          districts={allDistricts}
          examCategories={examCategories}
          examCenters={examCenters}
          noExamReasons={noExamReasons}
          noAdmitReasons={noAdmitReasons}
          onClose={() => setViewExam(null)}
          onEdit={() => { setEditExam(viewExam); setViewExam(null); }}
        />
      )}

      {editExam && (
        <AdmissionModal
          mode="edit"
          exam={editExam}
          student={studentMap[editExam.student_id]}
          students={students}
          schools={schools}
          districts={allDistricts}
          examCategories={examCategories}
          examCenters={examCenters}
          noExamReasons={noExamReasons}
          noAdmitReasons={noAdmitReasons}
          allExams={exams}
          onClose={() => setEditExam(null)}
          onSave={data => updateMut.mutate({ id: editExam.id, data: data as Partial<StudentExamCreate> })}
          saveError={updateMut.error ? ((updateMut.error as any)?.response?.data?.detail ?? "Save failed.") : null}
        />
      )}
    </div>
  );
}
