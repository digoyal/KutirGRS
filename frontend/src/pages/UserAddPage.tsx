import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser, type UserCreate } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { UserForm, EMPTY_USER_FORM, TITLES, type UserFormState } from "../components/UserForm";
import { grs } from "../styles/grs";

export default function UserAddPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user: authUser } = useAuth();

  const myRoleIndex = TITLES.indexOf(authUser?.title ?? "");
  const assignableTitles = authUser?.title === "Admin" ? TITLES : (myRoleIndex === -1 ? [] : TITLES.slice(0, myRoleIndex));

  const [form, setForm] = useState<UserFormState>(EMPTY_USER_FORM);
  const [saveError, setSaveError] = useState("");
  const [filterZone, setFilterZone]         = useState<number | null>(null);
  const [filterDistrict, setFilterDistrict] = useState<number | null>(null);
  const [filterArea, setFilterArea]         = useState<number | null>(null);
  const [filterCluster, setFilterCluster]   = useState<number | null>(null);

  const createMut = useMutation({
    mutationFn: (data: UserCreate) => createUser(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); navigate(-1); },
    onError: (e: any) => setSaveError(e?.response?.data?.detail ?? "Failed to create user"),
  });

  function handleSave() {
    if (!form.username.trim()) { setSaveError("Username is required"); return; }
    if (!form.password.trim()) { setSaveError("Password is required"); return; }
    setSaveError("");
    createMut.mutate({
      username: form.username, password: form.password,
      title: form.title || null, first_name: form.first_name, last_name: form.last_name,
      phone: form.phone, email: form.email, is_active: form.is_active,
      zone_ids: form.zone_ids, district_ids: form.district_ids,
      area_ids: form.area_ids, cluster_ids: form.cluster_ids, kutir_ids: form.kutir_ids,
    });
  }

  return (
    <div style={{ maxWidth: 640, padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button style={{ background: "none", border: "none", color: "var(--link-color)", cursor: "pointer", fontSize: 14, padding: 0 }}
          onClick={() => navigate(-1)}>← Back</button>
        <h2 style={{ margin: 0, fontSize: 20 }}>Add User</h2>
      </div>

      {saveError && <div style={{ color: "var(--danger)", background: "var(--danger-bg,#fef2f2)", border: "1px solid var(--danger-border,#fca5a5)", borderRadius: 6, padding: "8px 12px", marginBottom: 16, fontSize: 13 }}>{saveError}</div>}

      <UserForm
        form={form} setForm={setForm} isEdit={false}
        assignableTitles={assignableTitles}
        filterZone={filterZone}         setFilterZone={setFilterZone}
        filterDistrict={filterDistrict} setFilterDistrict={setFilterDistrict}
        filterArea={filterArea}         setFilterArea={setFilterArea}
        filterCluster={filterCluster}   setFilterCluster={setFilterCluster}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
        <button style={grs.btnSecondary} onClick={() => navigate(-1)}>Cancel</button>
        <button style={grs.btnPrimary} disabled={createMut.isPending} onClick={handleSave}>
          {createMut.isPending ? "Saving…" : "Save User"}
        </button>
      </div>
    </div>
  );
}
