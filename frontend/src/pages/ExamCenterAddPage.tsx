import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createExamCenter, type ExamCenter } from "../api/geo";
import {
  ExamCenterForm,
  emptyExamCenterForm,
  type ExamCenterFormState,
} from "../components/ExamCenterForm";
import { grs } from "../styles/grs";

export default function ExamCenterAddPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<ExamCenterFormState>(emptyExamCenterForm);
  const [saveError, setSaveError] = useState("");

  const createMut = useMutation({
    mutationFn: (data: Omit<ExamCenter, "id">) => createExamCenter(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exam-centers"] });
      navigate(-1);
    },
    onError: (e: unknown) => {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setSaveError(detail ?? "Failed to save");
    },
  });

  function handleSave() {
    if (!form.name.trim()) {
      setSaveError("Name is required");
      return;
    }
    if (!form.district_id) {
      setSaveError("Please select a district");
      return;
    }
    setSaveError("");
    createMut.mutate({
      name: form.name.trim(),
      district_id: form.district_id,
      street: form.street || null,
      city: form.city || null,
      state: form.state || null,
      pincode: form.pincode || null,
    });
  }

  return (
    <div className="grs-page" style={{ maxWidth: 600, width: "100%", boxSizing: "border-box", padding: "16px 20px" }}>
      <div className="grs-page-topbar">
        <button type="button" className="grs-page-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h2 className="grs-page-title" style={{ margin: 0, fontSize: 20 }}>
          Add Exam Center
        </h2>
      </div>

      {saveError && (
        <div
          style={{
            color: "var(--danger)",
            background: "var(--danger-bg,#fef2f2)",
            border: "1px solid var(--danger-border,#fca5a5)",
            borderRadius: 6,
            padding: "8px 12px",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {saveError}
        </div>
      )}

      <ExamCenterForm form={form} setForm={setForm} mode="add" />

      <div className="grs-form-actions" style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
        <button style={grs.btnSecondary} onClick={() => navigate(-1)}>
          Cancel
        </button>
        <button style={grs.btnPrimary} disabled={createMut.isPending} onClick={handleSave}>
          {createMut.isPending ? "Saving…" : "Save Exam Center"}
        </button>
      </div>
    </div>
  );
}
