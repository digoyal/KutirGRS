import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSchool, updateSchool, type SchoolCreate } from "../api/schools";
import { listDistricts } from "../api/geo";
import {
  SchoolForm,
  emptySchoolForm,
  type SchoolFormState,
} from "../components/SchoolForm";
import { grs } from "../styles/grs";
import { useAuth } from "../context/AuthContext";
import { canManageSchools } from "../constants/roles";

export default function SchoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const canManage = canManageSchools(user?.title);

  const enteredViaEdit = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState(enteredViaEdit && canManage);
  const [form, setForm] = useState<SchoolFormState>(emptySchoolForm);
  const [saveError, setSaveError] = useState("");

  const { data: school, isLoading } = useQuery({
    queryKey: ["school", Number(id)],
    queryFn: () => getSchool(Number(id)),
    enabled: !!id,
  });
  const { data: districts = [] } = useQuery({
    queryKey: ["all-districts"],
    queryFn: () => listDistricts(),
  });

  useEffect(() => {
    if (!school) return;
    setForm({
      name: school.name,
      school_type: school.school_type,
      state: school.state,
      city: school.city,
      street: school.street,
      district_id: school.district_id,
      pincode: school.pincode,
    });
  }, [school]);

  const updateMut = useMutation({
    mutationFn: (data: Partial<SchoolCreate>) => updateSchool(Number(id), data),
    onSuccess: (updated) => {
      qc.setQueryData(["school", Number(id)], (old: unknown) =>
        old && typeof old === "object" ? { ...old, ...updated } : updated,
      );
      qc.invalidateQueries({ queryKey: ["schools"] });
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
    setSaveError("");
    updateMut.mutate(form);
  }

  function handleCancel() {
    if (enteredViaEdit) navigate(-1);
    else {
      setEditing(false);
      setSaveError("");
      if (school) {
        setForm({
          name: school.name,
          school_type: school.school_type,
          state: school.state,
          city: school.city,
          street: school.street,
          district_id: school.district_id,
          pincode: school.pincode,
        });
      }
    }
  }

  if (isLoading) return <div style={{ padding: 32, color: "var(--text-secondary)" }}>Loading…</div>;
  if (!school) {
    return <div style={{ padding: 32, color: "var(--status-danger-fg)" }}>School not found.</div>;
  }

  const districtName = districts.find((d) => d.id === school.district_id)?.name;

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
          onClick={() => navigate("/schools")}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0, fontSize: 20 }}>{school.name}</h2>
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

      <SchoolForm
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
