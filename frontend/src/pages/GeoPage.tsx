import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listZones, listDistricts, listAreas, listClusters, createZone, createDistrict, createArea, createCluster, updateZone, updateDistrict, updateArea, updateCluster, deleteZone, deleteDistrict, deleteArea, deleteCluster } from "../api/geo";
import { grs } from "../styles/grs";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";

type Tab = "zones" | "districts" | "areas" | "clusters";

type GeoRow = { id: number; name: string; parent?: string };

const PARENT_LABEL: Partial<Record<Tab, string>> = {
  districts: "Zone",
  areas:     "District",
  clusters:  "Area",
};

export default function GeoPage() {
  const [tab, setTab] = useState<Tab>("zones");
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState<{ id: number } | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState("");
  const qc = useQueryClient();

  const { data: zones = [] }     = useQuery({ queryKey: ["zones"],           queryFn: listZones });
  const { data: districts = [] } = useQuery({ queryKey: ["districts", null], queryFn: () => listDistricts() });
  const { data: areas = [] }     = useQuery({ queryKey: ["areas", null],     queryFn: () => listAreas() });
  const { data: clusters = [] }  = useQuery({ queryKey: ["clusters", null],  queryFn: () => listClusters() });

  const zoneMap     = Object.fromEntries(zones.map(z => [z.id, z.name]));
  const districtMap = Object.fromEntries(districts.map(d => [d.id, d.name]));
  const areaMap     = Object.fromEntries(areas.map(a => [a.id, a.name]));

  const mutFns: Record<Tab, (data: any) => Promise<any>> = {
    zones: createZone, districts: createDistrict, areas: createArea, clusters: createCluster,
  };
  const updateFns: Record<Tab, (id: number, data: any) => Promise<any>> = {
    zones: updateZone, districts: updateDistrict, areas: updateArea, clusters: updateCluster,
  };
  const deleteFns: Record<Tab, (id: number) => Promise<void>> = {
    zones: deleteZone, districts: deleteDistrict, areas: deleteArea, clusters: deleteCluster,
  };

  const qKey = (t: Tab) => t === "zones" ? ["zones"] : t === "districts" ? ["districts", null] : t === "areas" ? ["areas", null] : ["clusters", null];

  const createMut = useMutation({
    mutationFn: (data: any) => mutFns[tab](data),
    onSuccess: (newItem) => {
      qc.setQueryData(qKey(tab), (old: any[] = []) => [...old, newItem]);
      setShowForm(false); setForm({}); setFormError("");
    },
    onError: (e: any) => setFormError(e?.response?.data?.detail ?? "Failed to save"),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateFns[tab](id, data),
    onSuccess: (updated) => {
      qc.setQueryData(qKey(tab), (old: any[] = []) => old.map((r: any) => r.id === updated.id ? updated : r));
      setShowForm(false); setEditRow(null); setForm({}); setFormError("");
    },
    onError: (e: any) => setFormError(e?.response?.data?.detail ?? "Failed to save"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteFns[tab](id),
    onSuccess: (_v, id) => {
      qc.setQueryData(qKey(tab), (old: any[] = []) => old.filter((r: any) => r.id !== id));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name?.trim()) { setFormError("Name is required"); return; }
    if (editRow) {
      updateMut.mutate({ id: editRow.id, data: form });
    } else {
      createMut.mutate(form);
    }
  }

  const rows = useMemo<GeoRow[]>(() => {
    if (tab === "zones")     return zones.map(z => ({ id: z.id, name: z.name }));
    if (tab === "districts") return districts.map(d => ({ id: d.id, name: d.name, parent: zoneMap[d.zone_id] ?? String(d.zone_id) }));
    if (tab === "areas")     return areas.map(a => ({ id: a.id, name: a.name, parent: districtMap[a.district_id] ?? String(a.district_id) }));
    return clusters.map(c => ({ id: c.id, name: c.name, parent: areaMap[c.area_id] ?? String(c.area_id) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, zones, districts, areas, clusters]);

  const columns = useMemo<Col<GeoRow>[]>(() => {
    const cols: Col<GeoRow>[] = [
      { key: "name", label: "Name", sortable: true, render: r => <strong>{r.name}</strong> },
    ];
    if (tab !== "zones") {
      cols.push({ key: "parent", label: PARENT_LABEL[tab]!, sortable: true });
    }
    return cols;
  }, [tab]);

  const tabs: Tab[] = ["zones", "districts", "areas", "clusters"];
  const tabCount: Record<Tab, number> = { zones: zones.length, districts: districts.length, areas: areas.length, clusters: clusters.length };
  const addLabel = tab.slice(0, 1).toUpperCase() + tab.slice(1, -1);

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Tab strip */}
      <div style={{ display: "flex", gap: 4, borderBottom: "2px solid var(--border)", marginBottom: 0 }}>
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 16px", border: "none", background: "none", cursor: "pointer",
              fontSize: "0.875rem", display: "flex", gap: 6, alignItems: "center",
              borderBottom: tab === t ? "2px solid var(--badge-blue-fg)" : "2px solid transparent",
              marginBottom: -2,
              color: tab === t ? "var(--badge-blue-fg)" : "var(--text-secondary)",
              fontWeight: tab === t ? 600 : 400,
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span style={{ background: "var(--bg-input)", color: "var(--text-secondary)", borderRadius: 10, padding: "1px 6px", fontSize: "0.7rem", fontWeight: 700 }}>
              {tabCount[t]}
            </span>
          </button>
        ))}
      </div>

      <GrsTable<GeoRow>
        key={tab}
        title={tab.charAt(0).toUpperCase() + tab.slice(1)}
        columns={columns}
        data={rows}
        rowKey={r => r.id}
        searchable
        searchPlaceholder={`Search ${tab}…`}
        exportFilename={tab}
        printTitle={tab.charAt(0).toUpperCase() + tab.slice(1)}
        onAdd={() => { setShowForm(true); setEditRow(null); setForm({}); setFormError(""); }}
        addLabel={`+ Add ${addLabel}`}
        actions={r => ({
          onEdit: () => {
            const raw =
              tab === "zones"     ? zones.find(z => z.id === r.id) :
              tab === "districts" ? districts.find(d => d.id === r.id) :
              tab === "areas"     ? areas.find(a => a.id === r.id) :
                                    clusters.find(c => c.id === r.id);
            setEditRow({ id: r.id });
            setForm({ ...raw });
            setFormError("");
            setShowForm(true);
          },
          onDelete: () => {
            if (confirm(`Delete "${r.name}"?`)) deleteMut.mutate(r.id);
          },
        })}
      />

      {showForm && (
        <div style={grs.overlay}>
          <div style={grs.modal}>
            <h3 style={grs.modalTitle}>{editRow ? `Edit ${addLabel}` : `Add ${addLabel}`}</h3>
            {formError && <div style={grs.errorBox}>{formError}</div>}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 10 }}>
                <label style={grs.fieldLabel}>Name *</label>
                <input style={grs.input} value={form.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              {tab === "districts" && (
                <div style={{ marginBottom: 10 }}>
                  <label style={grs.fieldLabel}>Zone *</label>
                  <select style={grs.select} value={form.zone_id ?? ""} onChange={e => setForm(f => ({ ...f, zone_id: Number(e.target.value) }))}>
                    <option value="">— select zone —</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
              )}
              {tab === "areas" && (
                <div style={{ marginBottom: 10 }}>
                  <label style={grs.fieldLabel}>District *</label>
                  <select style={grs.select} value={form.district_id ?? ""} onChange={e => setForm(f => ({ ...f, district_id: Number(e.target.value) }))}>
                    <option value="">— select district —</option>
                    {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              {tab === "clusters" && (
                <div style={{ marginBottom: 10 }}>
                  <label style={grs.fieldLabel}>Area *</label>
                  <select style={grs.select} value={form.area_id ?? ""} onChange={e => setForm(f => ({ ...f, area_id: Number(e.target.value) }))}>
                    <option value="">— select area —</option>
                    {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button type="submit" style={grs.btnPrimary} disabled={createMut.isPending || updateMut.isPending}>{(createMut.isPending || updateMut.isPending) ? "Saving…" : "Save"}</button>
                <button type="button" style={grs.btnSecondary} onClick={() => { setShowForm(false); setEditRow(null); setForm({}); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
