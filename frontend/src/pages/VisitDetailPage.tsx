import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormPageActions, FormPageShell } from "@parivaar/ui";
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
import type { VisitPhotoLocation } from "../utils/visitPhotoGeolocation";

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
  const [photoLocation, setPhotoLocation] = useState<VisitPhotoLocation | null>(null);
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
      if (photoFile) await uploadVisitPhoto(saved.id, photoFile, photoLocation);
      qc.invalidateQueries({ queryKey: ["visits"] });
      qc.invalidateQueries({ queryKey: ["visit-record", Number(id)] });
      if (enteredViaEdit) navigate(-1);
      else {
        setEditing(false);
        setPhotoFile(null);
        setPhotoLocation(null);
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

  const formBody = (
    <VisitForm
      form={form}
      setForm={setForm}
      mode={editing ? "edit" : "view"}
      photoFile={editing ? photoFile : undefined}
      setPhotoFile={editing ? setPhotoFile : undefined}
      photoLocation={editing ? photoLocation : undefined}
      setPhotoLocation={editing ? setPhotoLocation : undefined}
      existingPhoto={visit.visit_photo}
      visitPhotoLatitude={visit.visit_photo_latitude}
      visitPhotoLongitude={visit.visit_photo_longitude}
      visitPhotoAccuracyM={visit.visit_photo_accuracy_m}
      kutirName={kutirName}
      visitedById={visit.visited_by_id}
      visitedByName={visit.visited_by_name}
      visitedByRole={visit.visited_by_role}
    />
  );

  return (
    <FormPageShell
      className="grs-page visit-add-page"
      style={{ maxWidth: 720, padding: "12px 16px" }}
      header={
        <div className="grs-page-topbar visit-add-topbar">
          <button type="button" className="grs-page-back" onClick={() => navigate("/visits/detail")}>
            ← Back
          </button>
          {editing ? (
            <h2 className="grs-page-title" style={{ margin: 0, fontSize: 20, color: "var(--text-primary)" }}>
              Edit Visit
            </h2>
          ) : (
            canManageVisits && (
              <button
                style={{ ...grs.btnSecondary, marginLeft: "auto", fontSize: 13 }}
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            )
          )}
        </div>
      }
      showActions={false}
    >
      {editing ? (
        <div className="visit-add-card">
          {formBody}
          <FormPageActions
            error={error}
            saving={saving}
            saveLabel="Save Changes"
            onSave={handleSave}
            onCancel={handleCancel}
            actionsClassName="visit-form-actions"
          />
        </div>
      ) : (
        formBody
      )}
    </FormPageShell>
  );
}
