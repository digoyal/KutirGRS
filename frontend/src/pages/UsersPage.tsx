import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listUsers, createUser, updateUser, deleteUser, getUser,
  type User, type UserCreate, type UserUpdate,
} from "../api/users";
import {
  listZones, listDistricts, listAreas, listClusters,
  type Zone, type District, type Area, type Cluster,
} from "../api/geo";
import { listKutirs, type Kutir } from "../api/kutirs";
import { useAuth } from "../context/AuthContext";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { USERS_FIELDS } from "../constants/usersFields";
import { GrsTable, type Col } from "../components/GrsTable";
import { grs } from "../styles/grs";

const TITLES = [
  "Teacher", "Cluster Coordinator", "Education Coordinator",
  "District Anchor", "Regional Head", "Admin",
];

// Which geo levels each role uses (leaf = what gets stored)
// Teacher is special: uses kutir_ids (single), geo dropdowns are UI-only filters
const ROLE_LEAF: Record<string, "zone" | "district" | "area" | "cluster" | "kutir" | null> = {
  "Admin":                 null,
  "Regional Head":         "zone",
  "District Anchor":       "district",
  "Education Coordinator": "area",
  "Cluster Coordinator":   "cluster",
  "Teacher":               "kutir",
};

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  username: string; password: string; title: string;
  first_name: string | null; last_name: string | null;
  phone: string | null; email: string | null;
  is_active: boolean;
  // leaf-level M2M selections (stored)
  zone_ids: number[];
  district_ids: number[];
  area_ids: number[];
  cluster_ids: number[];
  kutir_ids: number[];  // Teacher only, max 1
}

const EMPTY: FormState = {
  username: "", password: "", title: "Teacher",
  first_name: null, last_name: null, phone: null, email: null,
  is_active: true,
  zone_ids: [], district_ids: [], area_ids: [], cluster_ids: [], kutir_ids: [],
};

// ── Table columns ─────────────────────────────────────────────────────────────

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
        color:      u.is_active ? "var(--badge-active-fg)" : "var(--badge-inactive-fg)",
      }}>
        {u.is_active ? "Active" : "Inactive"}
      </span>
    ),
  },
  { key: "email", label: "Email", render: u => u.email ?? "—", csvValue: u => u.email ?? "" },
];

// ── CheckboxList helper ───────────────────────────────────────────────────────

interface CheckboxListProps {
  items: { id: number; label: string }[];
  selected: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
}

function CheckboxList({ items, selected, onChange, placeholder = "None available" }: CheckboxListProps) {
  const set = new Set(selected);
  function toggle(id: number) {
    onChange(set.has(id) ? selected.filter(x => x !== id) : [...selected, id]);
  }
  if (items.length === 0) {
    return <div style={{ fontSize: 12, color: "var(--text-secondary)", padding: "6px 0" }}>{placeholder}</div>;
  }
  return (
    <div style={{
      maxHeight: 160, overflowY: "auto", border: "1px solid var(--border)",
      borderRadius: 6, padding: "4px 0", background: "var(--surface)",
    }}>
      {items.map(item => (
        <label key={item.id} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "5px 10px", cursor: "pointer",
          background: set.has(item.id) ? "var(--row-selected-bg, rgba(79,140,255,0.1))" : "transparent",
          fontSize: "0.875rem", color: "var(--text-primary)",
        }}>
          <input
            type="checkbox"
            checked={set.has(item.id)}
            onChange={() => toggle(item.id)}
            style={{ accentColor: "var(--accent)", width: 15, height: 15, flexShrink: 0 }}
          />
          {item.label}
        </label>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UsersPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.title === "Admin";

  useEffect(() => {
    if (window.location.search.includes("_=")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const { isVisible, orderedMetas } = useFieldConfig("users", USERS_FIELDS);

  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [form, setForm]           = useState<FormState>(EMPTY);
  const [formError, setFormError] = useState("");

  // UI-only filter state for cascading (not stored in DB)
  const [filterZone, setFilterZone]         = useState<number | null>(null);
  const [filterDistrict, setFilterDistrict] = useState<number | null>(null);
  const [filterArea, setFilterArea]         = useState<number | null>(null);
  const [filterCluster, setFilterCluster]   = useState<number | null>(null);

  // Geo data loaded once
  const { data: allZones     = [] } = useQuery<Zone[]>    ({ queryKey: ["zones"],     queryFn: () => listZones() });
  const { data: allDistricts = [] } = useQuery<District[]>({ queryKey: ["districts"], queryFn: () => listDistricts() });
  const { data: allAreas     = [] } = useQuery<Area[]>    ({ queryKey: ["areas"],     queryFn: () => listAreas() });
  const { data: allClusters  = [] } = useQuery<Cluster[]> ({ queryKey: ["clusters"],  queryFn: () => listClusters() });
  const { data: allKutirs    = [] } = useQuery<Kutir[]>   ({ queryKey: ["kutirs"],    queryFn: () => listKutirs() });

  // Cascaded option lists (driven by UI filter state)
  const filteredDistricts = useMemo(() =>
    filterZone ? allDistricts.filter(d => d.zone_id === filterZone) : allDistricts,
    [allDistricts, filterZone]);
  const filteredAreas = useMemo(() =>
    filterDistrict ? allAreas.filter(a => a.district_id === filterDistrict) : allAreas,
    [allAreas, filterDistrict]);
  const filteredClusters = useMemo(() =>
    filterArea ? allClusters.filter(c => c.area_id === filterArea) : allClusters,
    [allClusters, filterArea]);
  const filteredKutirs = useMemo(() =>
    filterCluster ? allKutirs.filter(k => k.cluster_id === filterCluster) : [],
    [allKutirs, filterCluster]);

  const leaf = ROLE_LEAF[form.title] ?? null;

  const { data: users = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: listUsers });

  const createMut = useMutation({
    mutationFn: (data: UserCreate) => createUser(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); closeForm(); },
    onError: (e: any) => setFormError(e?.response?.data?.detail ?? "Failed to create user"),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserUpdate }) => updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); closeForm(); },
    onError: (e: any) => setFormError(e?.response?.data?.detail ?? "Failed to update user"),
  });
  const deleteMut = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  function handleDelete(u: User) {
    if (!window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    deleteMut.mutate(u.id);
  }

  function closeForm() {
    setShowForm(false); setEditId(null); setForm(EMPTY); setFormError("");
    setFilterZone(null); setFilterDistrict(null); setFilterArea(null); setFilterCluster(null);
  }

  async function openEdit(u: User) {
    // Fetch fresh data so we have the latest geo arrays
    const fresh = await getUser(u.id);
    setEditId(fresh.id);
    setForm({
      username: fresh.username, password: "", title: fresh.title ?? "Teacher",
      first_name: fresh.first_name, last_name: fresh.last_name,
      phone: fresh.phone, email: fresh.email, is_active: fresh.is_active,
      zone_ids:     fresh.zone_ids,
      district_ids: fresh.district_ids,
      area_ids:     fresh.area_ids,
      cluster_ids:  fresh.cluster_ids,
      kutir_ids:    fresh.kutir_ids,
    });
    setFilterZone(null); setFilterDistrict(null); setFilterArea(null); setFilterCluster(null);
    setShowForm(true);
  }

  function handleRoleChange(title: string) {
    setForm(f => ({ ...f, title, zone_ids: [], district_ids: [], area_ids: [], cluster_ids: [], kutir_ids: [] }));
    setFilterZone(null); setFilterDistrict(null); setFilterArea(null); setFilterCluster(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username.trim()) { setFormError("Username is required"); return; }
    if (!editId && !form.password.trim()) { setFormError("Password is required for new users"); return; }

    const payload = {
      username:     form.username,
      title:        form.title || null,
      first_name:   form.first_name || null,
      last_name:    form.last_name || null,
      phone:        form.phone || null,
      email:        form.email || null,
      is_active:    form.is_active,
      zone_ids:     form.zone_ids,
      district_ids: form.district_ids,
      area_ids:     form.area_ids,
      cluster_ids:  form.cluster_ids,
      kutir_ids:    form.kutir_ids,
    };

    if (editId) {
      const data: UserUpdate = { ...payload };
      if (form.password) data.password = form.password;
      updateMut.mutate({ id: editId, data });
    } else {
      createMut.mutate({ ...payload, password: form.password });
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;
  const sel = (enabled: boolean): React.CSSProperties =>
    enabled ? grs.select : { ...grs.select, opacity: 0.45 };

  const colsWithActions = useMemo(() => {
    const colByKey = new Map(COLS.map(c => [c.key, c]));
    return orderedMetas
      .filter(m => isVisible(m.key))
      .map(m => colByKey.get(m.key))
      .filter((c): c is NonNullable<typeof c> => c != null);
  }, [orderedMetas, isVisible]);

  // ── Geo section renderer ───────────────────────────────────────────────────

  function renderGeoSection() {
    if (leaf === null) return null; // Admin

    return (
      <div style={{
        background: "var(--surface-raised, rgba(0,0,0,0.03))",
        border: "1px solid var(--border)", borderRadius: 6,
        padding: "10px 12px", marginBottom: 10,
      }}>
        <div style={{ ...grs.fieldLabel, marginBottom: 8 }}>Geography Assignment</div>

        {/* Regional Head: just multi-select zones (no filter needed) */}
        {leaf === "zone" && (
          <div>
            <label style={grs.fieldLabel}>Zones</label>
            <CheckboxList
              items={allZones.map(z => ({ id: z.id, label: z.name }))}
              selected={form.zone_ids}
              onChange={ids => setForm(f => ({ ...f, zone_ids: ids }))}
              placeholder="No zones available"
            />
          </div>
        )}

        {/* District Anchor: zone filter + multi-select districts */}
        {leaf === "district" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
              <div>
                <label style={grs.fieldLabel}>Filter by Zone</label>
                <select style={grs.select} value={filterZone ?? ""} onChange={e => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  setFilterZone(v);
                  setFilterDistrict(null);
                }}>
                  <option value="">— all zones —</option>
                  {allZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label style={grs.fieldLabel}>Districts {form.district_ids.length > 0 && <span style={{ color: "var(--accent)", fontWeight: 600 }}>({form.district_ids.length} selected)</span>}</label>
                <CheckboxList
                  items={filteredDistricts.map(d => ({ id: d.id, label: d.name }))}
                  selected={form.district_ids}
                  onChange={ids => setForm(f => ({ ...f, district_ids: ids }))}
                  placeholder="No districts available"
                />
              </div>
            </div>
          </>
        )}

        {/* Education Coordinator: zone + district filter + multi-select areas */}
        {leaf === "area" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <label style={grs.fieldLabel}>Filter by Zone</label>
                <select style={grs.select} value={filterZone ?? ""} onChange={e => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  setFilterZone(v); setFilterDistrict(null);
                }}>
                  <option value="">— all —</option>
                  {allZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label style={grs.fieldLabel}>Filter by District</label>
                <select style={sel(filterZone !== null)} value={filterDistrict ?? ""} disabled={filterZone === null} onChange={e => setFilterDistrict(e.target.value === "" ? null : Number(e.target.value))}>
                  <option value="">— all —</option>
                  {filteredDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={grs.fieldLabel}>Areas {form.area_ids.length > 0 && <span style={{ color: "var(--accent)", fontWeight: 600 }}>({form.area_ids.length} selected)</span>}</label>
              <CheckboxList
                items={filteredAreas.map(a => ({ id: a.id, label: a.name }))}
                selected={form.area_ids}
                onChange={ids => setForm(f => ({ ...f, area_ids: ids }))}
                placeholder="Select a district filter first"
              />
            </div>
          </>
        )}

        {/* Cluster Coordinator: zone + district + area filter + multi-select clusters */}
        {leaf === "cluster" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <label style={grs.fieldLabel}>Filter by Zone</label>
                <select style={grs.select} value={filterZone ?? ""} onChange={e => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  setFilterZone(v); setFilterDistrict(null); setFilterArea(null);
                }}>
                  <option value="">— all —</option>
                  {allZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label style={grs.fieldLabel}>Filter by District</label>
                <select style={sel(filterZone !== null)} value={filterDistrict ?? ""} disabled={filterZone === null} onChange={e => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  setFilterDistrict(v); setFilterArea(null);
                }}>
                  <option value="">— all —</option>
                  {filteredDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label style={grs.fieldLabel}>Filter by Area</label>
                <select style={sel(filterDistrict !== null)} value={filterArea ?? ""} disabled={filterDistrict === null} onChange={e => setFilterArea(e.target.value === "" ? null : Number(e.target.value))}>
                  <option value="">— all —</option>
                  {filteredAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={grs.fieldLabel}>Clusters {form.cluster_ids.length > 0 && <span style={{ color: "var(--accent)", fontWeight: 600 }}>({form.cluster_ids.length} selected)</span>}</label>
              <CheckboxList
                items={filteredClusters.map(c => ({ id: c.id, label: c.name }))}
                selected={form.cluster_ids}
                onChange={ids => setForm(f => ({ ...f, cluster_ids: ids }))}
                placeholder="Select an area filter first"
              />
            </div>
          </>
        )}

        {/* Teacher: cascade filter chain + single kutir dropdown */}
        {leaf === "kutir" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <label style={grs.fieldLabel}>Filter by Zone</label>
                <select style={grs.select} value={filterZone ?? ""} onChange={e => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  setFilterZone(v); setFilterDistrict(null); setFilterArea(null); setFilterCluster(null);
                  setForm(f => ({ ...f, kutir_ids: [] }));
                }}>
                  <option value="">— select —</option>
                  {allZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label style={grs.fieldLabel}>Filter by District</label>
                <select style={sel(filterZone !== null)} value={filterDistrict ?? ""} disabled={filterZone === null} onChange={e => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  setFilterDistrict(v); setFilterArea(null); setFilterCluster(null);
                  setForm(f => ({ ...f, kutir_ids: [] }));
                }}>
                  <option value="">— select —</option>
                  {filteredDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label style={grs.fieldLabel}>Filter by Area</label>
                <select style={sel(filterDistrict !== null)} value={filterArea ?? ""} disabled={filterDistrict === null} onChange={e => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  setFilterArea(v); setFilterCluster(null);
                  setForm(f => ({ ...f, kutir_ids: [] }));
                }}>
                  <option value="">— select —</option>
                  {filteredAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label style={grs.fieldLabel}>Filter by Cluster</label>
                <select style={sel(filterArea !== null)} value={filterCluster ?? ""} disabled={filterArea === null} onChange={e => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  setFilterCluster(v);
                  setForm(f => ({ ...f, kutir_ids: [] }));
                }}>
                  <option value="">— select —</option>
                  {filteredClusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={grs.fieldLabel}>Kutir</label>
              <select
                style={sel(filterCluster !== null)}
                disabled={filterCluster === null}
                value={(form.kutir_ids)[0] ?? ""}
                onChange={e => setForm(f => ({
                  ...f,
                  kutir_ids: e.target.value === "" ? [] : [Number(e.target.value)],
                }))}
              >
                <option value="">— select —</option>
                {filteredKutirs.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
              {filterCluster === null && (
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>
                  Select a cluster filter first
                </div>
              )}
            </div>
          </>
        )}

        {/* Assignment summary — shows selected leaf-level entity names */}
        {(() => {
          let names: string[] = [];
          if (leaf === "zone")     names = form.zone_ids.map(id => allZones.find(z => z.id === id)?.name ?? String(id));
          if (leaf === "district") names = form.district_ids.map(id => allDistricts.find(d => d.id === id)?.name ?? String(id));
          if (leaf === "area")     names = form.area_ids.map(id => allAreas.find(a => a.id === id)?.name ?? String(id));
          if (leaf === "cluster")  names = form.cluster_ids.map(id => allClusters.find(c => c.id === id)?.name ?? String(id));
          if (leaf === "kutir")    names = form.kutir_ids.map(id => allKutirs.find(k => k.id === id)?.name ?? String(id));
          return (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
              <div style={{ ...grs.fieldLabel, marginBottom: 6 }}>Assignment</div>
              {names.length === 0 ? (
                <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                  None selected
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {names.map(name => (
                    <span key={name} style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      background: "var(--accent-subtle, rgba(79,140,255,0.12))",
                      color: "var(--accent)", border: "1px solid var(--accent-border, rgba(79,140,255,0.3))",
                      borderRadius: 20, padding: "2px 10px", fontSize: "0.8125rem", fontWeight: 500,
                    }}>
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px" }}>
      <GrsTable
        title="Users"
        columns={colsWithActions}
        data={users}
        rowKey={u => u.id}
        isLoading={isLoading}
        emptyMessage="No users found."
        actions={u => ({ onEdit: () => openEdit(u), onDelete: () => handleDelete(u) })}
        searchable
        searchFn={(u, q) => {
          const s = q.toLowerCase();
          return u.username.toLowerCase().includes(s)
            || (u.first_name ?? "").toLowerCase().includes(s)
            || (u.last_name ?? "").toLowerCase().includes(s)
            || (u.title ?? "").toLowerCase().includes(s);
        }}
        headerExtra={isAdmin ? (
          <a
            href="/admin/field-config?table=users"
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8125rem", color: "var(--text-secondary)", textDecoration: "none", padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <span>Columns</span>
          </a>
        ) : undefined}
        exportFilename="users"
        printTitle="Users"
        onAdd={() => { setShowForm(true); setFormError(""); }}
        addLabel="Add User"
      />

      {showForm && (
        <div style={grs.overlay}>
          <div style={{ ...grs.modal, maxWidth: 620 }}>
            <h3 style={grs.modalTitle}>{editId ? "Edit User" : "Add User"}</h3>
            {formError && <div style={grs.errorBox}>{formError}</div>}
            <form onSubmit={handleSubmit}>

              {/* Username + Password */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={grs.fieldLabel}>Username *</label>
                  <input
                    style={grs.input}
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    disabled={editId !== null}
                  />
                </div>
                <div>
                  <label style={grs.fieldLabel}>{editId ? "Password (leave blank to keep)" : "Password *"}</label>
                  <input
                    style={grs.input}
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />
                </div>
              </div>

              {/* First + Last Name */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={grs.fieldLabel}>First Name</label>
                  <input style={grs.input} value={form.first_name ?? ""} onChange={e => setForm(f => ({ ...f, first_name: e.target.value || null }))} />
                </div>
                <div>
                  <label style={grs.fieldLabel}>Last Name</label>
                  <input style={grs.input} value={form.last_name ?? ""} onChange={e => setForm(f => ({ ...f, last_name: e.target.value || null }))} />
                </div>
              </div>

              {/* Phone + Email */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={grs.fieldLabel}>Phone</label>
                  <input style={grs.input} value={form.phone ?? ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value || null }))} />
                </div>
                <div>
                  <label style={grs.fieldLabel}>Email</label>
                  <input style={grs.input} type="email" value={form.email ?? ""} onChange={e => setForm(f => ({ ...f, email: e.target.value || null }))} />
                </div>
              </div>

              {/* Role */}
              <div style={{ marginBottom: 10 }}>
                <label style={grs.fieldLabel}>Role</label>
                <select style={grs.select} value={form.title} onChange={e => handleRoleChange(e.target.value)}>
                  {TITLES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              {/* Geo section — role-aware */}
              {renderGeoSection()}

              {/* Active */}
              <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                />
                <label htmlFor="is_active" style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>Active</label>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button type="submit" style={grs.btnPrimary} disabled={isPending}>
                  {isPending ? "Saving…" : "Save"}
                </button>
                <button type="button" style={grs.btnSecondary} onClick={closeForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
