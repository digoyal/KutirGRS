import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getExamCenter, updateExamCenter, listDistricts, type ExamCenter } from "../api/geo";
import {
  ExamCenterForm,
  emptyExamCenterForm,
  type ExamCenterFormState,
} from "../components/ExamCenterForm";
import { grs } from "../styles/grs";
import { useAuth } from "../context/AuthContext";
import { canManageExamCenters } from "../constants/roles";

export default function ExamCenterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const canManage = canManageExamCenters(user?.title);

  const enteredViaEdit = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState(enteredViaEdit && canManage);
  const [form, setForm] = useState<ExamCenterFormState>(emptyExamCenterForm);
  const [saveError, setSaveError] = useState("");

  const { data: center, isLoading } = useQuery({
    queryKey: ["exam-center", Number(id)],
    queryFn: () => getExamCenter(Number(id)),
    enabled: !!id,
  });
  const { data: districts = [] } = useQuery({
    queryKey: ["districts", { parivaar_presence: true }],
    queryFn: () => listDistricts(undefined, { parivaar_presence: true }),
  });

  useEffect(() => {
    if (!center) return;
    setForm({
      name: center.name,
      district_id: center.district_id ?? null,
      street: center.street ?? "",
      city: center.city ?? "",
      state: center.state ?? "Madhya Pradesh",
      pincode: center.pincode ?? "",
    });
  }, [center]);

  const updateMut = useMutation({
    mutationFn: (data: Partial<ExamCenter>) => updateExamCenter(Number(id), data),
    onSuccess: (updated) => {
      qc.setQueryData(["exam-center", Number(id)], (old: unknown) =>
        old && typeof old === "object" ? { ...old, ...updated } : updated,
      );
      qc.invalidateQueries({ queryKey: ["exam-centers"] });
      if (enteredViaEdit) navigate(-1);
      else {
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
    if (!form.district_id) {
      setSaveError("Please select a district");
      return;
    }
    setSaveError("");
    updateMut.mutate({
      name: form.name.trim(),
      district_id: form.district_id,
      street: form.street || null,
      city: form.city || null,
      state: form.state || null,
      pincode: form.pincode || null,
    });
  }

  function handleCancel() {
    if (enteredViaEdit) navigate(-1);
    else {
      setEditing(false);
      setSaveError("");
      if (center) {
        setForm({
          name: center.name,
          district_id: center.district_id ?? null,
          street: center.street ?? "",
          city: center.city ?? "",
          state: center.state ?? "Madhya Pradesh",
          pincode: center.pincode ?? "",
        });
      }
    }
  }

  if (isLoading) return <div style={{ padding: 32, color: "var(--text-secondary)" }}>Loading…</div>;
  if (!center) {
    return (
      <div style={{ padding: 32, color: "var(--status-danger-fg)" }}>Exam center not found.</div>
    );
  }

  const districtName = districts.find((d) => d.id === center.district_id)?.name;

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
          onClick={() => navigate("/exam-centers")}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0, fontSize: 20 }}>{center.name}</h2>
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

      <ExamCenterForm
        form={form}
        setForm={setForm}
        mode={editing ? "edit" : "view"}
        districtName={districtName}
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
