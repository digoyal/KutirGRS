import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FormPageShell } from "@parivaar/ui";
import { createProgress } from "../api/admissions";
import {
  ProgressForm,
  emptyProgressForm,
  type ProgressFormState,
} from "../components/ProgressForm";
import {
  enqueuePendingProgressWithMeta,
  getProgressDraft,
  removeProgressDraft,
} from "../offline/progressOfflineDb";
import { isNetworkError } from "../offline/networkError";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

export default function ProgressDraftCompletePage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const online = useOnlineStatus();

  const [loadingDraft, setLoadingDraft] = useState(true);
  const [missingDraft, setMissingDraft] = useState(false);
  const [form, setForm] = useState<ProgressFormState>(() => emptyProgressForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftMeta, setDraftMeta] = useState<{
    student_label: string;
    school_name: string;
    kutir_id: number | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!draftId) {
        setMissingDraft(true);
        setLoadingDraft(false);
        return;
      }
      const draft = await getProgressDraft(draftId);
      if (cancelled) return;
      if (!draft) {
        setMissingDraft(true);
        setLoadingDraft(false);
        return;
      }
      setForm({
        ...emptyProgressForm(draft.academic_year),
        student_id: draft.student_id,
        school_id: draft.school_id,
        academic_year: draft.academic_year,
      });
      setDraftMeta({
        student_label: draft.student_label,
        school_name: draft.school_name,
        kutir_id: draft.kutir_id,
      });
      setLoadingDraft(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  async function handleSave() {
    if (!form.student_id) {
      setError("Select a student.");
      return;
    }
    if (!form.school_id) {
      setError("Select a school.");
      return;
    }
    if (!draftId || !draftMeta) return;
    setSaving(true);
    setError(null);

    if (online) {
      try {
        await createProgress(form);
        await removeProgressDraft(draftId);
        qc.invalidateQueries({ queryKey: ["progress"] });
        navigate("/progress", {
          replace: true,
          state: {
            offlineQueued: true,
            offlineMessage: "Progress record added successfully.",
          },
        });
        return;
      } catch (e: unknown) {
        if (!isNetworkError(e)) {
          const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
          setError(detail ?? "Save failed.");
          setSaving(false);
          return;
        }
      }
    }

    try {
      await enqueuePendingProgressWithMeta(form, draftMeta);
      await removeProgressDraft(draftId);
      navigate("/progress", {
        replace: true,
        state: {
          offlineQueued: true,
          offlineMessage:
            "Progress saved on this device. It appears in the list as Waiting to sync until upload completes.",
        },
      });
    } catch {
      setError("Could not save progress offline. Check browser storage and try again.");
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
          This saved progress record is no longer on the device (it may have expired after 7 days).
        </p>
        <button type="button" className="grs-page-back" onClick={() => navigate("/progress")}>
          Back to progress
        </button>
      </div>
    );
  }

  return (
    <FormPageShell
      style={{ padding: "24px 28px", maxWidth: 560 }}
      header={
        <div className="grs-page-topbar">
          <button type="button" className="grs-page-back" onClick={() => navigate("/progress")}>
            ← Back
          </button>
          <h2 className="grs-page-title" style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>
            Complete progress record
          </h2>
        </div>
      }
      error={error}
      saving={saving}
      saveLabel={online ? "Add Record" : "Save on device"}
      onSave={handleSave}
      onCancel={() => navigate("/progress")}
      actionsStyle={{ marginTop: 20 }}
    >
      <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 12px" }}>
        Saved for offline — finish the record for <strong>{draftMeta?.student_label}</strong> at{" "}
        <strong>{draftMeta?.school_name}</strong>.
      </p>
      <ProgressForm form={form} setForm={setForm} mode="add" />
    </FormPageShell>
  );
}
