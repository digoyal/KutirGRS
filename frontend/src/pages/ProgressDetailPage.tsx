import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProgress, updateProgress, type StudentProgressCreate } from "../api/admissions";
import { listSchools, type School } from "../api/schools";
import { listStudents } from "../api/students";
import {
  ProgressForm,
  emptyProgressForm,
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
  const [form, setForm] = useState<ProgressFormState>(emptyProgressForm);
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
    setForm({
      student_id: record.student_id,
      school_id: record.school_id,
      academic_year: record.academic_year,
      class_in_year: record.class_in_year,
      status: record.status,
      transfer_school: record.transfer_school,
      exit_reason: record.exit_reason,
      previous_year_percentage: record.previous_year_percentage,
      remarks: record.remarks,
    });
  }, [record]);

  async function handleSave() {
    if (!form.school_id) {
      setError("Select a school.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<StudentProgressCreate> = { ...form };
      await updateProgress(Number(id), payload);
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
      if (record) {
        setForm({
          student_id: record.student_id,
          school_id: record.school_id,
          academic_year: record.academic_year,
          class_in_year: record.class_in_year,
          status: record.status,
          transfer_school: record.transfer_school,
          exit_reason: record.exit_reason,
          previous_year_percentage: record.previous_year_percentage,
          remarks: record.remarks,
        });
      }
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
    <div className="grs-page" style={{ padding: "24px 28px", maxWidth: 560, width: "100%", boxSizing: "border-box" }}>
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

      {error && (
        <div
          style={{
            background: "var(--status-danger-bg)",
            border: "1px solid var(--badge-red-fg)",
            color: "var(--status-danger-fg)",
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: "0.85rem",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <ProgressForm
        form={form}
        setForm={setForm}
        mode={editing ? "edit" : "view"}
        studentName={studentName}
        schoolName={schoolName}
      />

      {editing && (
        <div className="grs-form-actions" style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={handleSave} style={grs.btnPrimary} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button onClick={handleCancel} style={grs.btnSecondary} disabled={saving}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
