import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FormPageShell } from "@parivaar/ui";
import { createStudent, studentWritePayload } from "../api/students";
import { apiErrorDetail } from "../utils/apiError";
import {
  StudentForm,
  emptyStudentForm,
  type StudentFormHandle,
  type StudentFormState,
} from "../components/StudentForm";

export default function StudentAddPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<StudentFormState>(emptyStudentForm);
  const formRef = useRef<StudentFormHandle>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const validationError = formRef.current?.validate() ?? null;
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createStudent(studentWritePayload(form));
      qc.invalidateQueries({ queryKey: ["students"] });
      navigate(-1);
    } catch (e: unknown) {
      setError(apiErrorDetail(e, "Failed to create student"));
      setSaving(false);
    }
  }

  return (
    <FormPageShell
      header={
        <div className="grs-page-topbar">
          <button type="button" className="grs-page-back" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h2 className="grs-page-title" style={{ margin: 0, fontSize: 20, color: "var(--text-primary)" }}>
            Add Student
          </h2>
        </div>
      }
      error={error}
      saving={saving}
      saveLabel="Add Student"
      onSave={handleSave}
      onCancel={() => navigate(-1)}
    >
      <StudentForm ref={formRef} form={form} setForm={setForm} mode="add" />
    </FormPageShell>
  );
}
