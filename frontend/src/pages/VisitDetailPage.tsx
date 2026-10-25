import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getVisit, updateVisit, deleteVisit, uploadVisitPhoto } from "../api/visits";
import { listKutirs } from "../api/kutirs";
import { useAuth } from "../context/AuthContext";
import { grs } from "../styles/grs";
import { canManageVisits as roleCanManageVisits } from "../constants/roles";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  VisitForm,
  emptyVisitForm,
  visitFormFromVisit,
  type VisitFormState,
} from "../components/VisitForm";

export default function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const enteredViaEdit = searchParams.get("edit") === "1";
  const canManageVisits = roleCanManageVisits(user?.title);

  const [editing, setEditing] = useState(enteredViaEdit);
  const [form, setForm] = useState<VisitFormState>(emptyVisitForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: visit, isLoading } = useQuery({
    queryKey: ["visit-record", Number(id)],
    queryFn: () => getVisit(Number(id)),
    enabled: !!id,
  });

  const { data: kutirs = [] } = useQuery({
    queryKey: ["kutirs"],
    queryFn: () => listKutirs(),
  });

  useEffect(() => {
    if (!visit) return;
    setForm(visitFormFromVisit(visit));
  }, [visit]);

  async function handleSave() {
    if (!form.kutir_id) {
      setError("Please select a kutir.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await updateVisit(Number(id), form);
      if (photoFile) await uploadVisitPhoto(saved.id, photoFile);
      qc.invalidateQueries({ queryKey: ["visits"] });
      qc.invalidateQueries({ queryKey: ["visit-record", Number(id)] });
      if (enteredViaEdit) navigate(-1);
      else {
        setEditing(false);
        setPhotoFile(null);
      }
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (enteredViaEdit) navigate(-1);
    else {
      setEditing(false);
      setError(null);
      setPhotoFile(null);
      if (visit) setForm(visitFormFromVisit(visit));
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteVisit(Number(id));
      qc.invalidateQueries({ queryKey: ["visits"] });
      navigate(-1);
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  }

  if (isLoading || !visit) {
    return <div style={{ padding: 32, color: "var(--text-secondary)" }}>Loading…</div>;
  }

  const kutirName =
    kutirs.find((k) => k.id === visit.kutir_id)?.name ?? `Kutir #${visit.kutir_id}`;

  const visitTitle = `Visit: ${new Date(visit.visit_date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  // ── VIEW MODE ─────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div style={{ maxWidth: 720, padding: "16px 20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <button
            style={{
              background: "none",
              border: "none",
              color: "var(--link-color)",
              cursor: "pointer",
              fontSize: 14,
              padding: 0,
            }}
            onClick={() => navigate("/visits")}
          >
            ← Back
          </button>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>{visitTitle}</h2>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
              {kutirName}
            </div>
          </div>
          {canManageVisits && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={deleting}
                style={{ ...grs.btnDanger, fontSize: 13 }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                style={{ ...grs.btnSecondary, fontSize: 13 }}
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            </div>
          )}
        </div>

        <VisitForm
          form={form}
          setForm={setForm}
          mode="view"
          existingPhoto={visit.visit_photo}
          kutirName={kutirName}
        />
        {confirmDeleteOpen && (
          <ConfirmDialog
            message="Delete this visit record?"
            busy={deleting}
            onConfirm={() => {
              void handleDelete();
            }}
            onCancel={() => !deleting && setConfirmDeleteOpen(false)}
          />
        )}
      </div>
    );
  }

  // ── EDIT MODE ─────────────────────────────────────────────────────────────
  return (
    <div className="grs-page" style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={handleCancel}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            fontSize: "1.1rem",
            padding: 0,
          }}
        >
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>Edit Visit</h2>
      </div>

      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: 8,
          padding: "16px 20px",
          border: "1px solid var(--border)",
        }}
      >
        {error && <div style={grs.errorBox}>{error}</div>}

        <VisitForm
          form={form}
          setForm={setForm}
          mode="edit"
          photoFile={photoFile}
          setPhotoFile={setPhotoFile}
          existingPhoto={visit.visit_photo}
          kutirName={kutirName}
        />

        <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={handleCancel} style={grs.btnSecondary} disabled={saving}>
            Cancel
          </button>
          <button onClick={handleSave} style={grs.btnPrimary} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
