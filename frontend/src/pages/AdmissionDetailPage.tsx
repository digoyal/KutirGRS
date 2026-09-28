import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getExam, updateExam, listExams, listExamTypes, listExamTypeSubjects } from "../api/admissions";
import type { StudentExam, StudentExamCreate, ExamTypeMin, ExamTypeSubjectRow } from "../api/admissions";
import { getStudent } from "../api/students";
import { listSchools } from "../api/schools";
import { listDistricts, listExamCenters, listExamCategories, listNoExamReasons, listNoAdmitReasons } from "../api/geo";
import { grs } from "../styles/grs";
import { STAGES, type StageKey, StageBadge, PipelineStepper, subjectsForExamType } from "../components/admissions-pipeline";

const NAVY_BG     = "#1e3a5f";
const NAVY_TEXT   = "#ffffff";
const NAVY_ACCENT = "#93c5fd";

const selStyles: React.CSSProperties = {
  width: "100%", padding: "7px 10px", borderRadius: 6,
  border: "1px solid var(--border)", background: "var(--bg-input)",
  color: "var(--text-primary)", boxSizing: "border-box",
};
const inputStyles: React.CSSProperties = {
  width: "100%", padding: "7px 10px", borderRadius: 6,
  border: "1px solid var(--border)", background: "var(--bg-input)",
  color: "var(--text-primary)", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties  = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)" };
const valueStyle: React.CSSProperties  = { fontSize: 14, color: "var(--text-primary)", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", boxSizing: "border-box", display: "block", width: "100%" };
const fieldStyle: React.CSSProperties  = { display: "flex", flexDirection: "column", gap: 2 };
const sec: React.CSSProperties = {
  background: "var(--bg-card)", borderRadius: 8, padding: "10px 14px", marginBottom: 8,
};
const secTitle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
  color: "var(--badge-blue-fg, #2563eb)", marginBottom: 8,
};

export default function AdmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const enteredViaEdit = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState(enteredViaEdit);
  const [form, setForm] = useState<Partial<StudentExamCreate>>({});
  const [schoolType, setSchoolType] = useState("");
  const [schoolDistrictFilter, setSchoolDistrictFilter] = useState<number | "">("");
  const [examDistrictFilter, setExamDistrictFilter]     = useState<number | "">("");
  const [scoreInputs, setScoreInputs] = useState<Record<number, string>>({});
  const [admitBlockMsg, setAdmitBlockMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");

  // Load exam
  const { data: exam, isLoading } = useQuery({
    queryKey: ["admission", id],
    queryFn: () => getExam(Number(id)),
    enabled: !!id && !isNaN(Number(id)),
    onSuccess: (e: StudentExam) => {
      setForm({ ...e });
      setSchoolType(e.school_type ?? "");
      setScoreInputs(Object.fromEntries((e.scores ?? []).map(s => [s.subject_id, s.score != null ? String(s.score) : ""])));
    },
  } as any);

  // Load student name
  const { data: student } = useQuery({
    queryKey: ["student", exam?.student_id],
    queryFn: () => getStudent(exam!.student_id),
    enabled: !!exam?.student_id,
  });

  // Load all exams for this student (for admit-block check in edit mode)
  const { data: studentAllExams = [] } = useQuery({
    queryKey: ["student-exams-for-student", exam?.student_id],
    queryFn: () => listExams({ student_id: exam!.student_id }),
    enabled: !!exam?.student_id && editing,
  });

  // Reference data
  const { data: examTypes      = [] } = useQuery<ExamTypeMin[]>({ queryKey: ["exam-types"],         queryFn: listExamTypes,         staleTime: 5 * 60 * 1000 });
  const { data: examTypeSubjects=[] } = useQuery<ExamTypeSubjectRow[]>({ queryKey: ["exam-type-subjects"], queryFn: listExamTypeSubjects, staleTime: 5 * 60 * 1000 });
  const { data: schools        = [] } = useQuery({ queryKey: ["schools"],          queryFn: () => listSchools() });
  const { data: districts      = [] } = useQuery({ queryKey: ["all-districts"],    queryFn: () => listDistricts() });
  const { data: examCategories = [] } = useQuery({ queryKey: ["exam-categories"],  queryFn: () => listExamCategories() });
  const { data: examCenters    = [] } = useQuery({ queryKey: ["exam-centers"],     queryFn: () => listExamCenters() });
  const { data: noExamReasons  = [] } = useQuery({ queryKey: ["no-exam-reasons"],  queryFn: () => listNoExamReasons() });
  const { data: noAdmitReasons = [] } = useQuery({ queryKey: ["no-admit-reasons"], queryFn: () => listNoAdmitReasons() });

  const updateMut = useMutation({
    mutationFn: (data: Partial<StudentExamCreate>) => updateExam(Number(id), data),
    onSuccess: (updated: StudentExam) => {
      qc.setQueryData(["admission", id], updated);
      qc.invalidateQueries({ queryKey: ["student-exams"] });
      if (enteredViaEdit) { navigate(-1); } else { setEditing(false); setSaveError(""); }
    },
    onError: (e: any) => setSaveError(e?.response?.data?.detail ?? "Save failed"),
  });

  if (isLoading) return <p style={{ color: "var(--text-secondary)", padding: 24 }}>Loading…</p>;
  if (!exam)     return <p style={{ color: "var(--danger)", padding: 24 }}>Admission not found.</p>;

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })); }
  function setScore(subjectId: number, val: string) { setScoreInputs(prev => ({ ...prev, [subjectId]: val })); }
  function toggleStage(updates: Partial<Record<StageKey, boolean>>) {
    if (updates.admitted === true) {
      const alreadyAdmitted = studentAllExams.find(
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

  // Derived display values
  const schoolTypes       = (Array.from(new Set(schools.map(sc => sc.school_type).filter(Boolean))) as string[]).sort();
  const subjects          = subjectsForExamType(examTypeSubjects, form.exam_type_id);
  const viewExamCategory  = examCategories.find(c => c.id === exam.exam_category_id);
  const viewExamCenter    = examCenters.find(c => c.id === exam.exam_center_id);
  const noExamReason      = noExamReasons.find(r => r.id === exam.no_exam_reason_id);
  const noAdmitReason     = noAdmitReasons.find(r => r.id === exam.no_admit_reason_id);
  const admittedSchool    = schools.find(s => s.id === exam.admitted_school_id);
  const schoolTypeFiltered = schoolType ? schools.filter(s => s.school_type === schoolType) : schools;
  const filteredGrsSchools = schoolDistrictFilter === ""
    ? schoolTypeFiltered
    : schoolTypeFiltered.filter(s => (s as any).district_id === schoolDistrictFilter);
  const filteredExamCenters = examDistrictFilter === ""
    ? examCenters
    : examCenters.filter(c => c.district_id === examDistrictFilter);
  const totalScore = (exam.scores ?? []).reduce<number>((sum, s) => sum + (s.score != null ? Number(s.score) : 0), 0);
  const hasScore   = (exam.scores ?? []).length > 0 && (exam.scores ?? []).some(s => s.score != null);
  const studentName = student ? `${student.first_name} ${student.last_name}` : `Student #${exam.student_id}`;
  const canSave = !form.selected || !!form.admitted_school_id;

  // Edit form exam shape for PipelineStepper (uses form state so checkboxes are reactive)
  const editExamShape = { ...exam, ...form } as StudentExam;

  function handleSave() {
    setSaveError("");
    updateMut.mutate({
      eligible:           form.eligible,
      form_received:      form.form_received,
      applied:            form.applied,
      admit_card:         (form as any).admit_card,
      appeared:           form.appeared,
      selected:           form.selected,
      admitted:           form.admitted,
      application_number: form.application_number,
      roll_number:        form.roll_number,
      scores: Object.entries(scoreInputs)
        .filter(([, v]) => v !== "")
        .map(([id, v]) => ({ subject_id: Number(id), score: parseFloat(v) })),
      exam_type_id:       form.exam_type_id ?? null,
      exam_category_id:   form.exam_category_id,
      exam_center_id:     form.exam_center_id,
      no_exam_reason_id:  form.appeared ? null : form.no_exam_reason_id,
      no_admit_reason_id: (form.selected && !form.admitted) ? form.no_admit_reason_id : null,
      admitted_school_id: form.admitted ? form.admitted_school_id : null,
      admission_class:    form.admission_class ?? null,
      school_type:        schoolType || null,
    });
  }

  // ── VIEW MODE ──────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div style={{ maxWidth: 640, padding: "0 0 24px" }}>

        {/* Navy header */}
        <div style={{ background: NAVY_BG, borderRadius: "0 0 8px 8px", padding: "14px 20px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => navigate("/admissions")}
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: NAVY_ACCENT, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: "0.85rem" }}
              >← Back</button>
              <div>
                <div style={{ color: NAVY_TEXT, fontWeight: 700, fontSize: "1.1rem" }}>{studentName}</div>
                <div style={{ color: NAVY_ACCENT, fontSize: "0.78rem", marginTop: 2 }}>
                  {examTypes.find(e => e.id === exam.exam_type_id)?.name ?? "—"} · {exam.school_start_year}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: NAVY_ACCENT, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: "0.85rem" }}
                onClick={() => setEditing(true)}
              >Edit</button>
            </div>
          </div>
        </div>

        <div style={{ padding: "0 20px" }}>

          {/* Stage badge */}
          <div style={{ background: "var(--bg-card)", borderRadius: 8, padding: "10px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>STAGE</span>
            <StageBadge exam={exam} />
            {exam.eligible === false && (
              <span style={{ fontSize: 11, color: "#e53e3e", fontWeight: 600, marginLeft: 4 }}>Not eligible</span>
            )}
          </div>

          {/* Student + Class */}
          <section style={sec}>
            <div style={secTitle}>Student</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
              <div style={fieldStyle}>
                <span style={labelStyle}>Student</span>
                <span style={valueStyle}>{studentName}</span>
              </div>
              <div style={fieldStyle}>
                <span style={labelStyle}>Class</span>
                <span style={valueStyle}>{exam.admission_class != null ? `Class ${exam.admission_class}` : "—"}</span>
              </div>
            </div>
          </section>

          {/* Year + Exam Type + Exam Category */}
          <section style={sec}>
            <div style={secTitle}>Exam Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "90px 130px 1fr", gap: 12 }}>
              <div style={fieldStyle}><span style={labelStyle}>Year</span><span style={valueStyle}>{exam.school_start_year}</span></div>
              <div style={fieldStyle}><span style={labelStyle}>Exam Type</span><span style={valueStyle}>{examTypes.find(e => e.id === exam.exam_type_id)?.name ?? "—"}</span></div>
              <div style={fieldStyle}><span style={labelStyle}>Exam Category</span><span style={valueStyle}>{viewExamCategory?.name ?? "—"}</span></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div style={fieldStyle}><span style={labelStyle}>Exam Center</span><span style={valueStyle}>{viewExamCenter?.name ?? "—"}</span></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div style={fieldStyle}><span style={labelStyle}>Application #</span><span style={valueStyle}>{exam.application_number ?? "—"}</span></div>
              <div style={fieldStyle}><span style={labelStyle}>Roll #</span><span style={valueStyle}>{exam.roll_number ?? "—"}</span></div>
            </div>
          </section>

          {/* Scores */}
          {hasScore && (
            <section style={sec}>
              <div style={secTitle}>Scores</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
                {(exam.scores ?? []).filter(s => s.score != null).map(s => (
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
            </section>
          )}

          {/* Reason Not Appeared */}
          {noExamReason && (
            <section style={sec}>
              <div style={secTitle}>Reason Not Appeared</div>
              <span style={valueStyle}>{noExamReason.reason}</span>
            </section>
          )}

          {/* GRS School (only when selected) */}
          {exam.selected && (
            <section style={sec}>
              <div style={secTitle}>GRS School</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 2fr", gap: 8 }}>
                <div style={fieldStyle}>
                  <span style={labelStyle}>District</span>
                  <span style={valueStyle}>
                    {admittedSchool && (admittedSchool as any).district_id
                      ? (districts.find(d => d.id === (admittedSchool as any).district_id)?.name ?? "—")
                      : "—"}
                  </span>
                </div>
                <div style={fieldStyle}><span style={labelStyle}>School Type</span><span style={valueStyle}>{exam.school_type ?? "—"}</span></div>
                <div style={fieldStyle}>
                  <span style={labelStyle}>GRS School</span>
                  <span style={valueStyle}>{admittedSchool ? `${admittedSchool.name} (${admittedSchool.school_type})` : "—"}</span>
                </div>
              </div>
            </section>
          )}

          {/* Reason Not Admitted */}
          {exam.selected && !exam.admitted && (
            <section style={sec}>
              <div style={secTitle}>Reason Not Admitted</div>
              <span style={valueStyle}>{noAdmitReason ? noAdmitReason.reason : "—"}</span>
            </section>
          )}

          {/* Timestamps */}
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8, padding: "0 4px" }}>
            Added: {new Date(exam.created_at).toLocaleString("en-IN")} &nbsp;·&nbsp;
            Updated: {new Date(exam.updated_at).toLocaleString("en-IN")}
          </p>

        </div>
      </div>
    );
  }

  // ── EDIT MODE ──────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 640, padding: "16px 20px" }}>

      {/* Plain edit header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => { if (enteredViaEdit) navigate(-1); else { setEditing(false); setSaveError(""); setForm({ ...exam }); setSchoolType(exam.school_type ?? ""); setScoreInputs(Object.fromEntries((exam.scores ?? []).map(s => [s.subject_id, s.score != null ? String(s.score) : ""]))); } }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "1.1rem", padding: 0 }}
        >←</button>
        <h2 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>Edit Admission</h2>
      </div>

      {/* Student (read-only) + Class */}
      <section style={sec}>
        <div style={secTitle}>Student</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8 }}>
          <div>
            <label style={grs.fieldLabel}>Student</label>
            <input readOnly value={studentName} style={{ ...inputStyles, opacity: 0.6, cursor: "not-allowed" }} />
          </div>
          <div>
            <label style={grs.fieldLabel}>Class</label>
            <select value={form.admission_class ?? ""} onChange={e => set("admission_class", e.target.value === "" ? null : Number(e.target.value))} style={selStyles}>
              <option value="">-- select --</option>
              <option value={5}>Class 5</option>
              <option value={8}>Class 8</option>
            </select>
          </div>
        </div>
      </section>

      {/* Pipeline Stage */}
      <section style={sec}>
        <div style={secTitle}>Pipeline Stage</div>
        <PipelineStepper exam={editExamShape} onChange={toggleStage} />
      </section>

      {/* Exam Details */}
      <section style={sec}>
        <div style={secTitle}>Exam Details</div>

        <div style={{ display: "grid", gridTemplateColumns: "90px 130px 1fr", gap: 12, alignItems: "end" }}>
          <div>
            <label style={grs.fieldLabel}>Year</label>
            <input readOnly value={exam.school_start_year} style={{ ...inputStyles, opacity: 0.6, cursor: "not-allowed" }} />
          </div>
          <div>
            <label style={grs.fieldLabel}>Exam Type</label>
            <select value={form.exam_type_id ?? ""} onChange={e => set("exam_type_id", e.target.value === "" ? null : Number(e.target.value))} style={selStyles}>
              <option value="">-- select --</option>
              {examTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label style={grs.fieldLabel}>Exam Category</label>
            <select
              value={form.exam_category_id ?? ""}
              onChange={e => set("exam_category_id", e.target.value === "" ? null : Number(e.target.value))}
              style={selStyles}
            >
              <option value="">-- select --</option>
              {examCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "end", marginTop: 12 }}>
          <div>
            <label style={grs.fieldLabel}>District</label>
            <select value={examDistrictFilter} onChange={e => { setExamDistrictFilter(e.target.value === "" ? "" : Number(e.target.value)); set("exam_center_id", null); }} style={selStyles}>
              <option value="">-- all --</option>
              {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label style={grs.fieldLabel}>Exam Center</label>
            <select
              value={form.exam_center_id ?? ""}
              onChange={e => set("exam_center_id", e.target.value === "" ? null : Number(e.target.value))}
              style={{ ...selStyles, opacity: (form as any).admit_card ? 1 : 0.45, cursor: (form as any).admit_card ? "auto" : "not-allowed" }}
              disabled={!(form as any).admit_card}
            >
              <option value="">-- select --</option>
              {filteredExamCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "end", marginTop: 12 }}>
          {form.applied ? (
            <div>
              <label style={grs.fieldLabel}>Application #</label>
              <input value={form.application_number ?? ""} onChange={e => set("application_number", e.target.value || null)} style={inputStyles} />
            </div>
          ) : <div />}
          <div>
            <label style={grs.fieldLabel}>Roll #</label>
            <input
              value={form.roll_number ?? ""}
              onChange={e => set("roll_number", e.target.value || null)}
              style={{ ...inputStyles, opacity: (form as any).admit_card ? 1 : 0.45, cursor: (form as any).admit_card ? "auto" : "not-allowed" }}
              readOnly={!(form as any).admit_card}
            />
          </div>
        </div>
      </section>

      {/* Scores */}
      {form.appeared && subjects.length > 0 && (
        <section style={sec}>
          <div style={secTitle}>Scores</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {subjects.map(subj => (
              <div key={subj.id}>
                <label style={grs.fieldLabel}>{subj.name}</label>
                <input
                  type="number" min={0} max={100} step={0.01}
                  value={scoreInputs[subj.id] ?? ""}
                  onChange={e => setScore(subj.id, e.target.value)}
                  style={inputStyles}
                  placeholder="—"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reason Not Appeared */}
      {!form.appeared && (
        <section style={sec}>
          <div style={secTitle}>Reason Not Appeared for Exam</div>
          <select value={form.no_exam_reason_id ?? ""} onChange={e => set("no_exam_reason_id", e.target.value === "" ? null : Number(e.target.value))} style={selStyles}>
            <option value="">-- select --</option>
            {noExamReasons.map(r => <option key={r.id} value={r.id}>{r.reason}</option>)}
          </select>
        </section>
      )}

      {/* GRS School (only when selected) */}
      {form.selected && (
        <section style={sec}>
          <div style={secTitle}>GRS School</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 2fr", gap: 8, alignItems: "end" }}>
            <div>
              <label style={grs.fieldLabel}>District</label>
              <select
                value={schoolDistrictFilter}
                onChange={e => { setSchoolDistrictFilter(e.target.value === "" ? "" : Number(e.target.value)); set("admitted_school_id", null); }}
                style={selStyles}
              >
                <option value="">-- all --</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label style={grs.fieldLabel}>School Type <span style={{ color: "var(--danger)" }}>*</span></label>
              <select value={schoolType} onChange={e => setSchoolType(e.target.value)} style={selStyles}>
                <option value="">-- all --</option>
                {schoolTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={grs.fieldLabel}>GRS School <span style={{ color: "var(--danger)" }}>*</span></label>
              <select
                value={form.admitted_school_id ?? ""}
                onChange={e => set("admitted_school_id", e.target.value === "" ? null : Number(e.target.value))}
                style={selStyles}
              >
                <option value="">-- select --</option>
                {filteredGrsSchools.map(sc => <option key={sc.id} value={sc.id}>{sc.name} ({sc.school_type})</option>)}
              </select>
            </div>
          </div>
        </section>
      )}

      {/* Reason Not Admitted */}
      {form.selected && !form.admitted && (
        <section style={sec}>
          <div style={secTitle}>Reason Not Admitted</div>
          <select value={form.no_admit_reason_id ?? ""} onChange={e => set("no_admit_reason_id", e.target.value === "" ? null : Number(e.target.value))} style={selStyles}>
            <option value="">-- select --</option>
            {noAdmitReasons.map(r => <option key={r.id} value={r.id}>{r.reason}</option>)}
          </select>
        </section>
      )}

      {/* Error messages */}
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

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
        <button
          style={grs.btnSecondary}
          onClick={() => {
            if (enteredViaEdit) navigate(-1);
            else {
              setEditing(false);
              setSaveError("");
              setForm({ ...exam });
              setSchoolType(exam.school_type ?? "");
              setScoreInputs(Object.fromEntries((exam.scores ?? []).map(s => [s.subject_id, s.score != null ? String(s.score) : ""])));
              setAdmitBlockMsg(null);
            }
          }}
        >Cancel</button>
        <button
          style={{ ...grs.btnPrimary, opacity: (!canSave || updateMut.isPending) ? 0.5 : 1 }}
          disabled={!canSave || updateMut.isPending}
          onClick={handleSave}
        >
          {updateMut.isPending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
