import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { grs } from "../styles/grs";

interface LookupItem { id: number; name?: string; reason?: string; category_id?: number }

type Tab = "categories" | "sub-categories" | "exam-categories" | "no-exam-reasons" | "no-admit-reasons" | "subjects" | "exam-type-subjects" | "school-types" | "exam-types";

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
    queryFn: async () => (await api.get("/lookups/school-types")).data,
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
      const { data: newItem } = await api.post("/lookups/exam-types", { name, school_type_ids: addSchoolTypeIds });
      setAddName(""); setAddSchoolTypeIds([]);
      qc.setQueryData(["exam-types"], (old: ExamTypeItem[] = []) => [...old, newItem]);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Add failed.");
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
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 180 }}>
              <label style={grs.fieldLabel}>Name</label>
              <input style={grs.input} value={addName} onChange={e => setAddName(e.target.value)}
                placeholder="e.g. MP Tribals" onKeyDown={e => e.key === "Enter" && handleAdd()} />
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
            <button onClick={handleAdd} style={{ ...grs.btnPrimary, whiteSpace: "nowrap" }} disabled={!addName.trim()}>+ Add</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p style={grs.muted}>Loading…</p>
      ) : items.length === 0 ? (
        <p style={{ ...grs.muted, textAlign: "center", padding: "24px 0" }}>No exam types yet.</p>
      ) : (
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
      )}

      {editing && (
        <div style={grs.overlay}>
          <div style={{ ...grs.modal, width: 440 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "1rem", color: "var(--text-primary)" }}>Edit Exam Type</h3>
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
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={grs.overlay}>
          <div style={{ ...grs.modal, width: 340 }}>
            <p style={{ margin: "0 0 16px", color: "var(--text-primary)", fontSize: "0.9rem" }}>
              Delete <strong>"{confirmDelete.name}"</strong>?
              <span style={{ display: "block", marginTop: 6, color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                This may affect existing records.
              </span>
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
        {activeTab === "exam-type-subjects"
          ? <ExamTypeSubjectsTable isAdmin={isAdmin} />
          : activeTab === "exam-types"
          ? <ExamTypesTable isAdmin={isAdmin} />
          : <LookupTable tab={current} isAdmin={isAdmin} />}
      </LookupErrorBoundary>
    </div>
  );
}
