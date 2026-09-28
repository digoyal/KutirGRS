/**
 * Shared user form fields used by UserAddPage and UserDetailPage.
 * Caller owns the state; this component is purely presentational + interactive.
 */
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listZones, listDistricts, listAreas, listClusters, type Zone, type District, type Area, type Cluster } from "../api/geo";
import { listKutirs, type Kutir } from "../api/kutirs";
import { grs } from "../styles/grs";

export const TITLES = [
  "Teacher", "Cluster Coordinator", "Education Coordinator",
  "District Anchor", "Regional Head", "Admin",
];

const ROLE_LEAF: Record<string, "zone" | "district" | "area" | "cluster" | "kutir" | null> = {
  "Admin":                 null,
  "Regional Head":         "zone",
  "District Anchor":       "district",
  "Education Coordinator": "area",
  "Cluster Coordinator":   "cluster",
  "Teacher":               "kutir",
};

export interface UserFormState {
  username: string; password: string; title: string;
  first_name: string | null; last_name: string | null;
  phone: string | null; email: string | null;
  is_active: boolean;
  zone_ids: number[];
  district_ids: number[];
  area_ids: number[];
  cluster_ids: number[];
  kutir_ids: number[];
}

export const EMPTY_USER_FORM: UserFormState = {
  username: "", password: "", title: "Teacher",
  first_name: null, last_name: null, phone: null, email: null,
  is_active: true,
  zone_ids: [], district_ids: [], area_ids: [], cluster_ids: [], kutir_ids: [],
};

// ── CheckboxList ──────────────────────────────────────────────────────────────

function CheckboxList({ items, selected, onChange, placeholder = "None available" }: {
  items: { id: number; label: string }[];
  selected: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
}) {
  const set = new Set(selected);
  function toggle(id: number) {
    onChange(set.has(id) ? selected.filter(x => x !== id) : [...selected, id]);
  }
  if (items.length === 0) {
    return <div style={{ fontSize: 12, color: "var(--text-secondary)", padding: "6px 0" }}>{placeholder}</div>;
  }
  return (
    <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 0", background: "var(--surface)" }}>
      {items.map(item => (
        <label key={item.id} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "5px 10px", cursor: "pointer",
          background: set.has(item.id) ? "var(--row-selected-bg, rgba(79,140,255,0.1))" : "transparent",
          fontSize: "0.875rem", color: "var(--text-primary)",
        }}>
          <input type="checkbox" checked={set.has(item.id)} onChange={() => toggle(item.id)}
            style={{ accentColor: "var(--accent)", width: 15, height: 15, flexShrink: 0 }} />
          {item.label}
        </label>
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface UserFormProps {
  form: UserFormState;
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>;
  isEdit: boolean;               // true = editing existing user, false = new
  assignableTitles: string[];
  filterZone: number | null;     setFilterZone: (v: number | null) => void;
  filterDistrict: number | null; setFilterDistrict: (v: number | null) => void;
  filterArea: number | null;     setFilterArea: (v: number | null) => void;
  filterCluster: number | null;  setFilterCluster: (v: number | null) => void;
}

export function UserForm({
  form, setForm, isEdit, assignableTitles,
  filterZone, setFilterZone, filterDistrict, setFilterDistrict,
  filterArea, setFilterArea, filterCluster, setFilterCluster,
}: UserFormProps) {
  const { data: allZonesRaw }        = useQuery<Zone[]>({ queryKey: ["zones"],        queryFn: () => listZones() });
  const allZones: Zone[] = allZonesRaw ?? [];
  const { data: allDistrictsRaw }    = useQuery<District[]>({ queryKey: ["districts"],    queryFn: () => listDistricts() });
  const allDistricts: District[] = allDistrictsRaw ?? [];
  const { data: allAreasRaw }        = useQuery<Area[]>({ queryKey: ["areas"],        queryFn: () => listAreas() });
  const allAreas: Area[] = allAreasRaw ?? [];
  const { data: allClustersRaw }     = useQuery<Cluster[]>({ queryKey: ["clusters"],     queryFn: () => listClusters() });
  const allClusters: Cluster[] = allClustersRaw ?? [];
  const { data: allKutirsRaw }       = useQuery<Kutir[]>({ queryKey: ["kutirs"],       queryFn: () => listKutirs() });
  const allKutirs: Kutir[] = allKutirsRaw ?? [];

  const filteredDistricts = useMemo(() => filterZone ? allDistricts.filter(d => d.zone_id === filterZone) : allDistricts, [allDistricts, filterZone]);
  const filteredAreas     = useMemo(() => filterDistrict ? allAreas.filter(a => a.district_id === filterDistrict) : allAreas, [allAreas, filterDistrict]);
  const filteredClusters  = useMemo(() => filterArea ? allClusters.filter(c => c.area_id === filterArea) : allClusters, [allClusters, filterArea]);
  const filteredKutirs: Kutir[] = useMemo(() => filterCluster ? allKutirs.filter(k => k.cluster_id === filterCluster) : [], [allKutirs, filterCluster]);

  // Auto-select when only one option available (add mode only)
  useEffect(() => {
    if (isEdit) return;
    if (allZones.length === 1 && filterZone === null) setFilterZone(allZones[0].id);
  }, [isEdit, allZones.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isEdit || filterZone === null) return;
    if (filteredDistricts.length === 1 && filterDistrict === null) setFilterDistrict(filteredDistricts[0].id);
  }, [isEdit, filterZone, filteredDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isEdit || filterDistrict === null) return;
    if (filteredAreas.length === 1 && filterArea === null) setFilterArea(filteredAreas[0].id);
  }, [isEdit, filterDistrict, filteredAreas.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isEdit || filterArea === null) return;
    if (filteredClusters.length === 1 && filterCluster === null) setFilterCluster(filteredClusters[0].id);
  }, [isEdit, filterArea, filteredClusters.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const leaf = ROLE_LEAF[form.title] ?? null;
  const sel = (enabled: boolean): React.CSSProperties =>
    enabled ? grs.select : { ...grs.select, opacity: 0.45 };

  function handleRoleChange(title: string) {
    setForm(f => ({ ...f, title, zone_ids: [], district_ids: [], area_ids: [], cluster_ids: [], kutir_ids: [] }));
    setFilterZone(null); setFilterDistrict(null); setFilterArea(null); setFilterCluster(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Username + Password */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={grs.fieldLabel}>Username *</label>
          <input style={grs.input} value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            disabled={isEdit} />
        </div>
        <div>
          <label style={grs.fieldLabel}>{isEdit ? "Password (leave blank to keep)" : "Password *"}</label>
          <input style={grs.input} type="password" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        </div>
      </div>

      {/* First + Last Name */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={grs.fieldLabel}>First Name</label>
          <input style={grs.input} value={form.first_name ?? ""}
            onChange={e => setForm(f => ({ ...f, first_name: e.target.value || null }))} />
        </div>
        <div>
          <label style={grs.fieldLabel}>Last Name</label>
          <input style={grs.input} value={form.last_name ?? ""}
            onChange={e => setForm(f => ({ ...f, last_name: e.target.value || null }))} />
        </div>
      </div>

      {/* Phone + Email */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={grs.fieldLabel}>Phone</label>
          <input style={grs.input} value={form.phone ?? ""}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value || null }))} />
        </div>
        <div>
          <label style={grs.fieldLabel}>Email</label>
          <input style={grs.input} type="email" value={form.email ?? ""}
            onChange={e => setForm(f => ({ ...f, email: e.target.value || null }))} />
        </div>
      </div>

      {/* Role */}
      <div>
        <label style={grs.fieldLabel}>Role</label>
        <select style={grs.select} value={form.title} onChange={e => handleRoleChange(e.target.value)}>
          {assignableTitles.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Geo assignment section */}
      {leaf !== null && (
        <div style={{ background: "var(--surface-raised, rgba(0,0,0,0.03))", border: "1px solid var(--border)", borderRadius: 6, padding: "10px 12px" }}>
          <div style={{ ...grs.fieldLabel, marginBottom: 8 }}>Geography Assignment</div>

          {leaf === "zone" && (
            <div>
              <label style={grs.fieldLabel}>Zones</label>
              <CheckboxList items={allZones.map(z => ({ id: z.id, label: z.name }))} selected={form.zone_ids}
                onChange={ids => setForm(f => ({ ...f, zone_ids: ids }))} placeholder="No zones available" />
            </div>
          )}

          {leaf === "district" && (
            <>
              <div style={{ marginBottom: 8 }}>
                <label style={grs.fieldLabel}>Filter by Zone</label>
                <select style={grs.select} value={filterZone ?? ""} onChange={e => { setFilterZone(e.target.value === "" ? null : Number(e.target.value)); setFilterDistrict(null); }}>
                  <option value="">— all zones —</option>
                  {allZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label style={grs.fieldLabel}>Districts {form.district_ids.length > 0 && <span style={{ color: "var(--accent)", fontWeight: 600 }}>({form.district_ids.length} selected)</span>}</label>
                <CheckboxList items={filteredDistricts.map(d => ({ id: d.id, label: d.name }))} selected={form.district_ids}
                  onChange={ids => setForm(f => ({ ...f, district_ids: ids }))} placeholder="No districts available" />
              </div>
            </>
          )}

          {leaf === "area" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={grs.fieldLabel}>Filter by Zone</label>
                  <select style={grs.select} value={filterZone ?? ""} onChange={e => { setFilterZone(e.target.value === "" ? null : Number(e.target.value)); setFilterDistrict(null); }}>
                    <option value="">— all —</option>
                    {allZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={grs.fieldLabel}>Filter by District</label>
                  <select style={sel(filterZone !== null)} value={filterDistrict ?? ""} disabled={filterZone === null}
                    onChange={e => setFilterDistrict(e.target.value === "" ? null : Number(e.target.value))}>
                    <option value="">— all —</option>
                    {filteredDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={grs.fieldLabel}>Areas {form.area_ids.length > 0 && <span style={{ color: "var(--accent)", fontWeight: 600 }}>({form.area_ids.length} selected)</span>}</label>
                <CheckboxList items={filteredAreas.map(a => ({ id: a.id, label: a.name }))} selected={form.area_ids}
                  onChange={ids => setForm(f => ({ ...f, area_ids: ids }))} placeholder="Select a district filter first" />
              </div>
            </>
          )}

          {leaf === "cluster" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={grs.fieldLabel}>Filter by Zone</label>
                  <select style={grs.select} value={filterZone ?? ""} onChange={e => { setFilterZone(e.target.value === "" ? null : Number(e.target.value)); setFilterDistrict(null); setFilterArea(null); }}>
                    <option value="">— all —</option>
                    {allZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={grs.fieldLabel}>Filter by District</label>
                  <select style={sel(filterZone !== null)} value={filterDistrict ?? ""} disabled={filterZone === null}
                    onChange={e => { setFilterDistrict(e.target.value === "" ? null : Number(e.target.value)); setFilterArea(null); }}>
                    <option value="">— all —</option>
                    {filteredDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={grs.fieldLabel}>Filter by Area</label>
                  <select style={sel(filterDistrict !== null)} value={filterArea ?? ""} disabled={filterDistrict === null}
                    onChange={e => setFilterArea(e.target.value === "" ? null : Number(e.target.value))}>
                    <option value="">— all —</option>
                    {filteredAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={grs.fieldLabel}>Clusters {form.cluster_ids.length > 0 && <span style={{ color: "var(--accent)", fontWeight: 600 }}>({form.cluster_ids.length} selected)</span>}</label>
                <CheckboxList items={filteredClusters.map(c => ({ id: c.id, label: c.name }))} selected={form.cluster_ids}
                  onChange={ids => setForm(f => ({ ...f, cluster_ids: ids }))} placeholder="Select an area filter first" />
              </div>
            </>
          )}

          {leaf === "kutir" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={grs.fieldLabel}>Filter by Zone</label>
                  <select style={grs.select} value={filterZone ?? ""} onChange={e => { setFilterZone(e.target.value === "" ? null : Number(e.target.value)); setFilterDistrict(null); setFilterArea(null); setFilterCluster(null); setForm(f => ({ ...f, kutir_ids: [] })); }}>
                    <option value="">— select —</option>
                    {allZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={grs.fieldLabel}>Filter by District</label>
                  <select style={sel(filterZone !== null)} value={filterDistrict ?? ""} disabled={filterZone === null}
                    onChange={e => { setFilterDistrict(e.target.value === "" ? null : Number(e.target.value)); setFilterArea(null); setFilterCluster(null); setForm(f => ({ ...f, kutir_ids: [] })); }}>
                    <option value="">— select —</option>
                    {filteredDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={grs.fieldLabel}>Filter by Area</label>
                  <select style={sel(filterDistrict !== null)} value={filterArea ?? ""} disabled={filterDistrict === null}
                    onChange={e => { setFilterArea(e.target.value === "" ? null : Number(e.target.value)); setFilterCluster(null); setForm(f => ({ ...f, kutir_ids: [] })); }}>
                    <option value="">— select —</option>
                    {filteredAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={grs.fieldLabel}>Filter by Cluster</label>
                  <select style={sel(filterArea !== null)} value={filterCluster ?? ""} disabled={filterArea === null}
                    onChange={e => { setFilterCluster(e.target.value === "" ? null : Number(e.target.value)); setForm(f => ({ ...f, kutir_ids: [] })); }}>
                    <option value="">— select —</option>
                    {filteredClusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={grs.fieldLabel}>Kutir</label>
                <select style={sel(filterCluster !== null)} disabled={filterCluster === null}
                  value={form.kutir_ids[0] ?? ""}
                  onChange={e => setForm(f => ({ ...f, kutir_ids: e.target.value === "" ? [] : [Number(e.target.value)] }))}>
                  <option value="">— select —</option>
                  {filteredKutirs.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
                {filterCluster === null && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>Select a cluster filter first</div>}
              </div>
            </>
          )}

          {/* Assignment summary */}
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
                {names.length === 0
                  ? <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontStyle: "italic" }}>None selected</div>
                  : <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {names.map(name => (
                        <span key={name} style={{ display: "inline-flex", alignItems: "center", background: "var(--accent-subtle, rgba(79,140,255,0.12))", color: "var(--accent)", border: "1px solid var(--accent-border, rgba(79,140,255,0.3))", borderRadius: 20, padding: "2px 10px", fontSize: "0.8125rem", fontWeight: 500 }}>
                          {name}
                        </span>
                      ))}
                    </div>
                }
              </div>
            );
          })()}
        </div>
      )}

      {/* Active toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" id="is_active" checked={form.is_active}
          onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
        <label htmlFor="is_active" style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>Active</label>
      </div>
    </div>
  );
}
