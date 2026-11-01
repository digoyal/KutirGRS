import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FormPageShell } from "@parivaar/ui";
import { createProgress } from "../api/admissions";
import {
  ProgressForm,
  emptyProgressForm,
  type ProgressFormState,
} from "../components/ProgressForm";

const CURRENT_YEAR = new Date().getFullYear();

export default function ProgressAddPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialYear = Number(searchParams.get("year") || CURRENT_YEAR);

  const [form, setForm] = useState<ProgressFormState>(() => emptyProgressForm(initialYear));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!form.student_id) {
      setError("Select a student.");
      return;
    }
    if (!form.school_id) {
      setError("Select a school.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createProgress(form);
      navigate(-1);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Save failed.");
      setSaving(false);
    }
  }

  return (
    <FormPageShell
      style={{ padding: "24px 28px", maxWidth: 560 }}
      header={
        <div className="grs-page-topbar">
          <button type="button" className="grs-page-back" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h2 className="grs-page-title" style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>
            Add Progress Record
          </h2>
        </div>
      }
      error={error}
      saving={saving}
      saveLabel="Add Record"
      onSave={handleSave}
      onCancel={() => navigate(-1)}
      actionsStyle={{ marginTop: 20 }}
    >
      <ProgressForm form={form} setForm={setForm} mode="add" />
    </FormPageShell>
  );
}
