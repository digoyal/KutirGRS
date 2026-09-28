import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUsers, deleteUser, type User } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { USERS_FIELDS } from "../constants/usersFields";
import { GrsTable, type Col } from "../components/GrsTable";
import { grs } from "../styles/grs";

const COLS: Col<User>[] = [
  { key: "username", label: "Username", sortable: true, render: u => <strong>{u.username}</strong> },
  { key: "name",     label: "Name",     render: u => [u.first_name, u.last_name].filter(Boolean).join(" ") || "—" },
  { key: "title",    label: "Role",     sortable: true, render: u => u.title ?? "—" },
  { key: "phone",    label: "Phone",    render: u => u.phone ?? "—" },
  {
    key: "is_active", label: "Status", sortable: true,
    render: u => (
      <span style={{ ...grs.badge, background: u.is_active ? "var(--badge-active-bg)" : "var(--badge-inactive-bg)", color: u.is_active ? "var(--badge-active-fg)" : "var(--badge-inactive-fg)" }}>
        {u.is_active ? "Active" : "Inactive"}
      </span>
    ),
  },
  { key: "email", label: "Email", render: u => u.email ?? "—", csvValue: u => u.email ?? "" },
];

export default function UsersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  const MANAGER_ROLES_UI = ["Admin", "Regional Head", "District Anchor", "Education Coordinator", "Cluster Coordinator"];
  const canManage = MANAGER_ROLES_UI.includes(user?.title ?? "");

  const { data: users = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: listUsers });

  const deleteMut = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const { isVisible, orderedMetas } = useFieldConfig("users", USERS_FIELDS);
  const columns = useMemo(() => {
    const colByKey = new Map(COLS.map(c => [c.key, c]));
    return orderedMetas.filter(m => isVisible(m.key)).map(m => colByKey.get(m.key)).filter((c): c is NonNullable<typeof c> => c != null);
  }, [orderedMetas, isVisible]);

  return (
    <div style={{ padding: "24px 28px" }}>
      <GrsTable
        title="Users"
        columns={columns}
        data={users}
        rowKey={u => u.id}
        isLoading={isLoading}
        emptyMessage="No users found."
        actions={canManage
          ? (u => ({
              onView: () => navigate(`/users/${u.id}`),
              onEdit: () => navigate(`/users/${u.id}?edit=1`),
              onDelete: () => { if (confirm(`Delete user "${u.username}"? This cannot be undone.`)) deleteMut.mutate(u.id); },
            }))
          : undefined}
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
        onAdd={canManage ? () => navigate("/users/new") : undefined}
      />
    </div>
  );
}
