import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUser, updateUser, type UserUpdate } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { UserForm, EMPTY_USER_FORM, TITLES, type UserFormState } from "../components/UserForm";
import { grs } from "../styles/grs";

const sec: React.CSSProperties = { background: "var(--bg-card)", borderRadius: 8, padding: "10px 14px", marginBottom: 8 };
const secTitle: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--badge-blue-fg, #2563eb)", marginBottom: 8 };
const viewVal: React.CSSProperties = { fontSize: 14, color: "var(--text-primary)", padding: "7px 0" };

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { user: authUser } = useAuth();

  const enteredViaEdit = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState(enteredViaEdit);
  const [form, setForm] = useState<UserFormState>(EMPTY_USER_FORM);
  const [saveError, setSaveError] = useState("");
  const [filterZone, setFilterZone]         = useState<number | null>(null);
  const [filterDistrict, setFilterDistrict] = useState<number | null>(null);
  const [filterArea, setFilterArea]         = useState<number | null>(null);
  const [filterCluster, setFilterCluster]   = useState<number | null>(null);

  const myRoleIndex = TITLES.indexOf(authUser?.title ?? "");
  const canManage = ["Admin", "Regional Head", "District Anchor", "Education Coordinator"].includes(authUser?.title ?? "");
  const assignableTitles = authUser?.title === "Admin" ? TITLES : (myRoleIndex === -1 ? [] : TITLES.slice(0, myRoleIndex));

  const { data: u, isLoading } = useQuery({
    queryKey: ["user", Number(id)],
    queryFn: () => getUser(Number(id)),
    enabled: !!id,
  });

  useEffect(() => {
    if (!u) return;
    setForm({
      username: u.username, password: "",
      title: u.title ?? "Teacher",
      first_name: u.first_name, last_name: u.last_name,
      phone: u.phone, email: u.email,
      is_active: u.is_active,
      zone_ids: u.zone_ids, district_ids: u.district_ids,
      area_ids: u.area_ids, cluster_ids: u.cluster_ids,
      kutir_ids: u.kutir_ids,
    });
    setFilterZone(null); setFilterDistrict(null); setFilterArea(null); setFilterCluster(null);
  }, [u]);

  const updateMut = useMutation({
    mutationFn: (data: UserUpdate) => updateUser(Number(id), data),
    onSuccess: (updated) => {
      qc.setQueryData(["user", Number(id)], (old: any) => ({ ...old, ...updated }));
      qc.invalidateQueries({ queryKey: ["users"] });
      if (enteredViaEdit) navigate(-1); else { setEditing(false); setSaveError(""); }
    },
    onError: (e: any) => setSaveError(e?.response?.data?.detail ?? "Save failed"),
  });

  function handleSave() {
    if (!form.username.trim()) { setSaveError("Username is required"); return; }
    setSaveError("");
    const data: UserUpdate = {
      title: form.title || null, first_name: form.first_name, last_name: form.last_name,
      phone: form.phone, email: form.email, is_active: form.is_active,
      zone_ids: form.zone_ids, district_ids: form.district_ids,
      area_ids: form.area_ids, cluster_ids: form.cluster_ids, kutir_ids: form.kutir_ids,
    };
    if (form.password) data.password = form.password;
    updateMut.mutate(data);
  }

  function handleCancel() {
    if (enteredViaEdit) navigate(-1);
    else { setEditing(false); setSaveError(""); if (u) setForm({ username: u.username, password: "", title: u.title ?? "Teacher", first_name: u.first_name, last_name: u.last_name, phone: u.phone, email: u.email, is_active: u.is_active, zone_ids: u.zone_ids, district_ids: u.district_ids, area_ids: u.area_ids, cluster_ids: u.cluster_ids, kutir_ids: u.kutir_ids }); }
  }

  if (isLoading) return <div style={{ padding: 32, color: "var(--text-secondary)" }}>Loading…</div>;
  if (!u) return <div style={{ padding: 32, color: "var(--status-danger-fg)" }}>User not found.</div>;

  const displayName = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username;

  return (
    <div style={{ maxWidth: 640, padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button style={{ background: "none", border: "none", color: "var(--link-color)", cursor: "pointer", fontSize: 14, padding: 0 }}
          onClick={() => navigate("/users")}>← Back</button>
        <h2 style={{ margin: 0, fontSize: 20 }}>{displayName}</h2>
        {!editing && canManage && (
          <button style={{ ...grs.btnSecondary, marginLeft: "auto", fontSize: 13 }} onClick={() => setEditing(true)}>Edit</button>
        )}
      </div>

      {saveError && <div style={{ color: "var(--danger)", background: "var(--danger-bg,#fef2f2)", border: "1px solid var(--danger-border,#fca5a5)", borderRadius: 6, padding: "8px 12px", marginBottom: 16, fontSize: 13 }}>{saveError}</div>}

      {editing ? (
        <>
          <UserForm
            form={form} setForm={setForm} isEdit={true}
            assignableTitles={assignableTitles}
            filterZone={filterZone}         setFilterZone={setFilterZone}
            filterDistrict={filterDistrict} setFilterDistrict={setFilterDistrict}
            filterArea={filterArea}         setFilterArea={setFilterArea}
            filterCluster={filterCluster}   setFilterCluster={setFilterCluster}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
            <button style={grs.btnSecondary} onClick={handleCancel}>Cancel</button>
            <button style={grs.btnPrimary} disabled={updateMut.isPending} onClick={handleSave}>
              {updateMut.isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </>
      ) : (
        <>
          <section style={sec}>
            <div style={secTitle}>Account</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div><label style={grs.fieldLabel}>Username</label><div style={viewVal}>{u.username}</div></div>
              <div><label style={grs.fieldLabel}>Role</label><div style={viewVal}>{u.title ?? "—"}</div></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...grs.badge, background: u.is_active ? "var(--badge-active-bg)" : "var(--badge-inactive-bg)", color: u.is_active ? "var(--badge-active-fg)" : "var(--badge-inactive-fg)" }}>
                {u.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </section>

          <section style={sec}>
            <div style={secTitle}>Contact</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div><label style={grs.fieldLabel}>First Name</label><div style={viewVal}>{u.first_name ?? "—"}</div></div>
              <div><label style={grs.fieldLabel}>Last Name</label><div style={viewVal}>{u.last_name ?? "—"}</div></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div><label style={grs.fieldLabel}>Phone</label><div style={viewVal}>{u.phone ?? "—"}</div></div>
              <div><label style={grs.fieldLabel}>Email</label><div style={viewVal}>{u.email ?? "—"}</div></div>
            </div>
          </section>

          {(u.zone_ids.length > 0 || u.district_ids.length > 0 || u.area_ids.length > 0 || u.cluster_ids.length > 0 || u.kutir_ids.length > 0) && (
            <section style={sec}>
              <div style={secTitle}>Assignment</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {u.zone_ids.length > 0     && <div style={{ marginBottom: 4 }}><strong>Zones:</strong> {u.zone_ids.join(", ")}</div>}
                {u.district_ids.length > 0 && <div style={{ marginBottom: 4 }}><strong>Districts:</strong> {u.district_ids.join(", ")}</div>}
                {u.area_ids.length > 0     && <div style={{ marginBottom: 4 }}><strong>Areas:</strong> {u.area_ids.join(", ")}</div>}
                {u.cluster_ids.length > 0  && <div style={{ marginBottom: 4 }}><strong>Clusters:</strong> {u.cluster_ids.join(", ")}</div>}
                {u.kutir_ids.length > 0    && <div><strong>Kutirs:</strong> {u.kutir_ids.join(", ")}</div>}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
