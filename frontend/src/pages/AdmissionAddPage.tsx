import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormPageShell } from "@parivaar/ui";
import { createExam, type StudentExamCreate } from "../api/admissions";
import {
  AdmissionForm,
  emptyAdmissionForm,
  admissionPayloadFromForm,
  admissionSchoolFieldsRequired,
  admissionClassMissing,
  ADMISSION_CLASS_REQUIRED_MSG,
  type AdmissionFormState,
} from "../components/AdmissionForm";

const CURRENT_YEAR = new Date().getFullYear();

export default function AdmissionAddPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();

  const initYear = Number(searchParams.get("year")) || CURRENT_YEAR;
  const [form, setForm] = useState<AdmissionFormState>(() => emptyAdmissionForm(initYear));
  const [admitBlockMsg, setAdmitBlockMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const addMut = useMutation({
    mutationFn: createExam,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-exams"] });
      navigate(-1);
    },
    onError: (e: unknown) => {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setSaveError(detail ?? "Save failed.");
    },
  });

  function handleSave() {
    setSaveError(null);
    if (admissionClassMissing(form)) {
      setSaveError(ADMISSION_CLASS_REQUIRED_MSG);
      return;
    }
    addMut.mutate(admissionPayloadFromForm(form) as StudentExamCreate);
  }

  const schoolRequired = admissionSchoolFieldsRequired(form);
  const classOk = !admissionClassMissing(form);
  const canSave =
    !!form.student_id &&
    classOk &&
    (!schoolRequired || (!!form.school_type && !!form.admitted_school_id));

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
      saving={addMut.isPending}
      saveDisabled={!canSave}
      saveLabel="Add Admission"
      onSave={handleSave}
      onCancel={() => navigate(-1)}
      actionsStyle={{ marginTop: 16 }}
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
