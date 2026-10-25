import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getExam,
  updateExam,
  listExams,
  listExamTypes,
  type StudentExam,
  type StudentExamCreate,
  type ExamTypeMin,
} from "../api/admissions";
import { getStudent } from "../api/students";
import {
  AdmissionForm,
  admissionFormFromExam,
  admissionPayloadFromForm,
  emptyAdmissionForm,
  type AdmissionFormState,
} from "../components/AdmissionForm";
import { grs } from "../styles/grs";

const NAVY_BG = "#1e3a5f";
const NAVY_TEXT = "#ffffff";
const NAVY_ACCENT = "#93c5fd";

export default function AdmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const enteredViaEdit = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState(enteredViaEdit);
  const [form, setForm] = useState<AdmissionFormState>(emptyAdmissionForm);
  const [admitBlockMsg, setAdmitBlockMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");

  const { data: exam, isLoading } = useQuery<StudentExam>({
    queryKey: ["admission", id],
    queryFn: () => getExam(Number(id)),
    enabled: !!id && !isNaN(Number(id)),
  });

  useEffect(() => {
    if (!exam) return;
    setForm(admissionFormFromExam(exam));
  }, [exam?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: student } = useQuery({
    queryKey: ["student", exam?.student_id],
    queryFn: () => getStudent(exam!.student_id),
    enabled: !!exam?.student_id,
  });

  const { data: studentAllExams = [] } = useQuery({
    queryKey: ["student-exams-for-student", exam?.student_id],
    queryFn: () => listExams({ student_id: exam!.student_id }),
    enabled: !!exam?.student_id && editing,
  });

  const { data: examTypes = [] } = useQuery<ExamTypeMin[]>({
    queryKey: ["exam-types"],
    queryFn: listExamTypes,
    staleTime: 5 * 60 * 1000,
  });

  const updateMut = useMutation({
    mutationFn: (data: Partial<StudentExamCreate>) => updateExam(Number(id), data),
    onSuccess: (updated: StudentExam) => {
      qc.setQueryData(["admission", id], updated);
      qc.invalidateQueries({ queryKey: ["student-exams"] });
      if (enteredViaEdit) {
        navigate(-1);
      } else {
        setEditing(false);
        setSaveError("");
      }
    },
    onError: (e: unknown) => {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setSaveError(detail ?? "Save failed");
    },
  });

  if (isLoading) return <p style={{ color: "var(--text-secondary)", padding: 24 }}>Loading…</p>;
  if (!exam) return <p style={{ color: "var(--danger)", padding: 24 }}>Admission not found.</p>;

  const studentName = student
    ? `${student.first_name} ${student.last_name}`
    : `Student #${exam.student_id}`;
  const canSave = !form.selected || !!form.admitted_school_id;

  function resetFromExam() {
    setForm(admissionFormFromExam(exam!));
    setAdmitBlockMsg(null);
    setSaveError("");
  }

  function handleSave() {
    setSaveError("");
    const payload = admissionPayloadFromForm(form);
    const { student_id: _sid, school_start_year: _year, ...rest } = payload;
    updateMut.mutate(rest);
  }

  function handleCancel() {
    if (enteredViaEdit) navigate(-1);
    else {
      setEditing(false);
      resetFromExam();
    }
  }

  // ── VIEW ───────────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div style={{ maxWidth: 640, padding: "0 0 24px" }}>
        <div
          style={{
            background: NAVY_BG,
            borderRadius: "0 0 8px 8px",
            padding: "14px 20px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => navigate("/admissions")}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: NAVY_ACCENT,
                  borderRadius: 6,
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                ← Back
              </button>
              <div>
                <div style={{ color: NAVY_TEXT, fontWeight: 700, fontSize: "1.1rem" }}>
                  {studentName}
                </div>
                <div style={{ color: NAVY_ACCENT, fontSize: "0.78rem", marginTop: 2 }}>
                  {examTypes.find((e) => e.id === exam.exam_type_id)?.name ?? "—"} ·{" "}
                  {exam.school_start_year}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: NAVY_ACCENT,
                  borderRadius: 6,
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: "0 20px" }}>
          <AdmissionForm
            form={form}
            setForm={setForm}
            mode="view"
            studentName={studentName}
            currentExamId={exam.id}
          />

          <p
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginTop: 8,
              padding: "0 4px",
            }}
          >
            Added: {new Date(exam.created_at).toLocaleString("en-IN")} &nbsp;·&nbsp; Updated:{" "}
            {new Date(exam.updated_at).toLocaleString("en-IN")}
          </p>
        </div>
      </div>
    );
  }

  // ── EDIT ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 640, padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={handleCancel}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            fontSize: "1.1rem",
            padding: 0,
          }}
        >
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>
          Edit Admission
        </h2>
      </div>

      <AdmissionForm
        form={form}
        setForm={setForm}
        mode="edit"
        studentName={studentName}
        siblingExams={studentAllExams}
        currentExamId={exam.id}
        admitBlockMsg={admitBlockMsg}
        onAdmitBlockMsg={setAdmitBlockMsg}
      />

      {saveError && (
        <div
          style={{
            marginTop: 16,
            padding: "8px 12px",
            background: "var(--danger-bg, #fef2f2)",
            border: "1px solid var(--danger-border, #fca5a5)",
            borderRadius: 6,
            color: "var(--danger, #dc2626)",
            fontSize: 13,
          }}
        >
          {saveError}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
        <button style={grs.btnSecondary} onClick={handleCancel}>
          Cancel
        </button>
        <button
          style={{ ...grs.btnPrimary, opacity: !canSave || updateMut.isPending ? 0.5 : 1 }}
          disabled={!canSave || updateMut.isPending}
          onClick={handleSave}
        >
          {updateMut.isPending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
