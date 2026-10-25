import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getKutir, updateKutir, type KutirCreate } from "../api/kutirs";
import {
  KutirForm,
  emptyKutirForm,
  kutirFormFromDetail,
  type KutirFormState,
} from "../components/KutirForm";
import { grs } from "../styles/grs";
import { useAuth } from "../context/AuthContext";
import { canManageKutirs } from "../constants/roles";

export default function KutirDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { user } = useAuth();

  const canManage = canManageKutirs(user?.title);

  const enteredViaEdit = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState(enteredViaEdit);
  const [form, setForm] = useState<KutirFormState>(emptyKutirForm);
  const [saveError, setSaveError] = useState("");

  const { data: kutir, isLoading } = useQuery({
    queryKey: ["kutir", Number(id)],
    queryFn: () => getKutir(Number(id)),
    enabled: !!id,
  });

  useEffect(() => {
    if (!kutir) return;
    setForm(kutirFormFromDetail(kutir));
  }, [kutir]);

  const updateMut = useMutation({
    mutationFn: (data: Partial<KutirCreate>) => updateKutir(Number(id), data),
    onSuccess: (updated) => {
      qc.setQueryData(["kutir", Number(id)], (old: unknown) =>
        old && typeof old === "object" ? { ...old, ...updated } : updated,
      );
      qc.invalidateQueries({ queryKey: ["kutirs"] });
      if (enteredViaEdit) {
        navigate(-1);
      } else {
        setEditing(false);
        setSaveError("");
      }
    },
    onError: (e: unknown) => {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setSaveError(detail ?? "Save failed");
    },
  });

  function handleSave() {
    if (!form.name.trim()) {
      setSaveError("Name is required");
      return;
    }
    if (!form.cluster_id) {
      setSaveError("Please select a cluster");
      return;
    }
    setSaveError("");
    updateMut.mutate(form);
  }

  function handleCancel() {
    if (enteredViaEdit) navigate(-1);
    else {
      setEditing(false);
      setSaveError("");
      if (kutir) setForm(kutirFormFromDetail(kutir));
    }
  }

  if (isLoading) return <div style={{ padding: 32, color: "var(--text-secondary)" }}>Loading…</div>;
  if (!kutir) return <div style={{ padding: 32, color: "var(--status-danger-fg)" }}>Kutir not found.</div>;

  const locationLabels = {
    zone: kutir.cluster?.area?.district?.zone?.name,
    district: kutir.cluster?.area?.district?.name,
    area: kutir.cluster?.area?.name,
    cluster: kutir.cluster?.name,
  };

  return (
    <div style={{ maxWidth: 600, padding: "16px 20px" }}>
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
          onClick={() => navigate("/kutirs")}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0, fontSize: 20 }}>{kutir.name}</h2>
        {!editing && canManage && (
          <button
            style={{ ...grs.btnSecondary, marginLeft: "auto", fontSize: 13 }}
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        )}
      </div>

      {saveError && (
        <div
          style={{
            color: "var(--danger)",
            background: "var(--danger-bg,#fef2f2)",
            border: "1px solid var(--danger-border,#fca5a5)",
            borderRadius: 6,
            padding: "8px 12px",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {saveError}
        </div>
      )}

      <KutirForm
        form={form}
        setForm={setForm}
        mode={editing ? "edit" : "view"}
        locationLabels={locationLabels}
        teacher={!editing ? kutir.teacher : undefined}
      />

      {editing && (
        <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
          <button style={grs.btnSecondary} onClick={handleCancel}>
            Cancel
          </button>
          <button style={grs.btnPrimary} disabled={updateMut.isPending} onClick={handleSave}>
            {updateMut.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
