import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listExams, createExam, updateExam, deleteExam } from "../api/admissions";
import type { StudentExam, StudentExamCreate } from "../api/admissions";
import { listStudents } from "../api/students";
import type { Student } from "../api/students";
import { listSchools } from "../api/schools";
import { useAuth } from "../context/AuthContext";
import { listKutirs } from "../api/kutirs";
import { grs } from "../styles/grs";
import { RowActions } from "../components/RowActions";
import { listDistricts, listAreas, listClusters, listExamCenters, listExamCategories, listNoExamReasons, listNoAdmitReasons } from "../api/geo";
import type { ExamCenter, ExamCategory, NoExamReason, NoAdmitReason } from "../api/geo";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 2 + i);

// Pipeline stages in order
const STAGES = [
  { key: "form_received", label: "Form" },
  { key: "applied",       label: "Applied" },
  { key: "appeared",      label: "Appeared" },
  { key: "selected",      label: "Selected" },
  { key: "admitted",      label: "Admitted" },
] as const;

type StageKey = typeof STAGES[number]["key"];

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

// ── Modal for adding a new admission ──────────────────────────────────────
function AddModal({
  students, schools, year, examCategories, examCenters, noExamReasons, noAdmitReasons,
  onClose, onSave, saveError, saving
}: {
  students: Student[];
  schools: { id: number; name: string; school_type: string }[];
  year: number;
  examCategories: ExamCategory[];
  examCenters: ExamCenter[];
  noExamReasons: NoExamReason[];
  noAdmitReasons: NoAdmitReason[];
  onClose: () => void;
  onSave: (data: StudentExamCreate) => void;
  saveError?: string | null;
  saving?: boolean;
}) {
  const [studentId, setStudentId] = useState<number | "">("");
  const [schoolId, setSchoolId] = useState<number | "">("");
  const [sy, setSy] = useState<number>(year);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Partial<StudentExamCreate>>({
    eligible: true,
    form_received: false,
    applied: false,
    appeared: false,
    selected: false,
    admitted: false,
  });

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })); }

  function toggleStage(updates: Partial<Record<StageKey, boolean>>) {
    setForm(f => ({ ...f, ...updates }));
  }

  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const selStyles = { width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box" as const };
  const inputStyles = { width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box" as const };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16
    }}>
      <div style={{
        background: "var(--bg-card)", borderRadius: 12, padding: 28,
        width: 560, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 18, color: "var(--text-primary)" }}>
          Add Admission
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Student */}
          <div>
            <label style={grs.fieldLabel}>Student <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              placeholder="Search student..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyles, marginBottom: 6 }}
            />
            <select value={studentId} onChange={e => setStudentId(Number(e.target.value))} style={selStyles}>
              <option value="">-- select student --</option>
              {filteredStudents.map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
              ))}
            </select>
          </div>

          {/* School + Year */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
            <div>
              <label style={grs.fieldLabel}>School <span style={{ color: "var(--danger)" }}>*</span></label>
              <select value={schoolId} onChange={e => setSchoolId(Number(e.target.value))} style={selStyles}>
                <option value="">-- select school --</option>
                {schools.map(sc => (
                  <option key={sc.id} value={sc.id}>{sc.name} ({sc.school_type})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={grs.fieldLabel}>Year</label>
              <select value={sy} onChange={e => setSy(Number(e.target.value))} style={{ ...selStyles, minWidth: 90 }}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Pipeline stage */}
          <div>
            <label style={{ ...grs.fieldLabel, fontWeight: 700, marginBottom: 8 }}>Pipeline Stage</label>
            <PipelineStepper
              exam={{ ...form, id: 0, student_id: 0, school_id: 0, school_start_year: sy, eligible: form.eligible ?? true, form_received: form.form_received ?? false, applied: form.applied ?? false, appeared: form.appeared ?? false, selected: form.selected ?? false, admitted: form.admitted ?? false, admitted_school_id: null, no_admit_reason_id: null, exam_category_id: null, application_number: null, exam_center_id: null, roll_number: null, no_exam_reason_id: null, math: null, english: null, reasoning: null, evs: null, scores: [], created_at: "", updated_at: "" } as StudentExam}
              onChange={toggleStage}
            />
          </div>

          {/* Eligible */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-primary)", cursor: "pointer" }}>
            <input type="checkbox" checked={form.eligible ?? true} onChange={e => set("eligible", e.target.checked)} style={{ accentColor: "var(--link-color)" }} />
            Eligible for exam
          </label>

          {/* Exam Category & Center */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={grs.fieldLabel}>Exam Category</label>
              <select value={form.exam_category_id ?? ""} onChange={e => set("exam_category_id", e.target.value === "" ? null : Number(e.target.value))} style={selStyles}>
                <option value="">-- select --</option>
                {examCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={grs.fieldLabel}>Exam Center</label>
              <select value={form.exam_center_id ?? ""} onChange={e => set("exam_center_id", e.target.value === "" ? null : Number(e.target.value))} style={selStyles}>
                <option value="">-- select --</option>
                {examCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Application # & Roll # */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={grs.fieldLabel}>Application #</label>
              <input value={form.application_number ?? ""} onChange={e => set("application_number", e.target.value || null)} style={inputStyles} />
            </div>
            <div>
              <label style={grs.fieldLabel}>Roll #</label>
              <input value={form.roll_number ?? ""} onChange={e => set("roll_number", e.target.value || null)} style={inputStyles} />
            </div>
          </div>

          {/* Scores */}
          <div>
            <label style={{ ...grs.fieldLabel, fontWeight: 700, marginBottom: 8 }}>Scores</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {(["math", "english", "reasoning", "evs"] as const).map(subj => (
                <div key={subj}>
                  <label style={{ ...grs.fieldLabel, textTransform: "capitalize" }}>{subj}</label>
                  <input
                    type="number" min={0} max={100} step={0.01}
                    value={form[subj] ?? ""}
                    onChange={e => set(subj, e.target.value === "" ? null : parseFloat(e.target.value))}
                    style={inputStyles} placeholder="—"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Reason Not Appeared — conditional */}
          {!form.appeared && (
            <div>
              <label style={grs.fieldLabel}>Reason Not Appeared</label>
              <select value={form.no_exam_reason_id ?? ""} onChange={e => set("no_exam_reason_id", e.target.value === "" ? null : Number(e.target.value))} style={selStyles}>
                <option value="">-- select --</option>
                {noExamReasons.map(r => <option key={r.id} value={r.id}>{r.reason}</option>)}
              </select>
            </div>
          )}

          {/* Reason Not Admitted — conditional */}
          {form.selected && !form.admitted && (
            <div>
              <label style={grs.fieldLabel}>Reason Not Admitted</label>
              <select value={form.no_admit_reason_id ?? ""} onChange={e => set("no_admit_reason_id", e.target.value === "" ? null : Number(e.target.value))} style={selStyles}>
                <option value="">-- select --</option>
                {noAdmitReasons.map(r => <option key={r.id} value={r.id}>{r.reason}</option>)}
              </select>
            </div>
          )}

          {/* Admitted School — conditional */}
          {form.admitted && (
            <div>
              <label style={grs.fieldLabel}>Admitted School</label>
              <select value={form.admitted_school_id ?? ""} onChange={e => set("admitted_school_id", e.target.value === "" ? null : Number(e.target.value))} style={selStyles}>
                <option value="">-- select --</option>
                {schools.map(sc => <option key={sc.id} value={sc.id}>{sc.name} ({sc.school_type})</option>)}
              </select>
            </div>
          )}

        </div>

        {saveError && (
          <div style={{ marginTop: 16, padding: "8px 12px", background: "var(--danger-bg, #fef2f2)", border: "1px solid var(--danger-border, #fca5a5)", borderRadius: 6, color: "var(--danger, #dc2626)", fontSize: 13 }}>
            {saveError}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={grs.btnSecondary}>Cancel</button>
          <button
            disabled={!studentId || !schoolId || saving}
            onClick={() => onSave({
              student_id: Number(studentId),
              school_id: Number(schoolId),
              school_start_year: sy,
              eligible: form.eligible ?? true,
              form_received: form.form_received,
              applied: form.applied,
              appeared: form.appeared,
              selected: form.selected,
              admitted: form.admitted,
              exam_category_id: form.exam_category_id ?? null,
              exam_center_id: form.exam_center_id ?? null,
              application_number: form.application_number ?? null,
              roll_number: form.roll_number ?? null,
              math: form.math ?? null,
              english: form.english ?? null,
              reasoning: form.reasoning ?? null,
              evs: form.evs ?? null,
              no_exam_reason_id: form.appeared ? null : (form.no_exam_reason_id ?? null),
              no_admit_reason_id: (form.selected && !form.admitted) ? (form.no_admit_reason_id ?? null) : null,
              admitted_school_id: form.admitted ? (form.admitted_school_id ?? null) : null,
            })}
            style={{ ...grs.btnPrimary, opacity: (!studentId || !schoolId) ? 0.5 : 1 }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Inline edit modal ────────────────────────────────────────────────────────
function ViewModal({ exam, students, schools, examCategories, examCenters, noExamReasons, noAdmitReasons, onClose, onEdit }: {
  exam: StudentExam;
  students: Student[];
  schools: { id: number; name: string; school_type: string }[];
  examCategories: ExamCategory[];
  examCenters: ExamCenter[];
  noExamReasons: NoExamReason[];
  noAdmitReasons: NoAdmitReason[];
  onClose: () => void;
  onEdit: () => void;
}) {
  const student = students.find(s => s.id === exam.student_id);
  const school = schools.find(s => s.id === exam.school_id);
  const examCategory = examCategories.find(c => c.id === exam.exam_category_id);
  const examCenter = examCenters.find(c => c.id === exam.exam_center_id);
  const noExamReason = noExamReasons.find(r => r.id === exam.no_exam_reason_id);
  const noAdmitReason = noAdmitReasons.find(r => r.id === exam.no_admit_reason_id);
  const admittedSchool = schools.find(s => s.id === exam.admitted_school_id);

  const totalScore = [exam.math, exam.english, exam.reasoning, exam.evs]
    .reduce<number>((sum, v) => sum + (v != null ? Number(v) : 0), 0);
  const hasScore = [exam.math, exam.english, exam.reasoning, exam.evs].some(v => v != null);

  const fieldStyle: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: 2,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.06em", color: "var(--text-secondary)",
  };
  const valueStyle: React.CSSProperties = {
    fontSize: 14, color: "var(--text-primary)",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      padding: 16
    }}>
      <div style={{
        background: "var(--bg-card)", borderRadius: 12, padding: 28,
        width: 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: "var(--text-primary)" }}>
              {student ? `${student.first_name} ${student.last_name}` : `Student #${exam.student_id}`}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
              {school?.name ?? `School #${exam.school_id}`}
              {school && <span style={{ marginLeft: 6, fontSize: 11, background: "var(--bg-badge)", padding: "1px 5px", borderRadius: 8 }}>{school.school_type}</span>}
              {" · "}Year {exam.school_start_year}
            </p>
          </div>
          <button onClick={onClose} style={{ ...grs.btnIcon, fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        {/* Stage */}
        <div style={{ background: "var(--bg-input)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>STAGE</span>
          <StageBadge exam={exam} />
          {exam.eligible === false && (
            <span style={{ fontSize: 11, color: "#e53e3e", fontWeight: 600, marginLeft: 4 }}>Not eligible</span>
          )}
        </div>

        {/* Fields grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div style={fieldStyle}>
            <span style={labelStyle}>Application #</span>
            <span style={valueStyle}>{exam.application_number ?? "—"}</span>
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Roll #</span>
            <span style={valueStyle}>{exam.roll_number ?? "—"}</span>
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Exam Category</span>
            <span style={valueStyle}>{examCategory?.name ?? "—"}</span>
          </div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Exam Center</span>
            <span style={valueStyle}>{examCenter?.name ?? "—"}</span>
          </div>
        </div>

        {/* Scores */}
        {hasScore && (
          <div style={{ marginBottom: 20 }}>
            <span style={{ ...labelStyle, display: "block", marginBottom: 8 }}>Scores</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {(["math", "english", "reasoning", "evs"] as const).map(subj => (
                <div key={subj} style={{ background: "var(--bg-input)", borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", marginBottom: 2 }}>
                    {subj === "evs" ? "EVS" : subj.charAt(0).toUpperCase() + subj.slice(1)}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                    {exam[subj] ?? "—"}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, textAlign: "right", fontSize: 13, color: "var(--text-secondary)" }}>
              Total: <strong style={{ color: "var(--text-primary)", fontSize: 15 }}>{totalScore}</strong>
            </div>
          </div>
        )}

        {/* Conditional fields */}
        {noExamReason && (
          <div style={{ ...fieldStyle, marginBottom: 12 }}>
            <span style={labelStyle}>Reason Not Appeared</span>
            <span style={valueStyle}>{noExamReason.reason}</span>
          </div>
        )}
        {noAdmitReason && (
          <div style={{ ...fieldStyle, marginBottom: 12 }}>
            <span style={labelStyle}>Reason Not Admitted</span>
            <span style={valueStyle}>{noAdmitReason.reason}</span>
          </div>
        )}
        {admittedSchool && (
          <div style={{ ...fieldStyle, marginBottom: 12 }}>
            <span style={labelStyle}>Admitted School</span>
            <span style={valueStyle}>{admittedSchool.name} ({admittedSchool.school_type})</span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={grs.btnSecondary}>Close</button>
          <button onClick={onEdit} style={grs.btnPrimary}>Edit</button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ exam, onClose, onSave, examCategories, examCenters, noExamReasons, noAdmitReasons, schools }: {
  exam: StudentExam;
  onClose: () => void;
  onSave: (updates: Partial<StudentExamCreate>) => void;
  examCategories: ExamCategory[];
  examCenters: ExamCenter[];
  noExamReasons: NoExamReason[];
  noAdmitReasons: NoAdmitReason[];
  schools: { id: number; name: string; school_type: string }[];
}) {
  const [form, setForm] = useState({ ...exam });

  function toggleStage(updates: Partial<Record<StageKey, boolean>>) {
    setForm(f => ({ ...f, ...updates }));
  }

  function set(k: string, v: unknown) {
    setForm(f => ({ ...f, [k]: v }));
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      padding: 16
    }}>
      <div style={{
        background: "var(--bg-card)", borderRadius: 12, padding: 28,
        width: 560, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 18, color: "var(--text-primary)" }}>
          Edit Application
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-secondary)" }}>
          School start year: <strong>{exam.school_start_year}</strong>
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Pipeline stepper */}
          <div>
            <label style={{ ...grs.fieldLabel, fontWeight: 700, marginBottom: 8 }}>
              Pipeline Stage
            </label>
            <PipelineStepper exam={form as StudentExam} onChange={toggleStage} />
          </div>

          {/* Application info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={grs.fieldLabel}>Application #</label>
              <input
                value={form.application_number || ""}
                onChange={e => set("application_number", e.target.value || null)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={grs.fieldLabel}>Roll #</label>
              <input
                value={form.roll_number || ""}
                onChange={e => set("roll_number", e.target.value || null)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* Scores */}
          <div>
            <label style={{ ...grs.fieldLabel, fontWeight: 700, marginBottom: 8 }}>
              Scores
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {(["math", "english", "reasoning", "evs"] as const).map(subj => (
                <div key={subj}>
                  <label style={{ ...grs.fieldLabel, textTransform: "capitalize" }}>{subj}</label>
                  <input
                    type="number"
                    min={0} max={100} step={0.01}
                    value={form[subj] ?? ""}
                    onChange={e => set(subj, e.target.value === "" ? null : parseFloat(e.target.value))}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box" }}
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Eligible checkbox */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-primary)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.eligible}
              onChange={e => set("eligible", e.target.checked)}
              style={{ accentColor: "var(--link-color)" }}
            />
            Eligible for exam
          </label>

          {/* Exam Category & Center */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={grs.fieldLabel}>Exam Category</label>
              <select
                value={form.exam_category_id ?? ""}
                onChange={e => set("exam_category_id", e.target.value === "" ? null : Number(e.target.value))}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box" }}
              >
                <option value="">-- select --</option>
                {examCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={grs.fieldLabel}>Exam Center</label>
              <select
                value={form.exam_center_id ?? ""}
                onChange={e => set("exam_center_id", e.target.value === "" ? null : Number(e.target.value))}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box" }}
              >
                <option value="">-- select --</option>
                {examCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* No Exam Reason — shown when not appeared */}
          {!form.appeared && (
            <div>
              <label style={grs.fieldLabel}>Reason Not Appeared</label>
              <select
                value={form.no_exam_reason_id ?? ""}
                onChange={e => set("no_exam_reason_id", e.target.value === "" ? null : Number(e.target.value))}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box" }}
              >
                <option value="">-- select --</option>
                {noExamReasons.map(r => <option key={r.id} value={r.id}>{r.reason}</option>)}
              </select>
            </div>
          )}

          {/* No Admit Reason — shown when selected but not admitted */}
          {form.selected && !form.admitted && (
            <div>
              <label style={grs.fieldLabel}>Reason Not Admitted</label>
              <select
                value={form.no_admit_reason_id ?? ""}
                onChange={e => set("no_admit_reason_id", e.target.value === "" ? null : Number(e.target.value))}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box" }}
              >
                <option value="">-- select --</option>
                {noAdmitReasons.map(r => <option key={r.id} value={r.id}>{r.reason}</option>)}
              </select>
            </div>
          )}

          {/* Admitted School — shown when admitted */}
          {form.admitted && (
            <div>
              <label style={grs.fieldLabel}>Admitted School</label>
              <select
                value={form.admitted_school_id ?? ""}
                onChange={e => set("admitted_school_id", e.target.value === "" ? null : Number(e.target.value))}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box" }}
              >
                <option value="">-- select --</option>
                {schools.map(sc => <option key={sc.id} value={sc.id}>{sc.name} ({sc.school_type})</option>)}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={grs.btnSecondary}>Cancel</button>
          <button
            onClick={() => onSave({
              eligible: form.eligible,
              form_received: form.form_received,
              applied: form.applied,
              appeared: form.appeared,
              selected: form.selected,
              admitted: form.admitted,
              application_number: form.application_number,
              roll_number: form.roll_number,
              math: form.math,
              english: form.english,
              reasoning: form.reasoning,
              evs: form.evs,
              exam_category_id: form.exam_category_id,
              exam_center_id: form.exam_center_id,
              no_exam_reason_id: form.appeared ? null : form.no_exam_reason_id,
              no_admit_reason_id: (form.selected && !form.admitted) ? form.no_admit_reason_id : null,
              admitted_school_id: form.admitted ? form.admitted_school_id : null,
            })}
            style={grs.btnPrimary}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main AdmissionsPage ───────────────────────────────────────────────────────
export default function AdmissionsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.title === "Admin";

  const [year, setYear] = useState(CURRENT_YEAR);
  const [search, setSearch] = useState("");
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
    if (search && s) {
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      if (!name.includes(search.toLowerCase())) return false;
    }
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


  function exportCsv() {
    const headers = ["Student", "School", "Stage", "Math", "English", "Reasoning", "EVS", "Total"];
    const rows = filtered.map(e => {
      const s = studentMap[e.student_id];
      const name = s ? `${s.first_name} ${s.last_name}` : e.student_id;
      const total = [e.math, e.english, e.reasoning, e.evs].filter(v => v != null).reduce((a,b) => (a as number)+(b as number), 0);
      const status = e.admitted ? "Admitted" : e.selected ? "Selected" : e.appeared ? "Appeared" : e.applied ? "Applied" : e.form_received ? "Form Received" : "Eligible";
      return [name, e.school ?? "", status, e.math ?? "", e.english ?? "", e.reasoning ?? "", e.evs ?? "", total];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: "data:text/csv," + encodeURIComponent(csv), download: "admissions.csv" });
    a.click();
  }

  function printTable() {
    const w = window.open("", "_blank")!;
    const rows = filtered.map(e => {
      const s = studentMap[e.student_id];
      const name = s ? `${s.first_name} ${s.last_name}` : String(e.student_id);
      const total = [e.math, e.english, e.reasoning, e.evs].filter(v => v != null).reduce((a,b) => (a as number)+(b as number), 0);
      const status = e.admitted ? "Admitted" : e.selected ? "Selected" : e.appeared ? "Appeared" : e.applied ? "Applied" : e.form_received ? "Form Received" : "Eligible";
      return `<tr><td>${name}</td><td>${e.school ?? ""}</td><td>${status}</td><td>${e.math ?? ""}</td><td>${e.english ?? ""}</td><td>${e.reasoning ?? ""}</td><td>${e.evs ?? ""}</td><td>${total}</td></tr>`;
    }).join("");
    w.document.write(`<html><head><title>Admissions</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 10px;font-size:13px}th{background:#f0f4ff}</style></head><body><h2>Admissions</h2><table><thead><tr><th>Student</th><th>School</th><th>Stage</th><th>Math</th><th>English</th><th>Reasoning</th><th>EVS</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print();
  }

  return (
    <div className="grs-page" style={{ padding: "24px 28px", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Admissions</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
            School entrance exam pipeline tracking
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={exportCsv} title="Export CSV" style={grs.btnIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span className="grs-lbl">Export CSV</span>
          </button>
          <button onClick={printTable} title="Print" style={grs.btnIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            <span className="grs-lbl">Print</span>
          </button>
          <button onClick={() => setShowAdd(true)} style={{ ...grs.btnPrimary, fontSize: 14 }}>
            + Add Admission
          </button>
        </div>
      </div>

      {/* Filters — single row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <input
          placeholder="Search student..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: 14, flex: 1, minWidth: 0 }}
        />
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: 14, width: 90, flexShrink: 0 }}
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={filterDistrict}
          onChange={e => { setFilterDistrict(e.target.value === "" ? "" : Number(e.target.value)); setFilterCluster(""); }}
          style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: 14, width: 140, flexShrink: 0 }}
        >
          <option value="">All Districts</option>
          {allDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select
          value={filterCluster}
          onChange={e => setFilterCluster(e.target.value === "" ? "" : Number(e.target.value))}
          disabled={filterDistrict === ""}
          style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: 14, width: 140, flexShrink: 0 }}
        >
          <option value="">All Clusters</option>
          {filterClusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
            No admissions for {year}.
          </div>
        ) : (
          <>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-thead)" }}>
                  {["District", "Kutir", "Student", "Gender", "School", "Stage", "Exam Cat.", "Center", "App #", "Roll #", "Scores"].map(h => (
                    <th key={h} style={{
                      padding: "10px 14px", textAlign: "left", fontSize: 12,
                      fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase",
                      letterSpacing: "0.05em", borderBottom: "1px solid var(--border)"
                    }}>{h}</th>
                  ))}
                  <th style={{
                    padding: "10px 12px", fontSize: 12, fontWeight: 700,
                    color: "var(--text-secondary)", textTransform: "uppercase",
                    letterSpacing: "0.05em", borderBottom: "1px solid var(--border)",
                    position: "sticky", right: 0, background: "var(--bg-thead)", zIndex: 1,
                    textAlign: "right", width: 96
                  }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((exam, idx) => {
                  const s = studentMap[exam.student_id];
                  const sc = schoolMap[exam.school_id] || exam.school;
                  const totalScore = [exam.math, exam.english, exam.reasoning, exam.evs]
                    .reduce<number>((sum, v) => sum + (v != null ? Number(v) : 0), 0);
                  const hasScore = [exam.math, exam.english, exam.reasoning, exam.evs].some(v => v !== null && v !== undefined);
                  return (
                    <tr key={exam.id} style={{
                      borderBottom: idx < filtered.length - 1 ? "1px solid var(--border)" : undefined,
                      background: "transparent"
                    }}>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {(() => {
                          const kutir = s?.kutir_id != null ? kutirMap2.get(s.kutir_id) : null;
                          const cluster = kutir ? clusterMap.get(kutir.cluster_id) : null;
                          const area = cluster ? areaMap.get(cluster.area_id) : null;
                          return area ? (districtMap.get(area.district_id) ?? "—") : "—";
                        })()}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {s?.kutir_id != null ? (kutirMap2.get(s.kutir_id)?.name ?? "—") : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13, whiteSpace: "nowrap" }}>
                        {s ? (
                          <Link to={`/students/${s.id}`} style={{ color: "var(--text-primary)", textDecoration: "none", fontWeight: 500, fontSize: 13 }}>
                            {s.first_name} {s.last_name}
                          </Link>
                        ) : `#${exam.student_id}`}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)" }}>
                        {s?.gender ?? "—"}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {sc ? sc.name : `#${exam.school_id}`}
                        {sc && <span style={{ marginLeft: 5, fontSize: 10, background: "var(--bg-badge)", padding: "1px 5px", borderRadius: 8, color: "var(--text-secondary)" }}>{sc.school_type}</span>}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <StageBadge exam={exam} />
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {exam.exam_category_id ? (examCategoryMap.get(exam.exam_category_id) ?? "—") : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {exam.exam_center_id ? (examCenterMap.get(exam.exam_center_id) ?? "—") : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                        {exam.application_number ?? "—"}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                        {exam.roll_number ?? "—"}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        {hasScore ? (
                          <span>
                            {[exam.math, exam.english, exam.reasoning, exam.evs]
                              .map((v, i) => v !== null && v !== undefined ? (["M","E","R","EVS"][i] + ":" + v) : null)
                              .filter(Boolean).join(" ")}
                            {" "}
                            <strong style={{ color: "var(--text-primary)" }}>={totalScore}</strong>
                          </span>
                        ) : "—"}
                      </td>
                      <td style={{
                        padding: "8px 12px", textAlign: "right",
                        position: "sticky", right: 0,
                        background: idx % 2 === 0 ? "var(--bg-card)" : "var(--bg-row-alt, var(--bg-card))",
                        borderLeft: "1px solid var(--border)"
                      }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          <RowActions
                            onView={() => setViewExam(exam)}
                            onEdit={() => setEditExam(exam)}
                            onDelete={isAdmin ? () => { if (confirm("Delete this admission?")) deleteMut.mutate(exam.id); } : undefined}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <AddModal
          students={students}
          schools={schools}
          year={year}
          examCategories={examCategories}
          examCenters={examCenters}
          noExamReasons={noExamReasons}
          noAdmitReasons={noAdmitReasons}
          onClose={() => setShowAdd(false)}
          onSave={data => addMut.mutate(data)}
          saveError={addMut.error ? ((addMut.error as any)?.response?.data?.detail ?? "Save failed.") : null}
          saving={addMut.isPending}
        />
      )}

      {viewExam && (
        <ViewModal
          exam={viewExam}
          students={students}
          schools={schools}
          examCategories={examCategories}
          examCenters={examCenters}
          noExamReasons={noExamReasons}
          noAdmitReasons={noAdmitReasons}
          onClose={() => setViewExam(null)}
          onEdit={() => { setEditExam(viewExam); setViewExam(null); }}
        />
      )}

      {editExam && (
        <EditModal
          exam={editExam}
          onClose={() => setEditExam(null)}
          onSave={data => updateMut.mutate({ id: editExam.id, data })}
          examCategories={examCategories}
          examCenters={examCenters}
          noExamReasons={noExamReasons}
          noAdmitReasons={noAdmitReasons}
          schools={schools}
        />
      )}
    </div>
  );
}
