import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FormPageShell } from "@parivaar/ui";
import { createStudent } from "../api/students";
import {
  StudentForm,
  emptyStudentForm,
  type StudentFormState,
} from "../components/StudentForm";
import {
  enqueuePendingStudent,
  getStudentDraft,
  removeStudentDraft,
} from "../offline/studentOfflineDb";
import { isNetworkError } from "../offline/networkError";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

export default function StudentDraftCompletePage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const online = useOnlineStatus();

  const [loadingDraft, setLoadingDraft] = useState(true);
  const [missingDraft, setMissingDraft] = useState(false);
  const [form, setForm] = useState<StudentFormState>(emptyStudentForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!draftId) {
        setMissingDraft(true);
        setLoadingDraft(false);
        return;
      }
      const draft = await getStudentDraft(draftId);
      if (cancelled) return;
      if (!draft) {
        setMissingDraft(true);
        setLoadingDraft(false);
        return;
      }
      setForm({
        ...emptyStudentForm(),
        kutir_id: draft.kutir_id,
        first_name: draft.first_name,
        last_name: draft.last_name,
      });
      setLoadingDraft(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First and last name are required");
      return;
    }
    if (!draftId) return;
    setSaving(true);
    setError(null);

    if (online) {
      try {
        await createStudent(form);
        await removeStudentDraft(draftId);
        qc.invalidateQueries({ queryKey: ["students"] });
        navigate("/students", {
          replace: true,
          state: {
            offlineQueued: true,
            offlineMessage: "Student added successfully.",
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
      await enqueuePendingStudent(form);
      await removeStudentDraft(draftId);
      navigate("/students", {
        replace: true,
        state: {
          offlineQueued: true,
          offlineMessage:
            "Student saved on this device. They appear in the list as Waiting to sync until upload completes.",
        },
      });
    } catch {
      setError("Could not save student offline. Check browser storage and try again.");
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
          This saved student is no longer on the device (it may have expired after 7 days).
        </p>
        <button type="button" className="grs-page-back" onClick={() => navigate("/students")}>
          Back to students
        </button>
      </div>
    );
  }

  return (
    <FormPageShell
      header={
        <div className="grs-page-topbar">
          <button type="button" className="grs-page-back" onClick={() => navigate("/students")}>
            ← Back
          </button>
          <h2 className="grs-page-title" style={{ margin: 0, fontSize: 20, color: "var(--text-primary)" }}>
            Complete student
          </h2>
        </div>
      }
      error={error}
      saving={saving}
      saveLabel={online ? "Add Student" : "Save on device"}
      onSave={handleSave}
      onCancel={() => navigate("/students")}
    >
      <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 12px" }}>
        Saved for offline — fill in the rest of the profile, then save when you are ready.
      </p>
      <StudentForm form={form} setForm={setForm} mode="add" />
    </FormPageShell>
  );
}
