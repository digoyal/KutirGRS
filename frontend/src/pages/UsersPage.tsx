import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUsers, createUser, updateUser, type UserCreate } from "../api/users";
import { GrsTable, type Col } from "../components/GrsTable";
import { grs } from "../styles/grs";

const TITLES = ["Teacher", "Cluster Coordinator", "Education Coordinator", "District Anchor", "Regional Head", "Admin"];
const EMPTY: UserCreate = { username: "", password: "", title: "Teacher", first_name: null, last_name: null, phone: null, email: null, is_active: true };

type User = { id: number; username: string; title: string | null; first_name: string | null; last_name: string | null; phone: string | null; email: string | null; is_active: boolean };

const COLS: Col<User>[] = [
  { key: "username", label: "Username", sortable: true, render: u => <strong>{u.username}</strong> },
  { key: "name", label: "Name", render: u => [u.first_name, u.last_name].filter(Boolean).join(" ") || "—" },
  { key: "title", label: "Role", sortable: true, render: u => u.title ?? "—" },
  { key: "phone", label: "Phone", render: u => u.phone ?? "—" },
  {
    key: "is_active", label: "Status", sortable: true,
    render: u => (
      <span style={{
        ...grs.badge,
        background: u.is_active ? "var(--badge-active-bg)" : "var(--badge-inactive-bg)",
        color: u.is_active ? "var(--badge-active-fg)" : "var(--badge-inactive-fg)",
      }}>
        {u.is_active ? "Active" : "Inactive"}
      </span>
    ),
  },
];

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

  function openEdit(u: User) {
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

  const colsWithActions: Col<User>[] = [
    ...COLS,

  ];

  return (
    <div style={{ padding: "24px 28px" }}>
      <GrsTable
        title="Users"
        columns={colsWithActions}
        data={users as User[]}
        rowKey={u => u.id}
        isLoading={isLoading}
        emptyMessage="No users found."
        actions={u => ({ onEdit: () => openEdit(u) })}
        searchable
        searchFn={(u, q) => {
          const s = q.toLowerCase();
          return u.username.toLowerCase().includes(s)
            || (u.first_name ?? "").toLowerCase().includes(s)
            || (u.last_name ?? "").toLowerCase().includes(s)
            || (u.title ?? "").toLowerCase().includes(s);
        }}
        exportFilename="users"
        printTitle="Users"
        onAdd={() => { setShowForm(true); setFormError(""); }}
        addLabel="Add User"
      />

      {showForm && (
        <div style={grs.overlay}>
          <div style={grs.modal}>
            <h3 style={grs.modalTitle}>{editId ? "Edit User" : "Add User"}</h3>
            {formError && <div style={grs.errorBox}>{formError}</div>}
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
                  <label style={grs.fieldLabel}>{label}</label>
                  <input
                    style={grs.input}
                    type={type}
                    value={(form[key] as string) ?? ""}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value || null }))}
                    disabled={editId !== null && key === "username"}
                  />
                </div>
              ))}
              <div style={{ marginBottom: 10 }}>
                <label style={grs.fieldLabel}>Role</label>
                <select style={grs.select} value={form.title ?? ""} onChange={e => setForm(f => ({ ...f, title: e.target.value || null }))}>
                  {TITLES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                <label htmlFor="is_active" style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>Active</label>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button type="submit" style={grs.btnPrimary} disabled={isPending}>{isPending ? "Saving…" : "Save"}</button>
                <button type="button" style={grs.btnSecondary} onClick={closeForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
