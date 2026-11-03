import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormPageActions, FormPageShell } from "@parivaar/ui";
import {
  createExam,
  listExamTypeSubjects,
  type ExamTypeSubjectRow,
  type StudentExamCreate,
} from "../api/admissions";
import { getStudent } from "../api/students";
import { subjectsForExamType } from "../components/admissions-pipeline";
import {
  AdmissionForm,
  emptyAdmissionForm,
  admissionPayloadFromForm,
  validateAdmissionForm,
  type AdmissionFormState,
} from "../components/AdmissionForm";
import { ADMISSIONS_FILTER_STORAGE_KEY } from "../constants/admissionsList";
import { consumePersistedFilters, persistFilters } from "../hooks/usePersistedFilters";
import { grs } from "../styles/grs";
import {
  enqueuePendingAdmissionWithMeta,
  saveAdmissionDraft,
} from "../offline/admissionOfflineDb";
import { isNetworkError } from "../offline/networkError";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { studentLabel } from "../utils/studentLabel";

const CURRENT_YEAR = new Date().getFullYear();

type AdmissionsFilterSnapshot = {
  year?: number;
  district?: number | "";
  cluster?: number | "";
  kutir?: number | "";
  search?: string;
  page?: number;
};

function persistListYearAfterCreate(schoolStartYear: number) {
  const prev =
    consumePersistedFilters<AdmissionsFilterSnapshot>(ADMISSIONS_FILTER_STORAGE_KEY) ?? {};
  persistFilters(ADMISSIONS_FILTER_STORAGE_KEY, {
    ...prev,
    year: schoolStartYear,
    page: 1,
  });
}

export default function AdmissionAddPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const online = useOnlineStatus();

  const initYear = Number(searchParams.get("year")) || CURRENT_YEAR;
  const [form, setForm] = useState<AdmissionFormState>(() => emptyAdmissionForm(initYear));
  const [admitBlockMsg, setAdmitBlockMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: examTypeSubjects = [] } = useQuery<ExamTypeSubjectRow[]>({
    queryKey: ["exam-type-subjects"],
    queryFn: listExamTypeSubjects,
    staleTime: 5 * 60 * 1000,
  });
  const subjectIds = useMemo(
    () => subjectsForExamType(examTypeSubjects, form.exam_type_id).map((s) => s.id),
    [examTypeSubjects, form.exam_type_id],
  );
  const validateOpts = useMemo(
    () => ({ mode: "add" as const, subjectIds }),
    [subjectIds],
  );

  async function resolveStudentMeta() {
    if (!form.student_id) return null;
    const s = await getStudent(form.student_id);
    return {
      student_label: studentLabel(s),
      kutir_id: s.kutir_id,
    };
  }

  async function handleSaveForOffline() {
    if (!form.student_id) {
      setSaveError("Select a student to save for offline.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const meta = await resolveStudentMeta();
      if (!meta) {
        setSaveError("Could not load student details.");
        setSaving(false);
        return;
      }
      await saveAdmissionDraft(
        form.student_id,
        form.school_start_year,
        meta.student_label,
        meta.kutir_id,
      );
      navigate("/admissions", {
        state: {
          offlineQueued: true,
          offlineMessage: "Admission saved for offline. Open it from the list to complete the form.",
        },
      });
    } catch (e: unknown) {
      if (isNetworkError(e) && form.student_id) {
        await saveAdmissionDraft(
          form.student_id,
          form.school_start_year,
          `Student #${form.student_id}`,
          null,
        );
        navigate("/admissions", {
          state: {
            offlineQueued: true,
            offlineMessage: "Admission saved for offline. Open it from the list to complete the form.",
          },
        });
        return;
      }
      setSaveError("Could not save on this device. Check browser storage and try again.");
      setSaving(false);
    }
  }

  async function handleSave() {
    const validationError = validateAdmissionForm(form, validateOpts);
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    setSaveError(null);
    setSaving(true);
    const payload = admissionPayloadFromForm(form) as StudentExamCreate;

    if (online) {
      try {
        await createExam(payload);
        qc.invalidateQueries({ queryKey: ["student-exams"] });
        persistListYearAfterCreate(payload.school_start_year);
        navigate("/admissions", { replace: true });
        return;
      } catch (e: unknown) {
        if (!isNetworkError(e)) {
          const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
          setSaveError(detail ?? "Save failed.");
          setSaving(false);
          return;
        }
      }
    }

    try {
      const meta = (await resolveStudentMeta()) ?? {
        student_label: `Student #${form.student_id}`,
        kutir_id: null as number | null,
      };
      await enqueuePendingAdmissionWithMeta(payload, meta);
      persistListYearAfterCreate(payload.school_start_year);
      navigate("/admissions", {
        state: {
          offlineQueued: true,
          offlineMessage:
            "Admission saved on this device. It appears in the list as Waiting to sync until upload completes.",
        },
      });
    } catch {
      setSaveError("Could not save admission offline. Check browser storage and try again.");
      setSaving(false);
    }
  }

  return (
    <FormPageShell
      style={{ maxWidth: 640 }}
      header={
        <div className="grs-page-topbar">
          <button type="button" className="grs-page-back" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h2 className="grs-page-title" style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>
            Add Admission
          </h2>
        </div>
      }
      showActions={false}
    >
      <AdmissionForm
        form={form}
        setForm={setForm}
        mode="add"
        admitBlockMsg={admitBlockMsg}
        onAdmitBlockMsg={setAdmitBlockMsg}
      />
      <FormPageActions
        error={saveError}
        saving={saving}
        saveLabel={online ? "Add Admission" : "Save on device"}
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
