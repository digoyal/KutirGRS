import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createExam, listExamTypes, listExamTypeSubjects } from "../api/admissions";
import type { StudentExamCreate, ExamTypeMin, ExamTypeSubjectRow, StudentExam } from "../api/admissions";
import { listStudents } from "../api/students";
import { listSchools } from "../api/schools";
import { useAuth } from "../context/AuthContext";
import { listKutirs } from "../api/kutirs";
import { grs } from "../styles/grs";
import { listDistricts, listExamCenters, listExamCategories, listNoExamReasons, listNoAdmitReasons } from "../api/geo";
import { STAGES, type StageKey, PipelineStepper, subjectsForExamType } from "../components/admissions-pipeline";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 2 + i);

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
const sec: React.CSSProperties = {
  background: "var(--bg-card)", borderRadius: 8, padding: "10px 14px", marginBottom: 8,
};
const secTitle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
  color: "var(--badge-blue-fg, #2563eb)", marginBottom: 8,
};

export default function AdmissionAddPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { user } = useAuth();

  const initYear = Number(searchParams.get("year")) || CURRENT_YEAR;

  // — Student picker —
  const [studentId, setStudentId] = useState<number | "">("");
  const [search, setSearch]       = useState("");
  const [kutirFilter, setKutirFilter] = useState<number | "">("");

  const { data: allKutirsData = [] } = useQuery({
    queryKey: ["kutirs"], queryFn: () => listKutirs(), staleTime: 5 * 60 * 1000,
  });
  const kutirs = useMemo(() => {
    if (!user || user.title === "Admin") return allKutirsData;
    return user.kutir_ids.length > 0
      ? allKutirsData.filter(k => user.kutir_ids.includes(k.id))
      : allKutirsData;
  }, [allKutirsData, user]);

  // Auto-select when only one kutir available
  useEffect(() => {
    if (kutirs.length === 1 && kutirFilter === "") setKutirFilter(kutirs[0].id);
  }, [kutirs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: examTypes = [] } = useQuery<ExamTypeMin[]>({
    queryKey: ["exam-types"], queryFn: listExamTypes, staleTime: 5 * 60 * 1000,
  });
  const { data: examTypeSubjects = [] } = useQuery<ExamTypeSubjectRow[]>({
    queryKey: ["exam-type-subjects"], queryFn: listExamTypeSubjects, staleTime: 5 * 60 * 1000,
  });

  // — Dropdown filters —
  const [schoolDistrictFilter, setSchoolDistrictFilter] = useState<number | "">("");
  const [examDistrictFilter, setExamDistrictFilter]     = useState<number | "">("");

  const [schoolType, setSchoolType] = useState("");
  const [sy, setSy] = useState<number>(initYear);

  // — Form / pipeline state —
  const [form, setForm] = useState<Partial<StudentExamCreate>>({
    eligible: true, form_received: false, applied: false, appeared: false,
    selected: false, admitted: false,
  });
  const [scoreInputs, setScoreInputs] = useState<Record<number, string>>({});
  const [admitBlockMsg, setAdmitBlockMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })); }
  function setScore(subjectId: number, val: string) { setScoreInputs(prev => ({ ...prev, [subjectId]: val })); }
  function toggleStage(updates: Partial<Record<StageKey, boolean>>) {
    setAdmitBlockMsg(null);
    setForm(f => ({ ...f, ...updates }));
  }

  // — Data queries —
  const { data: students = [] } = useQuery({
    queryKey: ["students-names"],
    queryFn: () => listStudents({ name_only: true }),
  });
  const { data: schools = [] } = useQuery({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
  });
  const { data: districts = [] } = useQuery({
    queryKey: ["all-districts"],
    queryFn: () => listDistricts(),
  });
  const { data: examCategories = [] } = useQuery({ queryKey: ["exam-categories"],  queryFn: () => listExamCategories() });
  const { data: examCenters   = [] } = useQuery({ queryKey: ["exam-centers"],      queryFn: () => listExamCenters() });
  const { data: noExamReasons = [] } = useQuery({ queryKey: ["no-exam-reasons"],   queryFn: () => listNoExamReasons() });
  const { data: noAdmitReasons= [] } = useQuery({ queryKey: ["no-admit-reasons"],  queryFn: () => listNoAdmitReasons() });

  // — Derived values —

  // Scope districts to user's assigned districts (same as KutirsPage)
  const scopedDistricts = useMemo(() => {
    if (!user || user.title === "Admin") return districts;
    return user.district_ids?.length > 0
      ? districts.filter((d: any) => user.district_ids.includes(d.id))
      : districts;
  }, [districts, user]);

  // Auto-select exam/school district when user is scoped to exactly one
  useEffect(() => {
    if (scopedDistricts.length === 1) {
      if (examDistrictFilter === "")   setExamDistrictFilter(scopedDistricts[0].id);
      if (schoolDistrictFilter === "") setSchoolDistrictFilter(scopedDistricts[0].id);
    }
  }, [scopedDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const schoolTypes = (Array.from(new Set(schools.map(sc => sc.school_type).filter(Boolean))) as string[]).sort();
  const subjects    = subjectsForExamType(examTypeSubjects, form.exam_type_id);

  const filteredStudents = students.filter(s => {
    const matchSearch = (`${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()))
                     || (s.father_name != null && s.father_name.toLowerCase().includes(search.toLowerCase()));
    const matchKutir  = kutirFilter === "" || s.kutir_id === Number(kutirFilter);
    return matchSearch && matchKutir;
  });

  // Auto-select when search narrows to exactly one student
  useEffect(() => {
    if (filteredStudents.length === 1 && search) setStudentId(filteredStudents[0].id);
  }, [filteredStudents.length, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredExamCenters = examDistrictFilter === ""
    ? examCenters
    : examCenters.filter(c => c.district_id === examDistrictFilter);

  const schoolTypeFiltered  = schoolType ? schools.filter(s => s.school_type === schoolType) : schools;
  const filteredGrsSchools  = schoolDistrictFilter === ""
    ? schoolTypeFiltered
    : schoolTypeFiltered.filter(s => (s as any).district_id === schoolDistrictFilter);

  // — Save —
  const addMut = useMutation({
    mutationFn: createExam,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["student-exams"] }); navigate(-1); },
    onError: (e: any) => setSaveError(e?.response?.data?.detail ?? "Save failed."),
  });

  function handleSave() {
    setSaveError(null);
    addMut.mutate({
      student_id:         Number(studentId),
      school_id:          null,
      school_type:        schoolType || null,
      exam_type_id:       form.exam_type_id ?? null,
      school_start_year:  sy,
      eligible:           form.eligible ?? true,
      form_received:      form.form_received,
      applied:            form.applied,
      admit_card:         (form as any).admit_card,
      appeared:           form.appeared,
      selected:           form.selected,
      admitted:           form.admitted,
      exam_category_id:   form.exam_category_id ?? null,
      exam_center_id:     form.exam_center_id ?? null,
      application_number: form.application_number ?? null,
      roll_number:        form.roll_number ?? null,
      scores: Object.entries(scoreInputs)
        .filter(([, v]) => v !== "")
        .map(([id, v]) => ({ subject_id: Number(id), score: parseFloat(v) })),
      no_exam_reason_id:  form.appeared ? null : (form.no_exam_reason_id ?? null),
      no_admit_reason_id: (form.selected && !form.admitted) ? (form.no_admit_reason_id ?? null) : null,
      admitted_school_id: form.admitted ? (form.admitted_school_id ?? null) : null,
      admission_class:    form.admission_class ?? null,
    } as StudentExamCreate);
  }

  const canSave = !!studentId && !!schoolType && (!form.selected || !!form.admitted_school_id);

  // Fake StudentExam for PipelineStepper (spreads form so admit_card is included)
  const fakeExam = {
    ...form,
    id: 0, student_id: 0, school_id: 0, school_start_year: sy,
    eligible:           form.eligible ?? true,
    form_received:      form.form_received ?? false,
    applied:            form.applied ?? false,
    appeared:           form.appeared ?? false,
    selected:           form.selected ?? false,
    admitted:           form.admitted ?? false,
    admitted_school_id: null, no_admit_reason_id: null, exam_category_id: null,
    application_number: null, exam_center_id: null, roll_number: null,
    no_exam_reason_id:  null, scores: [], created_at: "", updated_at: "",
    school_type:        schoolType || null,
    exam_type_id:       form.exam_type_id ?? null,
    admission_class:    form.admission_class ?? null,
  } as StudentExam;

  return (
    <div style={{ maxWidth: 640, padding: "16px 20px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "1.1rem", padding: 0 }}>←</button>
        <h2 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>Add Admission</h2>
      </div>

      {/* ── Student + Class ── */}
      <section style={sec}>
        <div style={secTitle}>Student</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 120px", gap: 8 }}>
          <div>
            <label style={grs.fieldLabel}>Kutir</label>
            <select
              value={kutirFilter}
              onChange={e => { setKutirFilter(e.target.value === "" ? "" : Number(e.target.value)); setStudentId(""); setSearch(""); }}
              style={selStyles}
            >
              <option value="">-- Select Kutir --</option>
              {kutirs.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </div>
          <div style={{ position: "relative" }}>
            <label style={grs.fieldLabel}>Student <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              placeholder="Type name to search…"
              value={search}
              onChange={e => { setSearch(e.target.value); setStudentId(""); }}
              style={{ ...inputStyles, borderRadius: filteredStudents.length > 0 && search && !studentId ? "6px 6px 0 0" : undefined }}
            />
            {filteredStudents.length > 0 && search && !studentId && (
              <div style={{ position: "absolute", left: 0, right: 0, zIndex: 20, border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 6px 6px", maxHeight: 160, overflowY: "auto", background: "var(--bg-card)" }}>
                {filteredStudents.map(s => (
                  <div
                    key={s.id}
                    onClick={() => { setStudentId(s.id); setSearch(`${s.first_name} ${s.last_name}`); }}
                    style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.875rem" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--badge-blue-bg)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    {s.first_name} {s.last_name}
                    {s.father_name ? <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginLeft: 6 }}>s/o {s.father_name}</span> : null}
                  </div>
                ))}
              </div>
            )}
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
      </section>

      {/* ── Pipeline Stage ── */}
      <section style={sec}>
        <div style={secTitle}>Pipeline Stage</div>
        <PipelineStepper exam={fakeExam} onChange={toggleStage} />
      </section>

      {/* ── Exam Details ── */}
      <section style={sec}>
        <div style={secTitle}>Exam Details</div>

        <div style={{ display: "grid", gridTemplateColumns: "90px 130px 1fr", gap: 12, alignItems: "end" }}>
          <div>
            <label style={grs.fieldLabel}>Year</label>
            <select value={sy} onChange={e => setSy(Number(e.target.value))} style={selStyles}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
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
              {scopedDistricts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
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

      {/* ── Scores ── */}
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

      {/* ── Reason Not Appeared ── */}
      {!form.appeared && (
        <section style={sec}>
          <div style={secTitle}>Reason Not Appeared for Exam</div>
          <select value={form.no_exam_reason_id ?? ""} onChange={e => set("no_exam_reason_id", e.target.value === "" ? null : Number(e.target.value))} style={selStyles}>
            <option value="">-- select --</option>
            {noExamReasons.map(r => <option key={r.id} value={r.id}>{r.reason}</option>)}
          </select>
        </section>
      )}

      {/* ── GRS School (only when selected) ── */}
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
                {scopedDistricts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
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

      {/* ── Reason Not Admitted ── */}
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
        <button onClick={() => navigate(-1)} style={grs.btnSecondary}>Cancel</button>
        <button
          disabled={!canSave || addMut.isPending}
          onClick={handleSave}
          style={{ ...grs.btnPrimary, opacity: (!canSave || addMut.isPending) ? 0.5 : 1 }}
        >
          {addMut.isPending ? "Adding…" : "Add Admission"}
        </button>
      </div>
    </div>
  );
}
