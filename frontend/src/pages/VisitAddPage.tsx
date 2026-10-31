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
    <div
      className="grs-page visit-add-page"
      style={{ maxWidth: 720, width: "100%", boxSizing: "border-box", padding: "16px 20px" }}
    >
      <div className="grs-page-topbar visit-add-topbar">
        <button type="button" className="grs-page-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h2 className="grs-page-title" style={{ margin: 0, fontSize: 20, color: "var(--text-primary)" }}>
          Log New Visit
        </h2>
      </div>

      <div className="visit-add-card">
        {error && <div style={grs.errorBox}>{error}</div>}

        <VisitForm
          form={form}
          setForm={setForm}
          mode="add"
          photoFile={photoFile}
          setPhotoFile={setPhotoFile}
        />

        <div className="visit-form-actions">
          <button type="button" onClick={() => navigate(-1)} style={grs.btnSecondary} disabled={saving}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} style={grs.btnPrimary} disabled={saving}>
            {saving ? "Saving…" : "Log Visit"}
          </button>
        </div>
      </div>
    </div>
  );
}
