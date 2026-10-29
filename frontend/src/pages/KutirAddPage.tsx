import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createKutir } from "../api/kutirs";
import { KutirForm, emptyKutirForm, type KutirFormState } from "../components/KutirForm";
import { grs } from "../styles/grs";

export default function KutirAddPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState<KutirFormState>(emptyKutirForm);
  const [saveError, setSaveError] = useState("");

  const createMut = useMutation({
    mutationFn: createKutir,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kutirs"] });
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
    if (!form.cluster_id) {
      setSaveError("Please select a cluster");
      return;
    }
    setSaveError("");
    createMut.mutate(form);
  }

  return (
    <div className="grs-page" style={{ maxWidth: 600, width: "100%", boxSizing: "border-box", padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button
          style={{
            background: "none",
            border: "none",
            color: "var(--link-color)",
            cursor: "pointer",
            fontSize: 14,
            padding: 0,
          }}
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0, fontSize: 20 }}>Add Kutir</h2>
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

      <KutirForm form={form} setForm={setForm} mode="add" />

      <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
        <button style={grs.btnSecondary} onClick={() => navigate(-1)}>
          Cancel
        </button>
        <button style={grs.btnPrimary} disabled={createMut.isPending} onClick={handleSave}>
          {createMut.isPending ? "Saving…" : "Save Kutir"}
        </button>
      </div>
    </div>
  );
}
