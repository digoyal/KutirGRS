import { useState, useEffect, useRef, useCallback, type SetStateAction } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getExam,
  updateExam,
  listExams,
  listProgress,
  listExamTypes,
  listExamTypeSubjects,
  type StudentExam,
  type ExamTypeSubjectRow,
  type StudentExamCreate,
  type ExamTypeMin,
} from "../api/admissions";
import { getStudent } from "../api/students";
import { listSchools } from "../api/schools";
import {
  AdmissionForm,
  admissionFormFromExam,
  admissionPayloadFromForm,
  validateAdmissionForm,
  validateAdmissionUnadmit,
  emptyAdmissionForm,
  type AdmissionFormState,
  type GrsSchoolLookup,
} from "../components/AdmissionForm";
import { subjectsForExamType } from "../components/admissions-pipeline";
import { FormPageShell } from "@parivaar/ui";
import { formatAcademicYear } from "../utils/academicYear";
import { studentLabel } from "../utils/studentLabel";
import { apiErrorDetail } from "../utils/apiError";
import { invalidateAdmissionCaches } from "../utils/invalidateAdmissionCaches";

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
  const formRef = useRef(form);
  formRef.current = form;
  const setFormWithRef = useCallback((update: SetStateAction<AdmissionFormState>) => {
    setForm((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      formRef.current = next;
      return next;
    });
  }, []);
  const [admitBlockMsg, setAdmitBlockMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const {
    data: exam,
    isLoading,
    isError,
    error: loadError,
  } = useQuery<StudentExam>({
    queryKey: ["admission", id],
    queryFn: () => getExam(Number(id)),
    enabled: !!id && !isNaN(Number(id)),
  });

  useEffect(() => {
    if (!exam) return;
    const next = admissionFormFromExam(exam);
    formRef.current = next;
    setForm(next);
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

  const { data: progressRow = null } = useQuery({
    queryKey: ["student-progress-for-admission", exam?.student_id],
    queryFn: async () => {
      const rows = await listProgress({ student_id: exam!.student_id, limit: 1 });
      return rows[0] ?? null;
    },
    enabled: !!exam?.student_id && editing && exam.admitted,
  });

  const { data: examTypes = [] } = useQuery<ExamTypeMin[]>({
    queryKey: ["exam-types"],
    queryFn: listExamTypes,
    staleTime: 5 * 60 * 1000,
  });
  const { data: schools = [] } = useQuery({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: examTypeSubjects = [] } = useQuery<ExamTypeSubjectRow[]>({
    queryKey: ["exam-type-subjects"],
    queryFn: listExamTypeSubjects,
    staleTime: 5 * 60 * 1000,
  });

  const updateMut = useMutation({
    mutationFn: (data: Partial<StudentExamCreate>) => updateExam(Number(id), data),
    onSuccess: (updated: StudentExam) => {
      qc.setQueryData(["admission", id], updated);
      invalidateAdmissionCaches(qc);
      if (enteredViaEdit) {
        navigate(-1);
      } else {
        setEditing(false);
        setSaveError("");
      }
    },
    onError: (e: unknown) => {
      setSaveError(apiErrorDetail(e, "Save failed."));
    },
  });

  if (isLoading) return <p style={{ color: "var(--text-secondary)", padding: 24 }}>Loading…</p>;
  if (isError) {
    return (
      <p style={{ color: "var(--danger)", padding: 24 }}>
        {apiErrorDetail(loadError, "Failed to load admission.")}
      </p>
    );
  }
  if (!exam) return <p style={{ color: "var(--danger)", padding: 24 }}>Admission not found.</p>;

  const studentName = studentLabel(student, `Student #${exam.student_id}`);

  function resetFromExam() {
    const next = admissionFormFromExam(exam!);
    formRef.current = next;
    setForm(next);
    setAdmitBlockMsg(null);
    setSaveError("");
  }

  function handleSave() {
    const currentForm = formRef.current;
    const schoolsCatalog =
      (qc.getQueryData<GrsSchoolLookup>(["schools"]) as GrsSchoolLookup | undefined) ?? schools;
    const subjectIds = subjectsForExamType(examTypeSubjects, currentForm.exam_type_id).map(
      (s) => s.id,
    );
    const validationError = validateAdmissionForm(currentForm, {
      mode: "edit",
      subjectIds,
    });
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    const unadmitError = validateAdmissionUnadmit(currentForm, exam!.admitted, progressRow);
    if (unadmitError) {
      setSaveError(unadmitError);
      return;
    }
    setSaveError("");
    const payload = admissionPayloadFromForm(currentForm, schoolsCatalog);
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
            className="grs-admission-header"
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
                  {formatAcademicYear(exam.school_start_year)}
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
            studentKutirId={student?.kutir_id}
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
    <FormPageShell
      style={{ maxWidth: 640 }}
      header={
        <div className="grs-page-topbar">
          <button type="button" className="grs-page-back" onClick={handleCancel}>
            ← Back
          </button>
          <h2 className="grs-page-title" style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>
            Edit Admission
          </h2>
        </div>
      }
      error={saveError}
      saving={updateMut.isPending}
      saveLabel="Save Changes"
      onSave={handleSave}
      onCancel={handleCancel}
      actionsStyle={{ marginTop: 16 }}
    >
      <AdmissionForm
        form={form}
        setForm={setFormWithRef}
        mode="edit"
        studentName={studentName}
        studentKutirId={student?.kutir_id}
        siblingExams={studentAllExams}
        currentExamId={exam.id}
        admitBlockMsg={admitBlockMsg}
        onAdmitBlockMsg={setAdmitBlockMsg}
      />
    </FormPageShell>
  );
}
