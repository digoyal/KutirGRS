import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStudent } from "../api/students";
import {
  StudentForm,
  emptyStudentForm,
  type StudentFormState,
} from "../components/StudentForm";
import { grs } from "../styles/grs";

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormError("First and last name are required");
      return;
    }
    setFormError("");
    createMut.mutate(form);
  }

  return (
    <div className="grs-page" style={{ padding: "16px 20px", maxWidth: 600, width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--link-color)",
            fontSize: 14,
            padding: 0,
          }}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0, fontSize: 20, color: "var(--text-primary)" }}>Add Student</h2>
      </div>

      {formError && <p style={grs.errorBox}>{formError}</p>}

      <form onSubmit={handleSubmit}>
        <StudentForm form={form} setForm={setForm} mode="add" />

        <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
          <button type="button" style={grs.btnSecondary} onClick={() => navigate(-1)} disabled={createMut.isPending}>
            Cancel
          </button>
          <button type="submit" style={grs.btnPrimary} disabled={createMut.isPending}>
            {createMut.isPending ? "Saving…" : "Add Student"}
          </button>
        </div>
      </form>
    </div>
  );
}
