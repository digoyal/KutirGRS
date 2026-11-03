import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormPageActions, FormPageShell } from "@parivaar/ui";
import { createProgress } from "../api/admissions";
import { getStudent } from "../api/students";
import { listSchools } from "../api/schools";
import {
  ProgressForm,
  emptyProgressForm,
  type ProgressFormState,
} from "../components/ProgressForm";
import { grs } from "../styles/grs";
import {
  enqueuePendingProgressWithMeta,
  saveProgressDraft,
} from "../offline/progressOfflineDb";
import { isNetworkError } from "../offline/networkError";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { studentLabel } from "../utils/studentLabel";

const CURRENT_YEAR = new Date().getFullYear();

export default function ProgressAddPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const initialYear = Number(searchParams.get("year") || CURRENT_YEAR);

  const [form, setForm] = useState<ProgressFormState>(() => emptyProgressForm(initialYear));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: schools = [] } = useQuery({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
  });

  async function resolveMeta() {
    const school = schools.find((s) => s.id === form.school_id);
    let student_label = `Student #${form.student_id}`;
    let kutir_id: number | null = null;
    if (form.student_id) {
      try {
        const s = await getStudent(form.student_id);
        student_label = studentLabel(s);
        kutir_id = s.kutir_id;
      } catch {
        /* use fallback label */
      }
    }
    return {
      student_label,
      school_name: school?.name ?? `School #${form.school_id}`,
      kutir_id,
    };
  }

  async function handleSaveForOffline() {
    if (!form.student_id) {
      setError("Select a student to save for offline.");
      return;
    }
    if (!form.school_id) {
      setError("Select a school to save for offline.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const meta = await resolveMeta();
      await saveProgressDraft(
        form.student_id,
        form.school_id,
        form.academic_year,
        meta.student_label,
        meta.school_name,
        meta.kutir_id,
      );
      navigate("/progress", {
        state: {
          offlineQueued: true,
          offlineMessage: "Progress saved for offline. Open it from the list to complete the form.",
        },
      });
    } catch {
      setError("Could not save on this device. Check browser storage and try again.");
      setSaving(false);
    }
  }

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

    if (online) {
      try {
        await createProgress(form);
        qc.invalidateQueries({ queryKey: ["progress"] });
        navigate(-1);
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
      const meta = await resolveMeta();
      await enqueuePendingProgressWithMeta(form, meta);
      navigate("/progress", {
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
      showActions={false}
    >
      <ProgressForm form={form} setForm={setForm} mode="add" />
      <FormPageActions
        error={error}
        saving={saving}
        saveLabel={online ? "Add Record" : "Save on device"}
        onSave={handleSave}
        onCancel={() => navigate(-1)}
        secondaryActions={
          online ? (
            <button type="button" onClick={handleSaveForOffline} style={grs.btnSecondary} disabled={saving}>
              Save for offline
            </button>
          ) : undefined
        }
        actionsStyle={{ marginTop: 20, flexWrap: "wrap", gap: 8 }}
      />
    </FormPageShell>
  );
}
