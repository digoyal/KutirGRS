import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getVisit, updateVisit, uploadVisitPhoto } from "../api/visits";
import { listKutirs } from "../api/kutirs";
import { useAuth } from "../context/AuthContext";
import { grs } from "../styles/grs";
import { canManageVisits as roleCanManageVisits } from "../constants/roles";
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
    navigate("/visits/detail");
  }

  if (isLoading || !visit) {
    return <div style={{ padding: 32, color: "var(--text-secondary)" }}>Loading…</div>;
  }

  const kutirName =
    kutirs.find((k) => k.id === visit.kutir_id)?.name ?? `Kutir #${visit.kutir_id}`;

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
            onClick={() => navigate("/visits/detail")}
          >
            ← Back
          </button>
          {canManageVisits && (
            <button
              style={{ ...grs.btnSecondary, marginLeft: "auto", fontSize: 13 }}
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
          )}
        </div>

        <VisitForm
          form={form}
          setForm={setForm}
          mode="view"
          existingPhoto={visit.visit_photo}
          kutirName={kutirName}
        />
      </div>
    );
  }

  // ── EDIT MODE ─────────────────────────────────────────────────────────────
  return (
    <div
      className="grs-page visit-add-page"
      style={{ maxWidth: 720, width: "100%", boxSizing: "border-box", padding: "16px 20px" }}
    >
      <div className="grs-page-topbar visit-add-topbar">
        <button type="button" className="grs-page-back" onClick={handleCancel}>
          ← Back
        </button>
        <h2 className="grs-page-title" style={{ margin: 0, fontSize: 20, color: "var(--text-primary)" }}>
          Edit Visit
        </h2>
      </div>

      <div className="visit-add-card">
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

        <div className="visit-form-actions">
          <button type="button" onClick={handleCancel} style={grs.btnSecondary} disabled={saving}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} style={grs.btnPrimary} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
