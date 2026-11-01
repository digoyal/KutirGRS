import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormPageShell } from "@parivaar/ui";
import { createExamCenter, type ExamCenter } from "../api/geo";
import {
  ExamCenterForm,
  emptyExamCenterForm,
  type ExamCenterFormState,
} from "../components/ExamCenterForm";

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
    <FormPageShell
      header={
        <div className="grs-page-topbar">
          <button type="button" className="grs-page-back" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h2 className="grs-page-title" style={{ margin: 0, fontSize: 20 }}>
            Add Exam Center
          </h2>
        </div>
      }
      error={saveError}
      saving={createMut.isPending}
      saveLabel="Save Exam Center"
      onSave={handleSave}
      onCancel={() => navigate(-1)}
    >
      <ExamCenterForm form={form} setForm={setForm} mode="add" />
    </FormPageShell>
  );
}
