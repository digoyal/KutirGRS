import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormPageActions, FormPageShell } from "@parivaar/ui";
import { createVisit, uploadVisitPhoto } from "../api/visits";
import { VisitForm, emptyVisitForm, type VisitFormState } from "../components/VisitForm";
import { grs } from "../styles/grs";
import { enqueuePendingVisit, saveVisitDraft } from "../offline/visitOfflineDb";
import { isNetworkError } from "../offline/networkError";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import type { VisitPhotoLocation } from "../utils/visitPhotoGeolocation";

export default function VisitAddPage() {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [form, setForm] = useState<VisitFormState>(emptyVisitForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoLocation, setPhotoLocation] = useState<VisitPhotoLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveForOffline() {
    if (!form.kutir_id) {
      setError("Select a kutir to save for offline.");
      return;
    }
    if (!form.visit_date) {
      setError("Select a visit date.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveVisitDraft(form.kutir_id, form.visit_date);
      navigate("/visits/detail", {
        state: {
          offlineVisitQueued: true,
          offlineVisitMessage: "Visit saved for offline. Open it from the list to complete the form.",
        },
      });
    } catch {
      setError("Could not save on this device. Check browser storage and try again.");
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!form.kutir_id) {
      setError("Please select a kutir.");
      return;
    }
    setSaving(true);
    setError(null);

    if (online) {
      try {
        const saved = await createVisit(form);
        if (photoFile) await uploadVisitPhoto(saved.id, photoFile, photoLocation);
        navigate(-1);
        return;
      } catch (e: unknown) {
        if (!isNetworkError(e)) {
          const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
          setError(detail ?? "Save failed. Please try again.");
          setSaving(false);
          return;
        }
      }
    }

    try {
      await enqueuePendingVisit(form, photoFile, photoLocation);
      navigate("/visits/detail", {
        state: {
          offlineVisitQueued: true,
          offlineVisitMessage:
            "Visit saved on this device. It appears in the list as Waiting to sync until upload completes.",
        },
      });
    } catch {
      setError("Could not save visit offline. Check browser storage and try again.");
      setSaving(false);
    }
  }

  return (
    <FormPageShell
      className="grs-page visit-add-page"
      style={{ maxWidth: 720, padding: "12px 16px" }}
      header={
        <div className="grs-page-topbar visit-add-topbar">
          <button type="button" className="grs-page-back" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h2 className="grs-page-title" style={{ margin: 0, fontSize: 20, color: "var(--text-primary)" }}>
            Log New Visit
          </h2>
        </div>
      }
      showActions={false}
    >
      <div className="visit-add-card">
        <VisitForm
          form={form}
          setForm={setForm}
          mode="add"
          photoFile={photoFile}
          setPhotoFile={setPhotoFile}
          photoLocation={photoLocation}
          setPhotoLocation={setPhotoLocation}
        />

        <FormPageActions
          error={error}
          saving={saving}
          saveLabel={online ? "Log Visit" : "Save on device"}
          onSave={handleSave}
          onCancel={() => navigate(-1)}
          secondaryActions={
            online ? (
              <button type="button" onClick={handleSaveForOffline} style={grs.btnSecondary} disabled={saving}>
                Save for offline
              </button>
            ) : undefined
          }
          actionsClassName="visit-form-actions"
          actionsStyle={{ flexWrap: "wrap", gap: 8 }}
        />
      </div>
    </FormPageShell>
  );
}
