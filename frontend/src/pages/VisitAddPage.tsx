import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createVisit, uploadVisitPhoto } from "../api/visits";
import { VisitForm, emptyVisitForm, type VisitFormState } from "../components/VisitForm";
import { grs } from "../styles/grs";

export default function VisitAddPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<VisitFormState>(emptyVisitForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!form.kutir_id) {
      setError("Please select a kutir.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await createVisit(form);
      if (photoFile) await uploadVisitPhoto(saved.id, photoFile);
      navigate(-1);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Save failed. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="grs-page" style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
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
          Log New Visit
        </h2>
      </div>

      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: 8,
          padding: "16px 20px",
          border: "1px solid var(--border)",
        }}
      >
        {error && <div style={grs.errorBox}>{error}</div>}

        <VisitForm
          form={form}
          setForm={setForm}
          mode="add"
          photoFile={photoFile}
          setPhotoFile={setPhotoFile}
        />

        <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => navigate(-1)} style={grs.btnSecondary} disabled={saving}>
            Cancel
          </button>
          <button onClick={handleSave} style={grs.btnPrimary} disabled={saving}>
            {saving ? "Saving…" : "Log Visit"}
          </button>
        </div>
      </div>
    </div>
  );
}
