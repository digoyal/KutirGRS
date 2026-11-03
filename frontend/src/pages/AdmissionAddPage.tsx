import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormPageShell } from "@parivaar/ui";
import {
  createExam,
  listExamTypeSubjects,
  type ExamTypeSubjectRow,
  type StudentExamCreate,
} from "../api/admissions";
import { subjectsForExamType } from "../components/admissions-pipeline";
import {
  AdmissionForm,
  emptyAdmissionForm,
  admissionPayloadFromForm,
  validateAdmissionForm,
  type AdmissionFormState,
} from "../components/AdmissionForm";
import { ADMISSIONS_FILTER_STORAGE_KEY } from "../constants/admissionsList";
import { consumePersistedFilters, persistFilters } from "../hooks/usePersistedFilters";
import { apiErrorDetail } from "../utils/apiError";

const CURRENT_YEAR = new Date().getFullYear();

type AdmissionsFilterSnapshot = {
  year?: number;
  district?: number | "";
  cluster?: number | "";
  kutir?: number | "";
  search?: string;
  page?: number;
};

function persistListYearAfterCreate(schoolStartYear: number) {
  const prev =
    consumePersistedFilters<AdmissionsFilterSnapshot>(ADMISSIONS_FILTER_STORAGE_KEY) ?? {};
  persistFilters(ADMISSIONS_FILTER_STORAGE_KEY, {
    ...prev,
    year: schoolStartYear,
    page: 1,
  });
}

export default function AdmissionAddPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();

  const initYear = Number(searchParams.get("year")) || CURRENT_YEAR;
  const [form, setForm] = useState<AdmissionFormState>(() => emptyAdmissionForm(initYear));
  const [admitBlockMsg, setAdmitBlockMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: examTypeSubjects = [] } = useQuery<ExamTypeSubjectRow[]>({
    queryKey: ["exam-type-subjects"],
    queryFn: listExamTypeSubjects,
    staleTime: 5 * 60 * 1000,
  });
  const subjectIds = useMemo(
    () => subjectsForExamType(examTypeSubjects, form.exam_type_id).map((s) => s.id),
    [examTypeSubjects, form.exam_type_id],
  );
  const validateOpts = useMemo(
    () => ({ mode: "add" as const, subjectIds }),
    [subjectIds],
  );

  async function handleSave() {
    const validationError = validateAdmissionForm(form, validateOpts);
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    setSaveError(null);
    setSaving(true);
    const payload = admissionPayloadFromForm(form) as StudentExamCreate;

    try {
      await createExam(payload);
      qc.invalidateQueries({ queryKey: ["student-exams"] });
      persistListYearAfterCreate(payload.school_start_year);
      navigate("/admissions", { replace: true });
    } catch (e: unknown) {
      setSaveError(apiErrorDetail(e));
      setSaving(false);
    }
  }

  return (
    <FormPageShell
      style={{ maxWidth: 640 }}
      header={
        <div className="grs-page-topbar">
          <button type="button" className="grs-page-back" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h2 className="grs-page-title" style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>
            Add Admission
          </h2>
        </div>
      }
      error={saveError}
      saving={saving}
      saveLabel="Add Admission"
      onSave={handleSave}
      onCancel={() => navigate(-1)}
    >
      <AdmissionForm
        form={form}
        setForm={setForm}
        mode="add"
        admitBlockMsg={admitBlockMsg}
        onAdmitBlockMsg={setAdmitBlockMsg}
      />
    </FormPageShell>
  );
}
