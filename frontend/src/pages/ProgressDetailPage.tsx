import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getProgress,
  updateProgress,
  type StudentProgressCreate,
  type ProgressStatus,
} from "../api/admissions";
import { listSchools, type School } from "../api/schools";
import { listStudents } from "../api/students";
import { grs } from "../styles/grs";

const CURRENT_YEAR = new Date().getFullYear();

const STATUS_LABELS: Record<ProgressStatus, string> = {
  enrolled:    "Enrolled",
  transferred: "Transferred",
  dropped_out: "Dropped out",
  graduated:   "Graduated",
};

const STATUS_BADGES: Record<ProgressStatus, { bg: string; fg: string; prefix: string }> = {
  enrolled:    { bg: "var(--status-success-bg)", fg: "var(--status-success-fg)", prefix: "✓ " },
  transferred: { bg: "var(--badge-blue-bg)",     fg: "var(--badge-blue-fg)",     prefix: "→ " },
  dropped_out: { bg: "var(--status-danger-bg)",  fg: "var(--status-danger-fg)",  prefix: "" },
  graduated:   { bg: "var(--badge-green-bg, #d1fae5)", fg: "var(--badge-green-fg, #065f46)", prefix: "🎓 " },
};

export default function ProgressDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const enteredViaEdit = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState(enteredViaEdit);
  const [form, setForm] = useState<Partial<StudentProgressCreate>>({});
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

  const studentMap = new Map(allStudents.map((s: any) => [s.id, s]));

  // Populate form when record loads
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

  function set<K extends keyof StudentProgressCreate>(key: K, val: StudentProgressCreate[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.school_id) { setError("Select a school."); return; }
    setSaving(true);
    setError(null);
    try {
      await updateProgress(Number(id), form);
      qc.invalidateQueries({ queryKey: ["progress"] });
      qc.invalidateQueries({ queryKey: ["progress-record", Number(id)] });
      if (enteredViaEdit) navigate(-1);
      else setEditing(false);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (enteredViaEdit) navigate(-1);
    else { setEditing(false); setError(null); }
  }

  if (isLoading) return <div style={{ padding: 28 }}>Loading…</div>;
  if (!record) return <div style={{ padding: 28 }}>Record not found.</div>;

  const student: any = studentMap.get(record.student_id);
  const studentName = student ? `${student.first_name} ${student.last_name}` : `Student #${record.student_id}`;
  const currentStatus = ((editing ? form.status : record.status) || "enrolled") as ProgressStatus;
  const badge = STATUS_BADGES[currentStatus] ?? STATUS_BADGES.enrolled;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 560 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "1.1rem", padding: 0 }}
        >←</button>
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: 2 }}>Progress Record</div>
          <h2 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>{studentName}</h2>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} style={{ ...grs.btnSecondary, marginLeft: "auto" }}>Edit</button>
        )}
      </div>

      {error && (
        <div style={{ background: "var(--status-danger-bg)", border: "1px solid var(--badge-red-fg)", color: "var(--status-danger-fg)", borderRadius: 6, padding: "8px 12px", fontSize: "0.85rem", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Student */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Student</label>
        {editing ? (
          <div style={{ ...inp, color: "var(--text-secondary)", background: "var(--bg-input)" }}>{studentName}</div>
        ) : (
          <Link to={`/students/${record.student_id}`} style={{ color: "var(--badge-purple-fg)", textDecoration: "none", fontWeight: 600 }}>
            {studentName}
          </Link>
        )}
      </div>

      {/* Year + Class */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Academic Year</label>
          {editing ? (
            <select style={inp} value={form.academic_year ?? record.academic_year} onChange={e => set("academic_year", Number(e.target.value))}>
              {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map(y => (
                <option key={y} value={y}>{y}-{String(y + 1).slice(2)}</option>
              ))}
            </select>
          ) : (
            <div style={inp}>{record.academic_year}-{String(record.academic_year + 1).slice(2)}</div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Class</label>
          {editing ? (
            <select style={inp} value={form.class_in_year ?? ""} onChange={e => set("class_in_year", e.target.value === "" ? null : Number(e.target.value))}>
              <option value="">— select —</option>
              {[6,7,8,9,10,11,12].map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
          ) : (
            <div style={inp}>{record.class_in_year != null ? `Class ${record.class_in_year}` : "—"}</div>
          )}
        </div>
      </div>

      {/* School + Marks% */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>School *</label>
          {editing ? (
            <select style={inp} value={form.school_id ?? ""} onChange={e => set("school_id", Number(e.target.value))}>
              <option value="">— select —</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name} ({s.school_type})</option>)}
            </select>
          ) : (
            <div style={inp}>{(record.school ?? schools.find(s => s.id === record.school_id))?.name ?? "—"}</div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Marks %</label>
          {editing ? (
            <input type="number" min={0} max={100} step={0.1} style={inp}
              value={form.previous_year_percentage ?? ""}
              onChange={e => set("previous_year_percentage", e.target.value === "" ? null : Number(e.target.value))}
            />
          ) : (
            <div style={inp}>
              {record.previous_year_percentage != null ? `${parseFloat(String(record.previous_year_percentage)).toFixed(1)}%` : "—"}
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Status</label>
        {editing ? (
          <select style={inp} value={currentStatus} onChange={e => set("status", e.target.value as ProgressStatus)}>
            <option value="enrolled">Enrolled</option>
            <option value="transferred">Transferred to a different school</option>
            <option value="dropped_out">Dropped out</option>
            <option value="graduated">Graduated</option>
          </select>
        ) : (
          <div>
            <span style={{ background: badge.bg, color: badge.fg, borderRadius: 4, padding: "2px 8px", fontSize: "0.85rem", fontWeight: 600 }}>
              {badge.prefix}{STATUS_LABELS[currentStatus]}
            </span>
            {currentStatus === "transferred" && record.transfer_school && (
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 4 }}>{record.transfer_school}</div>
            )}
            {currentStatus === "dropped_out" && record.exit_reason && (
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 4 }}>{record.exit_reason}</div>
            )}
          </div>
        )}
      </div>

      {/* Conditional status fields (edit mode only) */}
      {editing && currentStatus === "transferred" && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>School Name</label>
          <input style={inp} placeholder="Name of school transferred to"
            value={form.transfer_school ?? ""}
            onChange={e => set("transfer_school", e.target.value || null)}
          />
        </div>
      )}
      {editing && currentStatus === "dropped_out" && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Reason</label>
          <input style={inp} placeholder="Reason for dropping out"
            value={form.exit_reason ?? ""}
            onChange={e => set("exit_reason", e.target.value || null)}
          />
        </div>
      )}

      {/* Remarks */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Remarks</label>
        {editing ? (
          <textarea style={{ ...inp, resize: "vertical" }} rows={2}
            value={form.remarks ?? ""}
            onChange={e => set("remarks", e.target.value || null)}
          />
        ) : (
          <div style={{ ...inp, minHeight: 48, whiteSpace: "pre-wrap" }}>{record.remarks ?? "—"}</div>
        )}
      </div>

      {/* Action buttons */}
      {editing && (
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={handleSave} style={grs.btnPrimary} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button onClick={handleCancel} style={grs.btnSecondary} disabled={saving}>Cancel</button>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.75rem", fontWeight: 600,
  color: "var(--text-secondary)", marginBottom: 3,
};

const inp: React.CSSProperties = {
  width: "100%", border: "1px solid var(--border)", borderRadius: 6,
  padding: "7px 10px", fontSize: "0.875rem", boxSizing: "border-box",
  background: "var(--bg-input)", color: "var(--text-primary)",
};
