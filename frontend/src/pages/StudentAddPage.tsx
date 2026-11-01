import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormPageShell } from "@parivaar/ui";
import { createStudent } from "../api/students";
import {
  StudentForm,
  emptyStudentForm,
  type StudentFormState,
} from "../components/StudentForm";

export default function StudentAddPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<StudentFormState>(emptyStudentForm);
  const [formError, setFormError] = useState("");

  const createMut = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      navigate(-1);
    },
    onError: (e: unknown) => {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setFormError(detail ?? "Failed to create student");
    },
  });

  function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormError("First and last name are required");
      return;
    }
    setFormError("");
    createMut.mutate(form);
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
      error={formError}
      saving={createMut.isPending}
      saveLabel="Add Student"
      onSave={handleSave}
      onCancel={() => navigate(-1)}
    >
      <StudentForm form={form} setForm={setForm} mode="add" />
    </FormPageShell>
  );
}
