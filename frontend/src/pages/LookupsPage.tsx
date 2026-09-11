import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

// ── Generic lookup item ───────────────────────────────────────────────────────
interface LookupItem { id: number; name?: string; reason?: string; category_id?: number }

type Tab = "categories" | "sub-categories" | "exam-categories" | "no-exam-reasons" | "no-admit-reasons" | "subjects";

interface TabDef {
  key: Tab;
  label: string;
  endpoint: string;
  nameField: "name" | "reason";
  hasParent?: boolean;        // sub-categories have category_id
  parentEndpoint?: string;
}

const TABS: TabDef[] = [
  { key: "categories",       label: "Categories",        endpoint: "/lookups/categories",       nameField: "name" },
  { key: "sub-categories",   label: "Sub-Categories",    endpoint: "/lookups/sub-categories",   nameField: "name", hasParent: true, parentEndpoint: "/lookups/categories" },
  { key: "exam-categories",  label: "Exam Categories",   endpoint: "/lookups/exam-categories",  nameField: "name" },
  { key: "no-exam-reasons",  label: "No-Exam Reasons",   endpoint: "/lookups/no-exam-reasons",  nameField: "reason" },
  { key: "no-admit-reasons", label: "No-Admit Reasons",  endpoint: "/lookups/no-admit-reasons", nameField: "reason" },
  { key: "subjects",         label: "Subjects",          endpoint: "/lookups/subjects",         nameField: "name" },
];


// ── Error Boundary ────────────────────────────────────────────────────────────
import React from "react";

class LookupErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(e: any) {
    return { error: String(e?.message ?? e) };
  }
  componentDidCatch(e: any, info: any) {
    console.error("[LookupsPage] render error:", e, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: "#fff5f5", border: "1px solid #fc8181", color: "#c53030", borderRadius: 6, padding: "16px", margin: "12px 0" }}>
          <strong>Error:</strong> {this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Single lookup table ───────────────────────────────────────────────────────
function LookupTable({ tab, isAdmin }: { tab: TabDef; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<LookupItem | null>(null);
  const [addValue, setAddValue] = useState("");
  const [addParent, setAddParent] = useState<number | "">("");
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LookupItem | null>(null);

  const { data: items = [], isLoading } = useQuery<LookupItem[]>({
    queryKey: [tab.key],
    queryFn: async () => { const r = await api.get(tab.endpoint); return Array.isArray(r.data) ? r.data : []; },
  });

  const { data: parents = [] } = useQuery<LookupItem[]>({
    queryKey: ["categories"],
    queryFn: async () => { const r = await api.get(tab.parentEndpoint!); return Array.isArray(r.data) ? r.data : []; },
    enabled: !!tab.hasParent,
  });

  const safeItems = Array.isArray(items) ? items : [];
  const safeParents = Array.isArray(parents) ? parents : [];
  const parentMap = new Map(safeParents.map((p) => [p.id, p.name ?? ""]));


  async function handleAdd() {
    const val = addValue.trim();
    if (!val) return;
    if (tab.hasParent && !addParent) { setError("Select a category."); return; }
    setError(null);
    try {
      const payload: Record<string, any> = { [tab.nameField]: val };
      if (tab.hasParent) payload.category_id = Number(addParent);
      const { data: newItem } = await api.post(tab.endpoint, payload);
      setAddValue("");
      setAddParent("");
      qc.setQueryData([tab.key], (old: LookupItem[] = []) => [...old, newItem]);
    } catch (e: any) {
      console.error("[handleAdd] error:", e);
      const det = e?.response?.data?.detail;
      setError(typeof det === "string" ? det : det ? JSON.stringify(det) : "Add failed.");
    }
  }

  async function handleEdit() {
    if (!editing) return;
    const val = editValue.trim();
    if (!val) return;
    setError(null);
    try {
      const { data: updated } = await api.put(`${tab.endpoint}/${editing.id}`, { [tab.nameField]: val });
      setEditing(null);
      qc.setQueryData([tab.key], (old: LookupItem[] = []) =>
        old.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (e: any) {
      const det = e?.response?.data?.detail;
      setError(typeof det === "string" ? det : det ? JSON.stringify(det) : "Update failed.");
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`${tab.endpoint}/${id}`);
      setConfirmDelete(null);
      qc.setQueryData([tab.key], (old: LookupItem[] = []) => old.filter((item) => item.id !== id));
    } catch (e: any) {
      const det = e?.response?.data?.detail;
      setError(typeof det === "string" ? det : det ? JSON.stringify(det) : "Delete failed — item may be in use.");
      setConfirmDelete(null);
    }
  }

  return (
    <div>
      {error && (
        <div style={{ background: "#fff5f5", border: "1px solid #fc8181", color: "#c53030", borderRadius: 6, padding: "8px 12px", fontSize: "0.85rem", marginBottom: 10 }}>
          {error}
        </div>
      )}

      {/* Add form (admin only) */}
      {isAdmin && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
          {tab.hasParent && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#4a5568" }}>Category</label>
              <select
                style={inp}
                value={addParent}
                onChange={(e) => setAddParent(Number(e.target.value) || "")}
              >
                <option value="">— select —</option>
                {safeParents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#4a5568" }}>
              New {tab.nameField === "reason" ? "reason" : "name"}
            </label>
            <input
              style={inp}
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={`Add new ${tab.nameField === "reason" ? "reason" : "name"}…`}
            />
          </div>
          <button onClick={handleAdd} style={btnPrimary} disabled={!addValue.trim()}>
            + Add
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <p style={{ color: "#718096" }}>Loading…</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#a0aec0", textAlign: "center", padding: "24px 0" }}>No items yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ background: "#ebf4ff" }}>
              <th style={th}>#</th>
              {tab.hasParent && <th style={th}>Category</th>}
              <th style={{ ...th, width: "100%" }}>
                {tab.nameField === "reason" ? "Reason" : "Name"}
              </th>
              {isAdmin && <th style={th}></th>}
            </tr>
          </thead>
          <tbody>
            {safeItems.map((item, i) => {
              const label = (item[tab.nameField] ?? "") as string;
              const isEditingThis = editing?.id === item.id;
              return (
                <tr key={item.id} style={{ background: i % 2 === 0 ? "#fff" : "#f7fafc" }}>
                  <td style={td}>{item.id}</td>
                  {tab.hasParent && (
                    <td style={{ ...td, fontSize: "0.8rem", color: "#718096" }}>
                      {parentMap.get(item.category_id ?? 0) ?? "—"}
                    </td>
                  )}
                  <td style={td}>
                    {isEditingThis ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          style={{ ...inp, flex: 1 }}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleEdit(); if (e.key === "Escape") setEditing(null); }}
                          autoFocus
                        />
                        <button onClick={handleEdit} style={btnPrimary}>Save</button>
                        <button onClick={() => setEditing(null)} style={btnSecondary}>×</button>
                      </div>
                    ) : (
                      label
                    )}
                  </td>
                  {isAdmin && (
                    <td style={{ ...td, whiteSpace: "nowrap", textAlign: "right" }}>
                      {!isEditingThis && (
                        <>
                          <button
                            onClick={() => { setEditing(item); setEditValue(label); setError(null); }}
                            style={{ background: "transparent", border: "1px solid #bee3f8", color: "#2c5282", borderRadius: 4, padding: "2px 10px", cursor: "pointer", fontSize: "0.78rem", marginRight: 4 }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDelete(item)}
                            style={{ background: "transparent", border: "1px solid #fc8181", color: "#c53030", borderRadius: 4, padding: "2px 10px", cursor: "pointer", fontSize: "0.78rem" }}
                          >
                            ×
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "#fff", borderRadius: 8, padding: "20px 24px", maxWidth: 340, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <p style={{ margin: "0 0 16px", color: "#2d3748", fontSize: "0.9rem" }}>
              Delete <strong>"{confirmDelete[tab.nameField] ?? ""}"</strong>?
              {tab.key === "categories" && (
                <span style={{ display: "block", marginTop: 6, color: "#c53030", fontSize: "0.8rem" }}>
                  ⚠️ This will also permanently delete all Sub-Categories under this category.
                </span>
              )}
              {tab.key !== "categories" && (
                <span style={{ display: "block", marginTop: 6, color: "#718096", fontSize: "0.8rem" }}>
                  This may affect existing records.
                </span>
              )}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDelete(null)} style={btnSecondary}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)} style={{ ...btnPrimary, background: "#c53030" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LookupsPage() {
  const { user } = useAuth();
  const isAdmin = user?.title === "Admin";
  const [activeTab, setActiveTab] = useState<Tab>("categories");

  const current = TABS.find((t) => t.key === activeTab)!;

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 4px", color: "#1a365d" }}>Lookup Tables</h2>
        <p style={{ margin: 0, color: "#718096", fontSize: "0.85rem" }}>
          Reference data used throughout the application.{" "}
          {isAdmin ? "You can add, edit, and delete items." : "Read-only for your role."}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 0, borderBottom: "2px solid #e2e8f0", marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              padding: "8px 16px", fontSize: "0.85rem",
              fontWeight: activeTab === t.key ? 700 : 400,
              color: activeTab === t.key ? "#2c5282" : "#718096",
              borderBottom: activeTab === t.key ? "2px solid #2c5282" : "2px solid transparent",
              marginBottom: -2,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <LookupErrorBoundary key={activeTab}><LookupTable tab={current} isAdmin={isAdmin} /></LookupErrorBoundary>
    </div>
  );
}

const inp: React.CSSProperties = {
  border: "1px solid #cbd5e0", borderRadius: 6,
  padding: "6px 10px", fontSize: "0.875rem",
  boxSizing: "border-box", width: "100%",
};
const btnPrimary: React.CSSProperties = {
  background: "#2c5282", color: "#fff", border: "none", borderRadius: 6,
  padding: "7px 16px", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, whiteSpace: "nowrap",
};
const btnSecondary: React.CSSProperties = {
  background: "#fff", color: "#4a5568", border: "1px solid #cbd5e0",
  borderRadius: 6, padding: "7px 12px", cursor: "pointer", fontSize: "0.875rem",
};
const th: React.CSSProperties = {
  padding: "9px 12px", textAlign: "left", fontWeight: 600,
  color: "#2c5282", borderBottom: "2px solid #bee3f8",
};
const td: React.CSSProperties = { padding: "9px 12px", borderBottom: "1px solid #e2e8f0" };
