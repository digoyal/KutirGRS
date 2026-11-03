import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormPageShell } from "@parivaar/ui";
import {
  createExam,
  listExamTypeSubjects,
  type ExamTypeSubjectRow,
  type StudentExamCreate,
} from "../api/admissions";
import {
  AdmissionForm,
  emptyAdmissionForm,
  admissionPayloadFromForm,
  validateAdmissionForm,
  type AdmissionFormState,
} from "../components/AdmissionForm";
import { subjectsForExamType } from "../components/admissions-pipeline";
import {
  enqueuePendingAdmissionWithMeta,
  getAdmissionDraft,
  removeAdmissionDraft,
} from "../offline/admissionOfflineDb";
import { isNetworkError } from "../offline/networkError";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { ADMISSIONS_FILTER_STORAGE_KEY } from "../constants/admissionsList";
import { consumePersistedFilters, persistFilters } from "../hooks/usePersistedFilters";

function persistListYearAfterCreate(schoolStartYear: number) {
  const prev = consumePersistedFilters<{ year?: number; page?: number }>(ADMISSIONS_FILTER_STORAGE_KEY) ?? {};
  persistFilters(ADMISSIONS_FILTER_STORAGE_KEY, { ...prev, year: schoolStartYear, page: 1 });
}

export default function AdmissionDraftCompletePage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const online = useOnlineStatus();

  const [loadingDraft, setLoadingDraft] = useState(true);
  const [missingDraft, setMissingDraft] = useState(false);
  const [form, setForm] = useState<AdmissionFormState>(() => emptyAdmissionForm());
  const [admitBlockMsg, setAdmitBlockMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftMeta, setDraftMeta] = useState<{ student_label: string; kutir_id: number | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!draftId) {
        setMissingDraft(true);
        setLoadingDraft(false);
        return;
      }
      const draft = await getAdmissionDraft(draftId);
      if (cancelled) return;
      if (!draft) {
        setMissingDraft(true);
        setLoadingDraft(false);
        return;
      }
      setForm({
        ...emptyAdmissionForm(draft.school_start_year),
        student_id: draft.student_id,
        school_start_year: draft.school_start_year,
      });
      setDraftMeta({ student_label: draft.student_label, kutir_id: draft.kutir_id });
      setLoadingDraft(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  const { data: examTypeSubjects = [] } = useQuery<ExamTypeSubjectRow[]>({
    queryKey: ["exam-type-subjects"],
    queryFn: listExamTypeSubjects,
    staleTime: 5 * 60 * 1000,
  });
  const subjectIds = useMemo(
    () => subjectsForExamType(examTypeSubjects, form.exam_type_id).map((s) => s.id),
    [examTypeSubjects, form.exam_type_id],
  );
  const validateOpts = useMemo(() => ({ mode: "add" as const, subjectIds }), [subjectIds]);

  async function handleSave() {
    const validationError = validateAdmissionForm(form, validateOpts);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!draftId || !draftMeta) return;
    setSaving(true);
    setError(null);
    const payload = admissionPayloadFromForm(form) as StudentExamCreate;

    if (online) {
      try {
        await createExam(payload);
        await removeAdmissionDraft(draftId);
        qc.invalidateQueries({ queryKey: ["student-exams"] });
        persistListYearAfterCreate(payload.school_start_year);
        navigate("/admissions", {
          replace: true,
          state: {
            offlineQueued: true,
            offlineMessage: "Admission added successfully.",
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
      await enqueuePendingAdmissionWithMeta(payload, draftMeta);
      await removeAdmissionDraft(draftId);
      persistListYearAfterCreate(payload.school_start_year);
      navigate("/admissions", {
        replace: true,
        state: {
          offlineQueued: true,
          offlineMessage:
            "Admission saved on this device. It appears in the list as Waiting to sync until upload completes.",
        },
      });
    } catch {
      setError("Could not save admission offline. Check browser storage and try again.");
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
          This saved admission is no longer on the device (it may have expired after 7 days).
        </p>
        <button type="button" className="grs-page-back" onClick={() => navigate("/admissions")}>
          Back to admissions
        </button>
      </div>
    );
  }

  return (
    <FormPageShell
      style={{ maxWidth: 640 }}
      header={
        <div className="grs-page-topbar">
          <button type="button" className="grs-page-back" onClick={() => navigate("/admissions")}>
            ← Back
          </button>
          <h2 className="grs-page-title" style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>
            Complete admission
          </h2>
        </div>
      }
      error={error}
      saving={saving}
      saveLabel={online ? "Add Admission" : "Save on device"}
      onSave={handleSave}
      onCancel={() => navigate("/admissions")}
      actionsStyle={{ marginTop: 16 }}
    >
      <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 12px" }}>
        Saved for offline — finish the pipeline for <strong>{draftMeta?.student_label}</strong>, then save when ready.
      </p>
      <AdmissionForm
        form={form}
        setForm={setForm}
        mode="add"
        admitBlockMsg={admitBlockMsg}
        onAdmitBlockMsg={setAdmitBlockMsg}
      />
    </FormPageShell>
  );
}
