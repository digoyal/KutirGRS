import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSchool } from "../api/schools";
import { SchoolForm, emptySchoolForm, type SchoolFormState } from "../components/SchoolForm";
import { grs } from "../styles/grs";

export default function SchoolAddPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<SchoolFormState>(emptySchoolForm);
  const [saveError, setSaveError] = useState("");

  const createMut = useMutation({
    mutationFn: createSchool,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schools"] });
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
    setSaveError("");
    createMut.mutate(form);
  }

  return (
    <div className="grs-page" style={{ maxWidth: 600, width: "100%", boxSizing: "border-box", padding: "16px 20px" }}>
      <div className="grs-page-topbar">
        <button type="button" className="grs-page-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h2 className="grs-page-title" style={{ margin: 0, fontSize: 20 }}>
          Add School
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

      <SchoolForm form={form} setForm={setForm} mode="add" />

      <div className="grs-form-actions" style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
        <button style={grs.btnSecondary} onClick={() => navigate(-1)}>
          Cancel
        </button>
        <button style={grs.btnPrimary} disabled={createMut.isPending} onClick={handleSave}>
          {createMut.isPending ? "Saving…" : "Save School"}
        </button>
      </div>
    </div>
  );
}
