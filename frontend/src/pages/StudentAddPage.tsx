import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FormPageActions, FormPageShell } from "@parivaar/ui";
import { createStudent } from "../api/students";
import {
  StudentForm,
  emptyStudentForm,
  type StudentFormState,
} from "../components/StudentForm";
import { grs } from "../styles/grs";
import { enqueuePendingStudent, saveStudentDraft } from "../offline/studentOfflineDb";
import { isNetworkError } from "../offline/networkError";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

export default function StudentAddPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const [form, setForm] = useState<StudentFormState>(emptyStudentForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveForOffline() {
    if (!form.kutir_id) {
      setError("Select a kutir to save for offline.");
      return;
    }
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First and last name are required to save for offline.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveStudentDraft(form.kutir_id, form.first_name, form.last_name);
      navigate("/students", {
        state: {
          offlineQueued: true,
          offlineMessage: "Student saved for offline. Open them from the list to complete the form.",
        },
      });
    } catch {
      setError("Could not save on this device. Check browser storage and try again.");
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First and last name are required");
      return;
    }
    setSaving(true);
    setError(null);

    if (online) {
      try {
        await createStudent(form);
        qc.invalidateQueries({ queryKey: ["students"] });
        navigate(-1);
        return;
      } catch (e: unknown) {
        if (!isNetworkError(e)) {
          const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
          setError(detail ?? "Failed to create student");
          setSaving(false);
          return;
        }
      }
    }

    try {
      await enqueuePendingStudent(form);
      navigate("/students", {
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

  return (
    <FormPageShell
      header={
        <div className="grs-page-topbar">
          <button type="button" className="grs-page-back" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h2 className="grs-page-title" style={{ margin: 0, fontSize: 20, color: "var(--text-primary)" }}>
            Add Student
          </h2>
        </div>
      }
      showActions={false}
    >
      <StudentForm form={form} setForm={setForm} mode="add" />
      <FormPageActions
        error={error}
        saving={saving}
        saveLabel={online ? "Add Student" : "Save on device"}
        onSave={handleSave}
        onCancel={() => navigate(-1)}
        secondaryActions={
          online ? (
            <button type="button" onClick={handleSaveForOffline} style={grs.btnSecondary} disabled={saving}>
              Save for offline
            </button>
          ) : undefined
        }
        actionsStyle={{ marginTop: 16, flexWrap: "wrap", gap: 8 }}
      />
    </FormPageShell>
  );
}
