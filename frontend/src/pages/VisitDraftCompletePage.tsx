import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormPageActions, FormPageShell } from "@parivaar/ui";
import { createVisit, uploadVisitPhoto } from "../api/visits";
import { listKutirs } from "../api/kutirs";
import { VisitForm, emptyVisitForm, type VisitFormState } from "../components/VisitForm";
import { grs } from "../styles/grs";
import {
  enqueuePendingVisit,
  getVisitDraft,
  removeVisitDraft,
} from "../offline/visitOfflineDb";
import { isNetworkError } from "../offline/networkError";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import type { VisitPhotoLocation } from "../utils/visitPhotoGeolocation";
import { validateVisitPhotoForSave } from "../utils/visitPhotoSaveValidation";

export default function VisitDraftCompletePage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const { data: kutirs = [] } = useQuery({
    queryKey: ["kutirs"],
    queryFn: () => listKutirs(),
  });

  const [loadingDraft, setLoadingDraft] = useState(true);
  const [missingDraft, setMissingDraft] = useState(false);
  const [form, setForm] = useState<VisitFormState>(emptyVisitForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoLocation, setPhotoLocation] = useState<VisitPhotoLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!draftId) {
        setMissingDraft(true);
        setLoadingDraft(false);
        return;
      }
      const draft = await getVisitDraft(draftId);
      if (cancelled) return;
      if (!draft) {
        setMissingDraft(true);
        setLoadingDraft(false);
        return;
      }
      setForm({ ...emptyVisitForm(), kutir_id: draft.kutir_id, visit_date: draft.visit_date });
      setLoadingDraft(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  async function handleSave() {
    if (!form.kutir_id || !draftId) {
      setError("Please select a kutir.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaveWarning(null);

    const photoCheck = validateVisitPhotoForSave(photoFile, photoLocation, form.kutir_id, kutirs);
    if (photoCheck.error) {
      setError(photoCheck.error);
      setSaving(false);
      return;
    }
    if (photoCheck.warning) {
      setSaveWarning(photoCheck.warning);
    }

    if (online) {
      try {
        const saved = await createVisit(form);
        if (photoFile && photoLocation) {
          await uploadVisitPhoto(saved.id, photoFile, photoLocation);
        }
        await removeVisitDraft(draftId);
        qc.invalidateQueries({ queryKey: ["visits"] });
        navigate("/visits/detail", {
          replace: true,
          state: {
            offlineVisitQueued: true,
            offlineVisitMessage: "Visit logged successfully.",
          },
        });
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
      await removeVisitDraft(draftId);
      navigate("/visits/detail", {
        replace: true,
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

  if (loadingDraft) {
    return <div style={{ padding: 32, color: "var(--text-secondary)" }}>Loading…</div>;
  }

  if (missingDraft) {
    return (
      <div className="grs-page" style={{ padding: 24 }}>
        <p style={{ color: "var(--text-secondary)" }}>
          This saved visit is no longer on the device (it may have expired after 7 days).
        </p>
        <button type="button" style={grs.btnSecondary} onClick={() => navigate("/visits/detail")}>
          Back to visits
        </button>
      </div>
    );
  }

  return (
    <FormPageShell
      className="grs-page visit-add-page"
      style={{ maxWidth: 720, padding: "12px 16px" }}
      header={
        <div className="grs-page-topbar visit-add-topbar">
          <button type="button" className="grs-page-back" onClick={() => navigate("/visits/detail")}>
            ← Back
          </button>
          <h2 className="grs-page-title" style={{ margin: 0, fontSize: 20, color: "var(--text-primary)" }}>
            Complete visit
          </h2>
        </div>
      }
      showActions={false}
    >
      <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "8px 0 12px" }}>
        Saved for offline — fill in the rest of the visit, then log it when you are ready.
      </p>

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

        {saveWarning && !error && (
          <p style={{ fontSize: 14, color: "var(--warning-text, #a16207)", margin: "0 0 8px" }}>
            {saveWarning}
          </p>
        )}

        <FormPageActions
          error={error}
          saving={saving}
          saveLabel={online ? "Log Visit" : "Save on device"}
          onSave={handleSave}
          onCancel={() => navigate("/visits/detail")}
          actionsClassName="visit-form-actions"
        />
      </div>
    </FormPageShell>
  );
}
