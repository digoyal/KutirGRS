import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormPageShell } from "@parivaar/ui";
import { createUser, type UserCreate } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { UserForm, EMPTY_USER_FORM, type UserFormState } from "../components/UserForm";
import { assignableTitles as titlesAssignableTo } from "../constants/roles";
import { apiErrorDetail } from "../utils/apiError";
import { emailFormatError } from "../utils/email";

export default function UserAddPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user: authUser } = useAuth();

  const assignableTitles = titlesAssignableTo(authUser?.title);

  const [form, setForm] = useState<UserFormState>(EMPTY_USER_FORM);
  const [saveError, setSaveError] = useState("");
  const [filterZone, setFilterZone] = useState<number | null>(null);
  const [filterDistrict, setFilterDistrict] = useState<number | null>(null);
  const [filterArea, setFilterArea] = useState<number | null>(null);
  const [filterCluster, setFilterCluster] = useState<number | null>(null);

  const createMut = useMutation({
    mutationFn: (data: UserCreate) => createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      navigate(-1);
    },
    onError: (e: unknown) => setSaveError(apiErrorDetail(e, "Failed to create user")),
  });

  function handleSave() {
    if (!form.username.trim()) {
      setSaveError("Username is required");
      return;
    }
    if (!form.password.trim()) {
      setSaveError("Password is required");
      return;
    }
    if (!form.email?.trim()) {
      setSaveError("Email is required");
      return;
    }
    const emailErr = emailFormatError(form.email);
    if (emailErr) {
      setSaveError(emailErr);
      return;
    }
    setSaveError("");
    createMut.mutate({
      username: form.username,
      password: form.password,
      title: form.title || null,
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone,
      email: form.email.trim(),
      is_active: form.is_active,
      zone_ids: form.zone_ids,
      district_ids: form.district_ids,
      area_ids: form.area_ids,
      cluster_ids: form.cluster_ids,
      kutir_ids: form.kutir_ids,
    });
  }

  return (
    <FormPageShell
      header={
        <div className="grs-page-topbar">
          <button type="button" className="grs-page-back" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h2 className="grs-page-title" style={{ margin: 0, fontSize: 20 }}>
            Add User
          </h2>
        </div>
      }
      error={saveError}
      saving={createMut.isPending}
      saveLabel="Save User"
      onSave={handleSave}
      onCancel={() => navigate(-1)}
    >
      <UserForm
        form={form}
        setForm={setForm}
        isEdit={false}
        assignableTitles={assignableTitles}
        filterZone={filterZone}
        setFilterZone={setFilterZone}
        filterDistrict={filterDistrict}
        setFilterDistrict={setFilterDistrict}
        filterArea={filterArea}
        setFilterArea={setFilterArea}
        filterCluster={filterCluster}
        setFilterCluster={setFilterCluster}
      />
    </FormPageShell>
  );
}
