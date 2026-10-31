import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { canManageLookupsUser } from "../constants/roles";
import { RowCountBadge } from "@parivaar/ui";
import { grs } from "../styles/grs";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { GrsModal } from "../components/GrsModal";
import { GrsTabs } from "../components/GrsTabs";
import { donorFieldLabel } from "../constants/donorsFields";
import type { Donor } from "../api/donors";

interface LookupItem { id: number; name?: string; reason?: string; category_id?: number }

/** Normalize axios/FastAPI errors so Add failures are never silent. */
function formatApiError(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: unknown }; message?: string };
  const data = err?.response?.data;
  let detail: unknown;
  if (data && typeof data === "object" && data !== null && "detail" in data) {
    detail = (data as { detail: unknown }).detail;
  } else if (typeof data === "string") {
    detail = data;
  }
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  if (detail != null) {
    try { return JSON.stringify(detail); } catch { /* ignore */ }
  }
  if (typeof err?.message === "string" && err.message.trim()) return err.message;
  return fallback;
}

function asItemList(old: unknown): LookupItem[] {
  return Array.isArray(old) ? (old as LookupItem[]) : [];
}

type Tab =
  | "categories"
  | "sub-categories"
  | "exam-categories"
  | "no-exam-reasons"
  | "no-admit-reasons"
  | "subjects"
  | "exam-type-subjects"
  | "school-types"
  | "exam-types"
  | "donors";

interface TabDef {
  key: Tab;
  label: string;
  endpoint: string;
  nameField: "name" | "reason";
  hasParent?: boolean;
  parentEndpoint?: string;
}

const TABS: TabDef[] = [
  { key: "categories",         label: "Categories",           endpoint: "/lookups/categories",       nameField: "name" },
  { key: "sub-categories",     label: "Sub-Categories",       endpoint: "/lookups/sub-categories",   nameField: "name", hasParent: true, parentEndpoint: "/lookups/categories" },
  { key: "exam-categories",    label: "Exam Categories",      endpoint: "/lookups/exam-categories",  nameField: "name" },
  { key: "no-exam-reasons",    label: "No-Exam Reasons",      endpoint: "/lookups/no-exam-reasons",  nameField: "reason" },
  { key: "no-admit-reasons",   label: "No-Admit Reasons",     endpoint: "/lookups/no-admit-reasons", nameField: "reason" },
  { key: "school-types",       label: "School Types",         endpoint: "/lookups/school-types",     nameField: "name" },
  { key: "exam-types",         label: "Exam Types",           endpoint: "/lookups/exam-types",       nameField: "name" },
  { key: "subjects",           label: "Subjects",             endpoint: "/lookups/subjects",         nameField: "name" },
  { key: "exam-type-subjects", label: "Subjects by Exam Type", endpoint: "/lookups/exam-type-subjects",     nameField: "name" },
  { key: "donors",             label: "Donors",               endpoint: "/donors",                   nameField: "name" },
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
  const [saving, setSaving] = useState(false);

  const { data: items = [], isLoading, isError, error: loadError, refetch } = useQuery<LookupItem[]>({
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
    if (!val || saving) return;
    if (tab.hasParent && !addParent) { setError("Select a category."); return; }
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { [tab.nameField]: val };
      if (tab.hasParent) payload.category_id = Number(addParent);
      const { data: newItem } = await api.post<LookupItem>(tab.endpoint, payload);
      if (!newItem || typeof newItem !== "object" || newItem.id == null) {
        setAddValue(""); setAddParent("");
        await qc.invalidateQueries({ queryKey: [tab.key] });
        setError("Created, but the server returned an empty body — refreshed the list.");
        return;
      }
      setAddValue(""); setAddParent("");
      qc.setQueryData([tab.key], (old: unknown) => {
        const prev = asItemList(old);
        if (prev.some(i => i.id === newItem.id)) return prev;
        return [...prev, newItem];
      });
      await qc.invalidateQueries({ queryKey: [tab.key] });
    } catch (e: unknown) {
      setError(formatApiError(e, "Add failed."));
      // Create may have landed despite a client-side follow-up error — refresh.
      await qc.invalidateQueries({ queryKey: [tab.key] });
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!editing || saving) return;
    const val = editValue.trim();
    if (!val) return;
    setError(null);
    setSaving(true);
    try {
      const { data: updated } = await api.put<LookupItem>(`${tab.endpoint}/${editing.id}`, { [tab.nameField]: val });
      setEditing(null);
      qc.setQueryData([tab.key], (old: unknown) =>
        asItemList(old).map(item => (item.id === updated?.id ? updated : item)),
      );
      await qc.invalidateQueries({ queryKey: [tab.key] });
    } catch (e: unknown) {
      setError(formatApiError(e, "Update failed."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`${tab.endpoint}/${id}`);
      setConfirmDelete(null);
      qc.setQueryData([tab.key], (old: unknown) => asItemList(old).filter(item => item.id !== id));
      await qc.invalidateQueries({ queryKey: [tab.key] });
    } catch (e: unknown) {
      setError(formatApiError(e, "Delete failed — item may be in use."));
      setConfirmDelete(null);
    }
  }

  return (
    <div>
      {error && <div style={{ ...grs.errorBox, marginBottom: 10 }}>{error}</div>}

      {isAdmin && (
        <div className="grs-lookup-add-row">
          {tab.hasParent && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              <label style={grs.fieldLabel}>Category</label>
              <select style={{ ...grs.select, width: "100%", maxWidth: "100%" }} value={addParent} onChange={e => setAddParent(Number(e.target.value) || "")} disabled={saving}>
                <option value="">— select —</option>
                {safeParents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="grs-lookup-add-row__main">
            <div className="grs-lookup-add-row__grow">
              <label style={grs.fieldLabel}>New {tab.nameField === "reason" ? "reason" : "name"}</label>
              <input
                style={grs.input}
                value={addValue}
                onChange={e => setAddValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleAdd();
                  }
                }}
                placeholder={`Add new ${tab.nameField === "reason" ? "reason" : "name"}…`}
                disabled={saving}
              />
            </div>
            <button
              type="button"
              className="grs-lookup-add-row__btn"
              onClick={() => { void handleAdd(); }}
              style={{ ...grs.btnPrimary, whiteSpace: "nowrap", opacity: saving ? 0.7 : 1 }}
              disabled={!addValue.trim() || saving}
            >
              {saving ? "Adding…" : "+ Add"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p style={grs.muted}>Loading…</p>
      ) : isError ? (
        <div style={{ ...grs.errorBox, textAlign: "center", padding: 16 }}>
          {formatApiError(loadError, "Failed to load items.")}
          <div style={{ marginTop: 10 }}>
            <button type="button" onClick={() => { void refetch(); }} style={grs.btnSecondary}>Retry</button>
          </div>
        </div>
      ) : safeItems.length === 0 ? (
        <p style={{ ...grs.muted, textAlign: "center", padding: "24px 0" }}>No items yet.</p>
      ) : (
        <div>
          <div style={{ marginBottom: 8 }}>
            <RowCountBadge count={safeItems.length} />
          </div>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr>
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
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={<>Delete <strong>"{confirmDelete[tab.nameField] ?? ""}"</strong>?</>}
          detail={
            tab.key === "categories"
              ? "⚠️ This will also permanently delete all Sub-Categories under this category."
              : "This may affect existing records."
          }
          detailDanger={tab.key === "categories"}
          onConfirm={() => { void handleDelete(confirmDelete.id); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}


interface SubjectRef { id: number; name: string; }
interface ExamTypeSubjectRow { id: number; name: string; subjects: SubjectRef[]; }

function ExamTypeSubjectsTable({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checked, setChecked] = useState<Map<number, Set<number>>>(new Map());
  const [initialized, setInitialized] = useState(false);

  const { data: rows = [], isLoading: loadingRows, isFetching: fetchingRows } = useQuery<ExamTypeSubjectRow[]>({
    queryKey: ["exam-type-subjects"],
    queryFn: async () => (await api.get("/lookups/exam-type-subjects")).data,
  });
  const { data: allSubjects = [], isLoading: loadingSubjects } = useQuery<SubjectRef[]>({
    queryKey: ["subjects"],
    queryFn: async () => (await api.get("/lookups/subjects")).data,
  });

  // server map: examTypeId -> Set<subjectId>
  const serverMap = useMemo(() => {
    const m = new Map<number, Set<number>>();
    for (const row of rows) m.set(row.id, new Set((row.subjects ?? []).map(s => s.id)));
    return m;
  }, [rows]);

  useEffect(() => {
    if (!loadingRows && !fetchingRows && !loadingSubjects && !initialized && rows !== undefined) {
      const init = new Map<number, Set<number>>();
      for (const row of rows) init.set(row.id, new Set(serverMap.get(row.id) ?? []));
      setChecked(init);
      setInitialized(true);
    }
  }, [loadingRows, fetchingRows, loadingSubjects, serverMap, initialized, rows]);

  const dirtyIds = useMemo(() => {
    if (!initialized) return new Set<number>();
    const dirty = new Set<number>();
    for (const row of rows) {
      const local = checked.get(row.id) ?? new Set<number>();
      const server = serverMap.get(row.id) ?? new Set<number>();
      if (local.size !== server.size || [...local].some(id => !server.has(id))) dirty.add(row.id);
    }
    return dirty;
  }, [checked, serverMap, initialized, rows]);

  function toggle(examTypeId: number, subjectId: number) {
    if (!isAdmin) return;
    setChecked(prev => {
      const next = new Map(prev);
      const cur = new Set(next.get(examTypeId) ?? []);
      if (cur.has(subjectId)) cur.delete(subjectId); else cur.add(subjectId);
      next.set(examTypeId, cur);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true); setError(null);
    try {
      await Promise.all([...dirtyIds].map(etId => {
        const subjectIds = [...(checked.get(etId) ?? [])];
        return api.put(`/lookups/exam-type-subjects/${etId}`, { subject_ids: subjectIds });
      }));
      setInitialized(false);
      await qc.invalidateQueries({ queryKey: ["exam-type-subjects"] });
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Save failed.");
      setInitialized(false);
      await qc.invalidateQueries({ queryKey: ["exam-type-subjects"] });
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

      {dirtyIds.size > 0 && (
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={handleSave} disabled={saving} style={{ ...grs.btnPrimary, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : `Save Changes (${dirtyIds.size} row${dirtyIds.size > 1 ? "s" : ""})`}
          </button>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {rows.filter(r => dirtyIds.has(r.id)).map(r => r.name).join(", ")} {dirtyIds.size === 1 ? "has" : "have"} unsaved changes
          </span>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: 30, textAlign: "center", color: "var(--text-secondary)" }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", color: "var(--text-secondary)" }}>
          No exam types defined yet. Add exam types in the Exam Types tab first.
        </div>
      ) : allSubjects.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", color: "var(--text-secondary)" }}>
          No subjects defined yet. Add subjects in the Subjects tab first.
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 8 }}>
            <RowCountBadge count={rows.length} />
          </div>
          <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
          <table style={{ borderCollapse: "collapse", background: "var(--bg-card)", minWidth: "100%" }}>
            <thead>
              <tr>
                <th style={{ ...thBase, textAlign: "left", minWidth: 140, position: "sticky", left: 0, zIndex: 2, background: "var(--bg-thead)" }}>
                  Exam Type
                </th>
                {allSubjects.map(s => (
                  <th key={s.id} style={{ ...thBase, minWidth: 90 }}>{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isDirty = dirtyIds.has(row.id);
                const rowBg = isDirty
                  ? "var(--dirty-row-bg, rgba(251,191,36,0.08))"
                  : i % 2 === 0 ? "var(--bg-card)" : "var(--bg-row-alt, var(--bg-card))";
                return (
                  <tr key={row.id} style={{ background: rowBg }}>
                    <td style={{
                      ...tdBase, textAlign: "left", fontWeight: 600,
                      color: isDirty ? "var(--badge-yellow-fg, #92400e)" : "var(--text-primary)",
                      position: "sticky", left: 0, zIndex: 1, background: rowBg,
                      boxShadow: "2px 0 4px -2px rgba(0,0,0,0.08)",
                    }}>
                      {row.name}
                      {isDirty && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--badge-yellow-fg, #92400e)" }}>●</span>}
                    </td>
                    {allSubjects.map(s => (
                      <td key={s.id} style={tdBase}>
                        <input
                          type="checkbox"
                          disabled={!isAdmin}
                          checked={checked.get(row.id)?.has(s.id) ?? false}
                          onChange={() => toggle(row.id, s.id)}
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
        </div>
      )}
    </div>
  );
}




interface ExamTypeItem { id: number; name: string; school_types: SchoolTypeRef[] }
interface SchoolTypeRef { id: number; name: string }

function ExamTypesTable({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const [addName, setAddName] = useState("");
  const [addSchoolTypeIds, setAddSchoolTypeIds] = useState<number[]>([]);
  const [editing, setEditing] = useState<ExamTypeItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editSchoolTypeIds, setEditSchoolTypeIds] = useState<number[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<ExamTypeItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery<ExamTypeItem[]>({
    queryKey: ["exam-types"],
    queryFn: async () => (await api.get("/lookups/exam-types")).data,
  });
  const { data: schoolTypes = [] } = useQuery<SchoolTypeRef[]>({
    queryKey: ["school-types"],
    queryFn: async () => {
      const r = await api.get("/lookups/school-types");
      return Array.isArray(r.data) ? r.data : [];
    },
  });

  function toggleAdd(id: number) {
    setAddSchoolTypeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleEdit(id: number) {
    setEditSchoolTypeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleAdd() {
    const name = addName.trim();
    if (!name) return;
    setError(null);
    try {
      const { data: newItem } = await api.post<ExamTypeItem>("/lookups/exam-types", { name, school_type_ids: addSchoolTypeIds });
      setAddName(""); setAddSchoolTypeIds([]);
      qc.setQueryData(["exam-types"], (old: unknown) => {
        const prev = Array.isArray(old) ? (old as ExamTypeItem[]) : [];
        if (newItem?.id != null && prev.some(i => i.id === newItem.id)) return prev;
        return newItem ? [...prev, newItem] : prev;
      });
      await qc.invalidateQueries({ queryKey: ["exam-types"] });
    } catch (e: unknown) {
      setError(formatApiError(e, "Add failed."));
      await qc.invalidateQueries({ queryKey: ["exam-types"] });
    }
  }

  async function handleEdit() {
    if (!editing) return;
    setError(null);
    try {
      const { data: updated } = await api.put(`/lookups/exam-types/${editing.id}`, { name: editName.trim(), school_type_ids: editSchoolTypeIds });
      setEditing(null);
      qc.setQueryData(["exam-types"], (old: ExamTypeItem[] = []) => old.map(item => item.id === updated.id ? updated : item));
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Update failed.");
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/lookups/exam-types/${id}`);
      setConfirmDelete(null);
      qc.setQueryData(["exam-types"], (old: ExamTypeItem[] = []) => old.filter(item => item.id !== id));
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Delete failed — item may be in use.");
      setConfirmDelete(null);
    }
  }

  const chipStyle: React.CSSProperties = {
    display: "inline-block", marginRight: 4, marginBottom: 2,
    padding: "1px 9px", borderRadius: 12, fontSize: "0.75rem",
    background: "var(--badge-blue-bg)", color: "var(--badge-blue-fg)", fontWeight: 600,
  };

  return (
    <div>
      {error && <div style={{ ...grs.errorBox, marginBottom: 10 }}>{error}</div>}

      {isAdmin && (
        <div style={{ marginBottom: 16, padding: 14, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }}>
          <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: "0.85rem" }}>Add Exam Type</p>
          <div className="grs-lookup-add-row" style={{ marginBottom: 0 }}>
            <div className="grs-lookup-add-row__main">
              <div className="grs-lookup-add-row__grow">
                <label style={grs.fieldLabel}>Name</label>
                <input style={grs.input} value={addName} onChange={e => setAddName(e.target.value)}
                  placeholder="e.g. MP Tribals" onKeyDown={e => e.key === "Enter" && handleAdd()} />
              </div>
              <button type="button" className="grs-lookup-add-row__btn" onClick={handleAdd} style={{ ...grs.btnPrimary, whiteSpace: "nowrap" }} disabled={!addName.trim()}>+ Add</button>
            </div>
            {schoolTypes.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={grs.fieldLabel}>School Types</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {schoolTypes.map(st => (
                    <label key={st.id} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: "0.85rem" }}>
                      <input type="checkbox" checked={addSchoolTypeIds.includes(st.id)} onChange={() => toggleAdd(st.id)} />
                      {st.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <p style={grs.muted}>Loading…</p>
      ) : items.length === 0 ? (
        <p style={{ ...grs.muted, textAlign: "center", padding: "24px 0" }}>No exam types yet.</p>
      ) : (
        <div>
          <div style={{ marginBottom: 8 }}>
            <RowCountBadge count={items.length} />
          </div>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr>
                <th className="grs-thead-th" style={grs.th}>Name</th>
                <th className="grs-thead-th" style={{ ...grs.th, width: "100%" }}>School Types</th>
                {isAdmin && <th className="grs-thead-th" style={{ ...grs.th, width: 96, position: "sticky", right: 0, background: "var(--bg-thead)" }}></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} style={{ background: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-input)" }}>
                  <td style={{ ...grs.td, fontWeight: 600, whiteSpace: "nowrap" }}>{item.name}</td>
                  <td style={grs.td}>
                    {item.school_types.length === 0
                      ? <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>—</span>
                      : item.school_types.map(st => <span key={st.id} style={chipStyle}>{st.name}</span>)}
                  </td>
                  {isAdmin && (
                    <td style={{ ...grs.td, textAlign: "right", width: 96, position: "sticky", right: 0, background: "var(--bg-card)", borderLeft: "1px solid var(--border)" }}>
                      <RowActions
                        onEdit={() => { setEditing(item); setEditName(item.name); setEditSchoolTypeIds(item.school_types.map(s => s.id)); setError(null); }}
                        onDelete={() => setConfirmDelete(item)}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {editing && (
        <GrsModal title="Edit Exam Type" onClose={() => setEditing(null)} width={440}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={grs.fieldLabel}>Name</label>
              <input style={grs.input} value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
            </div>
            {schoolTypes.length > 0 && (
              <div>
                <label style={grs.fieldLabel}>School Types</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                  {schoolTypes.map(st => (
                    <label key={st.id} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: "0.85rem" }}>
                      <input type="checkbox" checked={editSchoolTypeIds.includes(st.id)} onChange={() => toggleEdit(st.id)} />
                      {st.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {error && <div style={grs.errorBox}>{error}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setEditing(null)} style={grs.btnSecondary}>Cancel</button>
              <button onClick={handleEdit} style={grs.btnPrimary} disabled={!editName.trim()}>Save</button>
            </div>
          </div>
        </GrsModal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={<>Delete <strong>"{confirmDelete.name}"</strong>?</>}
          detail="This may affect existing records."
          onConfirm={() => { void handleDelete(confirmDelete.id); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function DonorsTable({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [editing, setEditing] = useState<Donor | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Donor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: items = [], isLoading, isError, error: loadError, refetch } = useQuery<Donor[]>({
    queryKey: ["donors"],
    queryFn: async () => {
      const r = await api.get("/donors");
      return Array.isArray(r.data) ? r.data : [];
    },
  });

  async function handleAdd() {
    const name = addName.trim();
    if (!name || saving) return;
    setError(null);
    setSaving(true);
    try {
      const { data: newItem } = await api.post<Donor>("/donors", {
        name,
        email: addEmail.trim() || null,
        phone: addPhone.trim() || null,
        notes: addNotes.trim() || null,
      });
      setAddName("");
      setAddEmail("");
      setAddPhone("");
      setAddNotes("");
      qc.setQueryData(["donors"], (old: unknown) => {
        const prev = Array.isArray(old) ? (old as Donor[]) : [];
        if (newItem?.id != null && prev.some((i) => i.id === newItem.id)) return prev;
        return newItem ? [...prev, newItem] : prev;
      });
      await qc.invalidateQueries({ queryKey: ["donors"] });
    } catch (e: unknown) {
      setError(formatApiError(e, "Add failed."));
      await qc.invalidateQueries({ queryKey: ["donors"] });
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!editing || saving) return;
    const name = editName.trim();
    if (!name) return;
    setError(null);
    setSaving(true);
    try {
      const { data: updated } = await api.put<Donor>(`/donors/${editing.id}`, {
        name,
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
        notes: editNotes.trim() || null,
      });
      setEditing(null);
      qc.setQueryData(["donors"], (old: unknown) =>
        (Array.isArray(old) ? (old as Donor[]) : []).map((item) =>
          item.id === updated?.id ? updated : item,
        ),
      );
      await qc.invalidateQueries({ queryKey: ["donors"] });
    } catch (e: unknown) {
      setError(formatApiError(e, "Update failed."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/donors/${id}`);
      setConfirmDelete(null);
      qc.setQueryData(["donors"], (old: unknown) =>
        (Array.isArray(old) ? (old as Donor[]) : []).filter((item) => item.id !== id),
      );
      await qc.invalidateQueries({ queryKey: ["donors"] });
    } catch (e: unknown) {
      setError(formatApiError(e, "Delete failed — donor may be linked to a Kutir."));
      setConfirmDelete(null);
    }
  }

  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div>
      {error && <div style={{ ...grs.errorBox, marginBottom: 10 }}>{error}</div>}

      {isAdmin && (
        <div style={{ marginBottom: 16, padding: 14, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }}>
          <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: "0.85rem" }}>Add Donor</p>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 160 }}>
              <label style={grs.fieldLabel}>{donorFieldLabel("name", { required: true })}</label>
              <input
                style={grs.input}
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Donor name"
                onKeyDown={(e) => e.key === "Enter" && void handleAdd()}
                disabled={saving}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 160 }}>
              <label style={grs.fieldLabel}>{donorFieldLabel("email")}</label>
              <input
                style={grs.input}
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="email@example.com"
                disabled={saving}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 120 }}>
              <label style={grs.fieldLabel}>{donorFieldLabel("phone")}</label>
              <input
                style={grs.input}
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                placeholder="Phone"
                disabled={saving}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 2, minWidth: 160 }}>
              <label style={grs.fieldLabel}>{donorFieldLabel("notes")}</label>
              <input
                style={grs.input}
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="Optional notes"
                disabled={saving}
              />
            </div>
            <button
              type="button"
              onClick={() => { void handleAdd(); }}
              style={{ ...grs.btnPrimary, whiteSpace: "nowrap", opacity: saving ? 0.7 : 1 }}
              disabled={!addName.trim() || saving}
            >
              {saving ? "Adding…" : "+ Add"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p style={grs.muted}>Loading…</p>
      ) : isError ? (
        <div style={{ ...grs.errorBox, textAlign: "center", padding: 16 }}>
          {formatApiError(loadError, "Failed to load donors.")}
          <div style={{ marginTop: 10 }}>
            <button type="button" onClick={() => { void refetch(); }} style={grs.btnSecondary}>Retry</button>
          </div>
        </div>
      ) : safeItems.length === 0 ? (
        <p style={{ ...grs.muted, textAlign: "center", padding: "24px 0" }}>No donors yet.</p>
      ) : (
        <div>
          <div style={{ marginBottom: 8 }}>
            <RowCountBadge count={safeItems.length} />
          </div>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr>
                  <th className="grs-thead-th" style={grs.th}>{donorFieldLabel("name")}</th>
                  <th className="grs-thead-th" style={grs.th}>{donorFieldLabel("email")}</th>
                  <th className="grs-thead-th" style={grs.th}>{donorFieldLabel("phone")}</th>
                  <th className="grs-thead-th" style={{ ...grs.th, width: "100%" }}>{donorFieldLabel("notes")}</th>
                  {isAdmin && (
                    <th
                      className="grs-thead-th"
                      style={{ ...grs.th, width: 96, position: "sticky", right: 0, background: "var(--bg-thead)" }}
                    />
                  )}
                </tr>
              </thead>
              <tbody>
                {safeItems.map((item, i) => (
                  <tr key={item.id} style={{ background: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-input)" }}>
                    <td style={{ ...grs.td, fontWeight: 600, whiteSpace: "nowrap" }}>{item.name}</td>
                    <td style={{ ...grs.td, whiteSpace: "nowrap" }}>{item.email || "—"}</td>
                    <td style={{ ...grs.td, whiteSpace: "nowrap" }}>{item.phone || "—"}</td>
                    <td style={grs.td}>
                      {item.notes
                        ? <span style={{ fontSize: "0.82rem" }}>{item.notes}</span>
                        : <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>—</span>}
                    </td>
                    {isAdmin && (
                      <td style={{ ...grs.td, textAlign: "right", width: 96, position: "sticky", right: 0, background: "var(--bg-card)", borderLeft: "1px solid var(--border)" }}>
                        <RowActions
                          onEdit={() => {
                            setEditing(item);
                            setEditName(item.name);
                            setEditEmail(item.email ?? "");
                            setEditPhone(item.phone ?? "");
                            setEditNotes(item.notes ?? "");
                            setError(null);
                          }}
                          onDelete={() => setConfirmDelete(item)}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <GrsModal title="Edit Donor" onClose={() => setEditing(null)} width={440}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={grs.fieldLabel}>{donorFieldLabel("name", { required: true })}</label>
              <input style={grs.input} value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
            </div>
            <div>
              <label style={grs.fieldLabel}>{donorFieldLabel("email")}</label>
              <input style={grs.input} type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div>
              <label style={grs.fieldLabel}>{donorFieldLabel("phone")}</label>
              <input style={grs.input} value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div>
              <label style={grs.fieldLabel}>{donorFieldLabel("notes")}</label>
              <textarea
                style={{ ...grs.input, minHeight: 72, resize: "vertical" }}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
            {error && <div style={grs.errorBox}>{error}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setEditing(null)} style={grs.btnSecondary}>Cancel</button>
              <button
                type="button"
                onClick={() => { void handleEdit(); }}
                style={grs.btnPrimary}
                disabled={!editName.trim() || saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </GrsModal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={<>Delete donor <strong>"{confirmDelete.name}"</strong>?</>}
          detail="This may fail if the donor is linked to a Kutir."
          onConfirm={() => { void handleDelete(confirmDelete.id); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

export default function LookupsPage() {
  const { user } = useAuth();
  const isAdmin = canManageLookupsUser(user);
  const [activeTab, setActiveTab] = useState<Tab>("categories");
  const current = TABS.find(t => t.key === activeTab)!;

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 4px", color: "var(--text-primary)" }}>Lookup Tables</h2>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          Reference data used throughout the application.{" "}
          {isAdmin ? "You can add, edit, and delete items." : "Read-only for your role."}
        </p>
      </div>

      <GrsTabs
        value={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: 20 }}
        tabs={TABS.map(t => ({ key: t.key, label: t.label }))}
      />

      <LookupErrorBoundary key={activeTab}>
        {activeTab === "exam-type-subjects"
          ? <ExamTypeSubjectsTable isAdmin={isAdmin} />
          : activeTab === "exam-types"
          ? <ExamTypesTable isAdmin={isAdmin} />
          : activeTab === "donors"
          ? <DonorsTable isAdmin={isAdmin} />
          : <LookupTable tab={current} isAdmin={isAdmin} />}
      </LookupErrorBoundary>
    </div>
  );
}
