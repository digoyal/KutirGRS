import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormPageShell } from "@parivaar/ui";
import { createSchool } from "../api/schools";
import { SchoolForm, emptySchoolForm, type SchoolFormState } from "../components/SchoolForm";

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
    <FormPageShell
      header={
        <div className="grs-page-topbar">
          <button type="button" className="grs-page-back" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h2 className="grs-page-title" style={{ margin: 0, fontSize: 20 }}>
            Add School
          </h2>
        </div>
      }
      error={saveError}
      saving={createMut.isPending}
      saveLabel="Save School"
      onSave={handleSave}
      onCancel={() => navigate(-1)}
    >
      <SchoolForm form={form} setForm={setForm} mode="add" />
    </FormPageShell>
  );
}
