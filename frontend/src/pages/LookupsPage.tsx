import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { grs } from "../styles/grs";

interface LookupItem { id: number; name?: string; reason?: string; category_id?: number }

type Tab = "categories" | "sub-categories" | "exam-categories" | "no-exam-reasons" | "no-admit-reasons" | "subjects" | "school-type-subjects";

interface TabDef {
  key: Tab;
  label: string;
  endpoint: string;
  nameField: "name" | "reason";
  hasParent?: boolean;
  parentEndpoint?: string;
}

const TABS: TabDef[] = [
  { key: "categories",       label: "Categories",       endpoint: "/lookups/categories",       nameField: "name" },
  { key: "sub-categories",   label: "Sub-Categories",   endpoint: "/lookups/sub-categories",   nameField: "name", hasParent: true, parentEndpoint: "/lookups/categories" },
  { key: "exam-categories",  label: "Exam Categories",  endpoint: "/lookups/exam-categories",  nameField: "name" },
  { key: "no-exam-reasons",  label: "No-Exam Reasons",  endpoint: "/lookups/no-exam-reasons",  nameField: "reason" },
  { key: "no-admit-reasons", label: "No-Admit Reasons", endpoint: "/lookups/no-admit-reasons", nameField: "reason" },
  { key: "subjects",         label: "Subjects",         endpoint: "/lookups/subjects",         nameField: "name" },
  { key: "school-type-subjects", label: "Subjects by School Type", endpoint: "/school-type-subjects", nameField: "name" },
];

import React from "react";
import { RowActions } from "../components/RowActions";

class LookupErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e: any) { return { error: String(e?.message ?? e) }; }
  componentDidCatch(e: any, info: any) { console.error("[LookupsPage] render error:", e, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ ...grs.errorBox, margin: "12px 0" }}>
          <strong>Error:</strong> {this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const parentMap = new Map(safeParents.map(p => [p.id, p.name ?? ""]));

  async function handleAdd() {
    const val = addValue.trim();
    if (!val) return;
    if (tab.hasParent && !addParent) { setError("Select a category."); return; }
    setError(null);
    try {
      const payload: Record<string, any> = { [tab.nameField]: val };
      if (tab.hasParent) payload.category_id = Number(addParent);
      const { data: newItem } = await api.post(tab.endpoint, payload);
      setAddValue(""); setAddParent("");
      qc.setQueryData([tab.key], (old: LookupItem[] = []) => [...old, newItem]);
    } catch (e: any) {
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
      qc.setQueryData([tab.key], (old: LookupItem[] = []) => old.map(item => item.id === updated.id ? updated : item));
    } catch (e: any) {
      const det = e?.response?.data?.detail;
      setError(typeof det === "string" ? det : det ? JSON.stringify(det) : "Update failed.");
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`${tab.endpoint}/${id}`);
      setConfirmDelete(null);
      qc.setQueryData([tab.key], (old: LookupItem[] = []) => old.filter(item => item.id !== id));
    } catch (e: any) {
      const det = e?.response?.data?.detail;
      setError(typeof det === "string" ? det : det ? JSON.stringify(det) : "Delete failed — item may be in use.");
      setConfirmDelete(null);
    }
  }

  return (
    <div>
      {error && <div style={{ ...grs.errorBox, marginBottom: 10 }}>{error}</div>}

      {isAdmin && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
          {tab.hasParent && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <label style={grs.fieldLabel}>Category</label>
              <select style={{ ...grs.select, width: "auto", minWidth: 160 }} value={addParent} onChange={e => setAddParent(Number(e.target.value) || "")}>
                <option value="">— select —</option>
                {safeParents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 200 }}>
            <label style={grs.fieldLabel}>New {tab.nameField === "reason" ? "reason" : "name"}</label>
            <input
              style={grs.input}
              value={addValue}
              onChange={e => setAddValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder={`Add new ${tab.nameField === "reason" ? "reason" : "name"}…`}
            />
          </div>
          <button onClick={handleAdd} style={{ ...grs.btnPrimary, whiteSpace: "nowrap" }} disabled={!addValue.trim()}>+ Add</button>
        </div>
      )}

      {isLoading ? (
        <p style={grs.muted}>Loading…</p>
      ) : safeItems.length === 0 ? (
        <p style={{ ...grs.muted, textAlign: "center", padding: "24px 0" }}>No items yet.</p>
      ) : (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr>
                <th className="grs-thead-th" style={grs.th}>#</th>
                {tab.hasParent && <th className="grs-thead-th" style={grs.th}>Category</th>}
                <th className="grs-thead-th" style={{ ...grs.th, width: "100%" }}>
                  {tab.nameField === "reason" ? "Reason" : "Name"}
                </th>
                {isAdmin && <th className="grs-thead-th" style={{ ...grs.th, width: 96, position: "sticky", right: 0, background: "var(--bg-thead)" }}></th>}
              </tr>
            </thead>
            <tbody>
              {safeItems.map((item, i) => {
                const label = (item[tab.nameField] ?? "") as string;
                const isEditingThis = editing?.id === item.id;
                return (
                  <tr key={item.id} style={{ background: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-input)" }}>
                    <td style={{ ...grs.td, width: 50 }}>{item.id}</td>
                    {tab.hasParent && (
                      <td style={{ ...grs.td, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {parentMap.get(item.category_id ?? 0) ?? "—"}
                      </td>
                    )}
                    <td style={grs.td}>
                      {isEditingThis ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            style={{ ...grs.input, flex: 1 }}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleEdit(); if (e.key === "Escape") setEditing(null); }}
                            autoFocus
                          />
                          <button onClick={handleEdit} style={grs.btnPrimary}>Save</button>
                          <button onClick={() => setEditing(null)} style={grs.btnSecondary}>×</button>
                        </div>
                      ) : label}
                    </td>
                    {isAdmin && (
                      <td style={{ ...grs.td, textAlign: "right", width: 96, position: "sticky", right: 0, background: "var(--bg-card)", borderLeft: "1px solid var(--border)" }}>
                        {!isEditingThis && (
                          <RowActions
                            onEdit={() => { setEditing(item); setEditValue(label); setError(null); }}
                            onDelete={() => setConfirmDelete(item)}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmDelete && (
        <div style={grs.overlay}>
          <div style={{ ...grs.modal, width: 340 }}>
            <p style={{ margin: "0 0 16px", color: "var(--text-primary)", fontSize: "0.9rem" }}>
              Delete <strong>"{confirmDelete[tab.nameField] ?? ""}"</strong>?
              {tab.key === "categories" && (
                <span style={{ display: "block", marginTop: 6, color: "var(--status-danger-fg)", fontSize: "0.8rem" }}>
                  ⚠️ This will also permanently delete all Sub-Categories under this category.
                </span>
              )}
              {tab.key !== "categories" && (
                <span style={{ display: "block", marginTop: 6, color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  This may affect existing records.
                </span>
              )}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDelete(null)} style={grs.btnSecondary}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)} style={{ ...grs.btnPrimary, background: "var(--status-danger-fg)" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const SCHOOL_TYPES = ["EMRS", "JNV", "KSP", "MRS", "GNV", "KGBV", "SportsBoys", "SportsGirls", "Other"];

interface SubjectRef { id: number; name: string; }
interface SchoolTypeSubjectRow { id: number; school_type: string; subjects: SubjectRef[]; }

function SchoolTypeSubjectsTable({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // local matrix state: schoolType -> Set<subjectId>
  const [checked, setChecked] = useState<Map<string, Set<number>>>(new Map());
  const [initialized, setInitialized] = useState(false);

  const { data: rows = [], isLoading: loadingRows, isFetching: fetchingRows } = useQuery<SchoolTypeSubjectRow[]>({
    queryKey: ["school-type-subjects"],
    queryFn: async () => (await api.get("/school-type-subjects")).data,
  });
  const { data: allSubjects = [], isLoading: loadingSubjects } = useQuery<SubjectRef[]>({
    queryKey: ["subjects"],
    queryFn: async () => (await api.get("/lookups/subjects")).data,
  });

  // server map: schoolType -> { id, subjectIds }
  const serverMap = useMemo(() => {
    const m = new Map<string, { id: number; subjectIds: Set<number> }>();
    for (const row of rows) {
      m.set(row.school_type, { id: row.id, subjectIds: new Set(row.subjects.map(s => s.id)) });
    }
    return m;
  }, [rows]);

  // initialize local state from server data — guard fetchingRows so background refetch
  // completes before we re-initialize (isLoading stays false during background refetch)
  useEffect(() => {
    if (!loadingRows && !fetchingRows && !loadingSubjects && !initialized && rows !== undefined) {
      const init = new Map<string, Set<number>>();
      for (const st of SCHOOL_TYPES) {
        init.set(st, new Set(serverMap.get(st)?.subjectIds ?? []));
      }
      setChecked(init);
      setInitialized(true);
    }
  }, [loadingRows, fetchingRows, loadingSubjects, serverMap, initialized, rows]);

  // dirty rows: local differs from server
  const dirtyTypes = useMemo(() => {
    if (!initialized) return new Set<string>();
    const dirty = new Set<string>();
    for (const st of SCHOOL_TYPES) {
      const local = checked.get(st) ?? new Set<number>();
      const server = serverMap.get(st)?.subjectIds ?? new Set<number>();
      if (local.size !== server.size || [...local].some(id => !server.has(id))) {
        dirty.add(st);
      }
    }
    return dirty;
  }, [checked, serverMap, initialized]);

  function toggle(schoolType: string, subjectId: number) {
    if (!isAdmin) return;
    setChecked(prev => {
      const next = new Map(prev);
      const cur = new Set(next.get(schoolType) ?? []);
      if (cur.has(subjectId)) cur.delete(subjectId); else cur.add(subjectId);
      next.set(schoolType, cur);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true); setError(null);
    try {
      await Promise.all([...dirtyTypes].map(st => {
        const subjectIds = [...(checked.get(st) ?? [])];
        const existing = serverMap.get(st);
        return existing
          ? api.patch(`/school-type-subjects/${existing.id}`, { subject_ids: subjectIds })
          : api.post("/school-type-subjects", { school_type: st, subject_ids: subjectIds });
      }));
      setInitialized(false);
      await qc.invalidateQueries({ queryKey: ["school-type-subjects"] });
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Save failed.");
      // Re-sync after partial save: some rows may have already committed
      setInitialized(false);
      await qc.invalidateQueries({ queryKey: ["school-type-subjects"] });
    } finally {
      setSaving(false);
    }
  }

  const thBase: React.CSSProperties = {
    padding: "8px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.05em", color: "var(--text-secondary)", borderBottom: "2px solid var(--border)",
    background: "var(--bg-thead)", whiteSpace: "nowrap",
  };
  const tdBase: React.CSSProperties = {
    padding: "8px 10px", borderBottom: "1px solid var(--border)",
    textAlign: "center", verticalAlign: "middle",
  };

  const isLoading = loadingRows || loadingSubjects || !initialized;

  return (
    <div>
      {error && <div style={{ ...grs.errorBox, marginBottom: 10 }}>{error}</div>}

      {dirtyTypes.size > 0 && (
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...grs.btnPrimary, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : `Save Changes (${dirtyTypes.size} row${dirtyTypes.size > 1 ? "s" : ""})`}
          </button>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {[...dirtyTypes].join(", ")} {dirtyTypes.size === 1 ? "has" : "have"} unsaved changes
          </span>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: 30, textAlign: "center", color: "var(--text-secondary)" }}>Loading…</div>
      ) : allSubjects.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", color: "var(--text-secondary)" }}>
          No subjects defined yet. Add subjects in the Subjects tab first.
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
          <table style={{ borderCollapse: "collapse", background: "var(--bg-card)", minWidth: "100%" }}>
            <thead>
              <tr>
                <th style={{ ...thBase, textAlign: "left", minWidth: 120, position: "sticky", left: 0, zIndex: 2, background: "var(--bg-thead)" }}>
                  School Type
                </th>
                {allSubjects.map(s => (
                  <th key={s.id} style={{ ...thBase, minWidth: 90 }}>
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCHOOL_TYPES.map((st, i) => {
                const isDirty = dirtyTypes.has(st);
                const rowBg = isDirty
                  ? "var(--dirty-row-bg, rgba(251,191,36,0.08))"
                  : i % 2 === 0 ? "var(--bg-card)" : "var(--bg-row-alt, var(--bg-card))";
                return (
                  <tr key={st} style={{ background: rowBg }}>
                    <td style={{
                      ...tdBase, textAlign: "left", fontWeight: 600,
                      color: isDirty ? "var(--badge-yellow-fg, #92400e)" : "var(--text-primary)",
                      position: "sticky", left: 0, zIndex: 1,
                      background: rowBg,
                      boxShadow: "2px 0 4px -2px rgba(0,0,0,0.08)",
                    }}>
                      {st}
                      {isDirty && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--badge-yellow-fg, #92400e)" }}>●</span>}
                    </td>
                    {allSubjects.map(s => (
                      <td key={s.id} style={tdBase}>
                        <input
                          type="checkbox"
                          disabled={!isAdmin}
                          checked={checked.get(st)?.has(s.id) ?? false}
                          onChange={() => toggle(st, s.id)}
                          style={{ width: 16, height: 16, cursor: isAdmin ? "pointer" : "default", accentColor: "var(--badge-blue-fg)" }}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function LookupsPage() {
  const { user } = useAuth();
  const isAdmin = user?.title === "Admin";
  const [activeTab, setActiveTab] = useState<Tab>("categories");
  const current = TABS.find(t => t.key === activeTab)!;

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 4px", color: "var(--text-primary)" }}>Lookup Tables</h2>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          Reference data used throughout the application.{" "}
          {isAdmin ? "You can add, edit, and delete items." : "Read-only for your role."}
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 0, borderBottom: "2px solid var(--border)", marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              padding: "8px 16px", fontSize: "0.85rem",
              fontWeight: activeTab === t.key ? 700 : 400,
              color: activeTab === t.key ? "var(--badge-blue-fg)" : "var(--text-secondary)",
              borderBottom: activeTab === t.key ? "2px solid var(--badge-blue-fg)" : "2px solid transparent",
              marginBottom: -2,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <LookupErrorBoundary key={activeTab}>
        {activeTab === "school-type-subjects"
          ? <SchoolTypeSubjectsTable isAdmin={isAdmin} />
          : <LookupTable tab={current} isAdmin={isAdmin} />}
      </LookupErrorBoundary>
    </div>
  );
}
