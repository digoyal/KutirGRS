import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createProgress } from "../api/admissions";
import {
  ProgressForm,
  emptyProgressForm,
  type ProgressFormState,
} from "../components/ProgressForm";
import { grs } from "../styles/grs";

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
    <div className="grs-page" style={{ padding: "24px 28px", maxWidth: 560, width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            fontSize: "1.1rem",
            padding: 0,
          }}
        >
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>
          Add Progress Record
        </h2>
      </div>

      {error && (
        <div
          style={{
            background: "var(--status-danger-bg)",
            border: "1px solid var(--badge-red-fg)",
            color: "var(--status-danger-fg)",
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: "0.85rem",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <ProgressForm form={form} setForm={setForm} mode="add" />

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button onClick={handleSave} style={grs.btnPrimary} disabled={saving}>
          {saving ? "Saving…" : "Add Record"}
        </button>
        <button onClick={() => navigate(-1)} style={grs.btnSecondary} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}
