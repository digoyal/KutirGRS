import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormPageShell } from "@parivaar/ui";
import { createKutir } from "../api/kutirs";
import { KutirForm, emptyKutirForm, type KutirFormState } from "../components/KutirForm";

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
    <FormPageShell
      header={
        <div className="grs-page-topbar">
          <button type="button" className="grs-page-back" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h2 className="grs-page-title" style={{ margin: 0, fontSize: 20 }}>
            Add Kutir
          </h2>
        </div>
      }
      error={saveError}
      saving={createMut.isPending}
      saveLabel="Save Kutir"
      onSave={handleSave}
      onCancel={() => navigate(-1)}
    >
      <KutirForm form={form} setForm={setForm} mode="add" />
    </FormPageShell>
  );
}
