import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createExam, type StudentExamCreate } from "../api/admissions";
import {
  AdmissionForm,
  emptyAdmissionForm,
  admissionPayloadFromForm,
  admissionSchoolFieldsRequired,
  type AdmissionFormState,
} from "../components/AdmissionForm";
import { grs } from "../styles/grs";

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
    addMut.mutate(admissionPayloadFromForm(form) as StudentExamCreate);
  }

  const schoolRequired = admissionSchoolFieldsRequired(form);
  const canSave =
    !!form.student_id &&
    (!schoolRequired || (!!form.school_type && !!form.admitted_school_id));

  return (
    <div style={{ maxWidth: 640, padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate(-1)}
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
          Add Admission
        </h2>
      </div>

      <AdmissionForm
        form={form}
        setForm={setForm}
        mode="add"
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
        <button onClick={() => navigate(-1)} style={grs.btnSecondary}>
          Cancel
        </button>
        <button
          disabled={!canSave || addMut.isPending}
          onClick={handleSave}
          style={{ ...grs.btnPrimary, opacity: !canSave || addMut.isPending ? 0.5 : 1 }}
        >
          {addMut.isPending ? "Adding…" : "Add Admission"}
        </button>
      </div>
    </div>
  );
}
