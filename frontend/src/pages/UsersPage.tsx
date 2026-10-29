import { useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUsersPaged, deleteUser, type User } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { useBfcacheReload } from "../hooks/useBfcacheReload";
import { persistFilters, usePersistedFilterRestore } from "../hooks/usePersistedFilters";
import { USERS_FIELDS, USERS_FIELD_KEYS } from "../constants/usersFields";
import { canManageUsers, TITLES } from "../constants/roles";
import { GrsTable, type Col } from "../components/GrsTable";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { grs } from "../styles/grs";

const STORAGE_KEY = "users_filter_state";

type UserColRenderer = {
  render?: (u: User) => ReactNode;
  csvValue?: (u: User) => string;
  sortValue?: (u: User) => string | number;
  sortable?: boolean;
};

function userColRenderers(): Record<string, UserColRenderer> {
  const renderers: Record<string, UserColRenderer> = {
    username: {
      sortable: true,
      render: (u) => <strong>{u.username}</strong>,
    },
    name: {
      render: (u) => [u.first_name, u.last_name].filter(Boolean).join(" ") || "—",
      csvValue: (u) => [u.first_name, u.last_name].filter(Boolean).join(" "),
      sortValue: (u) => [u.first_name, u.last_name].filter(Boolean).join(" ").toLowerCase(),
    },
    title: {
      sortable: true,
      render: (u) => u.title ?? "—",
      csvValue: (u) => u.title ?? "",
    },
    phone: {
      render: (u) => u.phone ?? "—",
      csvValue: (u) => u.phone ?? "",
    },
    is_active: {
      sortable: true,
      render: (u) => (
        <span style={{
          ...grs.badge,
          background: u.is_active ? "var(--badge-active-bg)" : "var(--badge-inactive-bg)",
          color: u.is_active ? "var(--badge-active-fg)" : "var(--badge-inactive-fg)",
        }}>
          {u.is_active ? "Active" : "Inactive"}
        </span>
      ),
      csvValue: (u) => (u.is_active ? "Active" : "Inactive"),
      sortValue: (u) => (u.is_active ? 1 : 0),
    },
    email: {
      render: (u) => u.email ?? "—",
      csvValue: (u) => u.email ?? "",
    },
  };
  if (import.meta.env.DEV) {
    for (const key of USERS_FIELD_KEYS) {
      if (!(key in renderers)) {
        throw new Error(`UsersPage missing renderer for USERS_FIELDS key: ${key}`);
      }
    }
  }
  return renderers;
}

export default function UsersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  useBfcacheReload();

  const canManage = canManageUsers(user?.title);
  const [pendingDelete, setPendingDelete] = useState<{ id: number; username: string } | null>(null);

  const saved = usePersistedFilterRestore<{
    role?: string;
    search?: string;
    page?: number;
  }>(STORAGE_KEY);

  const PAGE_SIZE = 50;
  const [page, setPage] = useState(saved?.page ?? 1);
  const [roleFilter, setRoleFilter] = useState(saved?.role ?? "");
  const [searchQuery, setSearchQuery] = useState(saved?.search ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(saved?.search ?? "");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setDebouncedSearch(q); setPage(1); }, 300);
  };

  const { data: usersPage, isLoading } = useQuery({
    queryKey: ["users", debouncedSearch, roleFilter, page],
    queryFn: () => listUsersPaged({
      search: debouncedSearch || undefined,
      role: roleFilter || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  });
  const users = usersPage?.items ?? [];
  const userTotal = usersPage?.total ?? 0;

  const deleteMut = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  function saveFilters() {
    persistFilters(STORAGE_KEY, {
      role: roleFilter,
      search: searchQuery,
      page,
    });
  }

  // List columns, labels, visibility, order, and CSV headers all come from USERS_FIELDS.
  const { isVisible, orderedMetas } = useFieldConfig("users", USERS_FIELDS);
  const columns = useMemo<Col<User>[]>(() => {
    const renderers = userColRenderers();
    return orderedMetas
      .filter((m) => isVisible(m.key))
      .map((meta): Col<User> => {
        const r = renderers[meta.key] ?? {};
        return {
          key: meta.key,
          label: meta.label,
          sortable: r.sortable ?? true,
          render: r.render,
          csvValue: r.csvValue,
          sortValue: r.sortValue,
        };
      });
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
        pagination={{ page, pageSize: PAGE_SIZE, total: userTotal, onPageChange: setPage }}
        actions={canManage
          ? (u => ({
              onView: () => { saveFilters(); navigate(`/users/${u.id}`); },
              onEdit: () => { saveFilters(); navigate(`/users/${u.id}?edit=1`); },
              onDelete: () => setPendingDelete({ id: u.id, username: u.username }),
            }))
          : undefined}
        searchable
        searchPlaceholder="Search by name, username…"
        externalSearch={searchQuery}
        onExternalSearch={handleSearch}
        activeFilterCount={roleFilter ? 1 : 0}
        filters={
          <select
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            style={grs.filterSelect}
          >
            <option value="">All roles</option>
            {TITLES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        }
        exportFilename="users"
        printTitle="Users"
        onAdd={canManage ? () => { saveFilters(); navigate("/users/new"); } : undefined}
      />
      {pendingDelete && (
        <ConfirmDialog
          message={<>Delete user <strong>"{pendingDelete.username}"</strong>? This cannot be undone.</>}
          onConfirm={() => { deleteMut.mutate(pendingDelete.id); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
