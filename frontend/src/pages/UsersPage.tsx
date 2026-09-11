import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUsers, createUser, updateUser, type UserCreate } from "../api/users";

const TITLES = ["Teacher", "Cluster Coordinator", "Education Coordinator", "District Anchor", "Zonal Head", "Admin"];
const EMPTY: UserCreate = { username: "", password: "", title: "Teacher", first_name: null, last_name: null, phone: null, email: null, is_active: true };

export default function UsersPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<UserCreate>(EMPTY);
  const [formError, setFormError] = useState("");

  const { data: users = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: listUsers });

  const createMut = useMutation({
    mutationFn: createUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); closeForm(); },
    onError: (e: any) => setFormError(e?.response?.data?.detail ?? "Failed to create user"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UserCreate> }) => updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); closeForm(); },
    onError: (e: any) => setFormError(e?.response?.data?.detail ?? "Failed to update user"),
  });

  function closeForm() { setShowForm(false); setEditId(null); setForm(EMPTY); setFormError(""); }

  function openEdit(u: any) {
    setEditId(u.id);
    setForm({ username: u.username, password: "", title: u.title, first_name: u.first_name, last_name: u.last_name, phone: u.phone, email: u.email, is_active: u.is_active });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username.trim()) { setFormError("Username is required"); return; }
    if (!editId && !form.password.trim()) { setFormError("Password is required for new users"); return; }
    if (editId) {
      const data: Partial<UserCreate> = { ...form };
      if (!data.password) delete data.password;
      updateMut.mutate({ id: editId, data });
    } else {
      createMut.mutate(form);
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>Users</h2>
        <button style={styles.primaryBtn} onClick={() => { setShowForm(true); setFormError(""); }}>+ Add User</button>
      </div>

      {isLoading ? <p style={{ color: "#718096" }}>Loading…</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead><tr style={{ background: "#ebf4ff" }}>
              <th style={styles.th}>Username</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Phone</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr></thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ background: i % 2 === 0 ? "#fff" : "#f7fafc" }}>
                  <td style={styles.td}><strong>{u.username}</strong></td>
                  <td style={styles.td}>{[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}</td>
                  <td style={styles.td}>{u.title ?? "—"}</td>
                  <td style={styles.td}>{u.phone ?? "—"}</td>
                  <td style={styles.td}>
                    <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 600, background: u.is_active ? "#c6f6d5" : "#e2e8f0", color: u.is_active ? "#276749" : "#718096" }}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button style={styles.editBtn} onClick={() => openEdit(u)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p style={{ color: "#718096" }}>No users found.</p>}
        </div>
      )}

      {showForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{ margin: "0 0 1rem" }}>{editId ? "Edit User" : "Add User"}</h3>
            {formError && <p style={styles.error}>{formError}</p>}
            <form onSubmit={handleSubmit}>
              {[
                { label: "Username *", key: "username" as const },
                { label: editId ? "Password (leave blank to keep)" : "Password *", key: "password" as const, type: "password" },
                { label: "First Name", key: "first_name" as const },
                { label: "Last Name", key: "last_name" as const },
                { label: "Phone", key: "phone" as const },
                { label: "Email", key: "email" as const, type: "email" },
              ].map(({ label, key, type = "text" }) => (
                <div key={key} style={{ marginBottom: 10 }}>
                  <label style={styles.label}>{label}</label>
                  <input style={styles.input} type={type} value={(form[key] as string) ?? ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value || null }))} disabled={editId !== null && key === "username"} />
                </div>
              ))}
              <div style={{ marginBottom: 10 }}>
                <label style={styles.label}>Role</label>
                <select style={styles.input} value={form.title ?? ""} onChange={e => setForm(f => ({ ...f, title: e.target.value || null }))}>
                  {TITLES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                <label htmlFor="is_active" style={{ fontSize: "0.875rem" }}>Active</label>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button type="submit" style={styles.primaryBtn} disabled={isPending}>{isPending ? "Saving…" : "Save"}</button>
                <button type="button" style={styles.secondaryBtn} onClick={closeForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
  th: { padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#2c5282", borderBottom: "2px solid #bee3f8" },
  td: { padding: "10px 12px", borderBottom: "1px solid #e2e8f0" },
  primaryBtn: { background: "#2b6cb0", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: "0.875rem" },
  secondaryBtn: { background: "#e2e8f0", color: "#2d3748", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: "0.875rem" },
  editBtn: { background: "#ebf4ff", color: "#2b6cb0", border: "1px solid #bee3f8", padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: "0.75rem" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "#fff", borderRadius: 10, padding: "1.5rem", width: 400, maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto" },
  label: { display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#4a5568", marginBottom: 3 },
  input: { width: "100%", padding: "7px 10px", border: "1px solid #cbd5e0", borderRadius: 5, fontSize: "0.875rem", boxSizing: "border-box" },
  error: { color: "#c53030", background: "#fff5f5", border: "1px solid #fc8181", borderRadius: 5, padding: "8px 12px", marginBottom: 12, fontSize: "0.85rem" },
};
