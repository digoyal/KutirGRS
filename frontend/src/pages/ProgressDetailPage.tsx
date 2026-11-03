import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormPageShell } from "@parivaar/ui";
import { getProgress, updateProgress } from "../api/admissions";
import { listSchools, type School } from "../api/schools";
import { listStudents } from "../api/students";
import {
  ProgressForm,
  emptyProgressForm,
  progressToFormState,
  progressUpdatePayloadFromForm,
  type ProgressFormState,
} from "../components/ProgressForm";
import { grs } from "../styles/grs";
import { studentLabel } from "../utils/studentLabel";

export default function ProgressDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const enteredViaEdit = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState(enteredViaEdit);
  const [form, setForm] = useState<ProgressFormState>(() => emptyProgressForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: record, isLoading } = useQuery({
    queryKey: ["progress-record", Number(id)],
    queryFn: () => getProgress(Number(id)),
  });

  const { data: schools = [] } = useQuery<School[]>({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
  });

  const { data: allStudents = [] } = useQuery({
    queryKey: ["students-names"],
    queryFn: () => listStudents({ name_only: true }),
  });

  const studentMap = new Map(allStudents.map((s: { id: number }) => [s.id, s]));

  useEffect(() => {
    if (!record) return;
    setForm(progressToFormState(record));
  }, [record]);

  async function handleSave() {
    if (!form.school_id) {
      setError("Select a school.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProgress(Number(id), progressUpdatePayloadFromForm(form));
      qc.invalidateQueries({ queryKey: ["progress"] });
      qc.invalidateQueries({ queryKey: ["progress-record", Number(id)] });
      if (enteredViaEdit) navigate(-1);
      else setEditing(false);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (enteredViaEdit) navigate(-1);
    else {
      setEditing(false);
      setError(null);
      if (record) setForm(progressToFormState(record));
    }
  }

  if (isLoading) return <div style={{ padding: 28 }}>Loading…</div>;
  if (!record) return <div style={{ padding: 28 }}>Record not found.</div>;

  const student = studentMap.get(record.student_id) as
    | { first_name: string; last_name: string; father_name?: string | null }
    | undefined;
  const studentName = studentLabel(student, `Student #${record.student_id}`);
  const schoolName =
    (record.school ?? schools.find((s) => s.id === record.school_id))?.name ?? "—";

  return (
    <FormPageShell
      showActions={editing}
      style={{ padding: "24px 28px", maxWidth: 560 }}
      header={
        <div className="grs-page-topbar">
          <button type="button" className="grs-page-back" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div className="grs-page-title" style={{ minWidth: 0 }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: 2 }}>
              Progress Record
            </div>
            <h2 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>
              {studentName}
            </h2>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              style={{ ...grs.btnSecondary, marginLeft: "auto" }}
            >
              Edit
            </button>
          )}
        </div>
      }
      error={error}
      saving={saving}
      saveLabel="Save Changes"
      onSave={handleSave}
      onCancel={handleCancel}
      actionsStyle={{ marginTop: 20 }}
    >
      <ProgressForm
        form={form}
        setForm={setForm}
        mode={editing ? "edit" : "view"}
        studentName={studentName}
        schoolName={schoolName}
      />
    </FormPageShell>
  );
}
