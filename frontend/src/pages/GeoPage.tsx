import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listZones, listDistricts, listAreas, listClusters, createZone, createDistrict, createArea, createCluster } from "../api/geo";
import { listUsers } from "../api/users";
import { grs } from "../styles/grs";

type Tab = "zones" | "districts" | "areas" | "clusters";

const PERSON_FIELD: Record<Tab, string> = {
  zones:     "zonal_head_id",
  districts: "district_anchor_id",
  areas:     "education_coordinator_id",
  clusters:  "cluster_coordinator_id",
};
const PERSON_LABEL: Record<Tab, string> = {
  zones:     "Regional Head",
  districts: "District Anchor",
  areas:     "Education Coordinator",
  clusters:  "Cluster Coordinator",
};

export default function GeoPage() {
  const [tab, setTab] = useState<Tab>("zones");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState("");
  const qc = useQueryClient();

  const { data: zones = [] }     = useQuery({ queryKey: ["zones"],           queryFn: listZones });
  const { data: districts = [] } = useQuery({ queryKey: ["districts", null], queryFn: () => listDistricts() });
  const { data: areas = [] }     = useQuery({ queryKey: ["areas", null],     queryFn: () => listAreas() });
  const { data: clusters = [] }  = useQuery({ queryKey: ["clusters", null],  queryFn: () => listClusters() });
  const { data: users = [] }     = useQuery({ queryKey: ["users"],           queryFn: listUsers });

  const zoneMap     = Object.fromEntries(zones.map(z => [z.id, z.name]));
  const districtMap = Object.fromEntries(districts.map(d => [d.id, d.name]));
  const areaMap     = Object.fromEntries(areas.map(a => [a.id, a.name]));
  const userMap     = Object.fromEntries(users.map(u => [u.id, [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username]));

  const mutFns: Record<Tab, (data: any) => Promise<any>> = {
    zones: createZone, districts: createDistrict, areas: createArea, clusters: createCluster,
  };

  const mut = useMutation({
    mutationFn: (data: any) => mutFns[tab](data),
    onSuccess: (newItem) => {
      const key = tab === "zones" ? "zones" : tab === "districts" ? ["districts", null] : tab === "areas" ? ["areas", null] : ["clusters", null];
      qc.setQueryData(Array.isArray(key) ? key : [key], (old: any[] = []) => [...old, newItem]);
      setShowForm(false); setForm({}); setFormError("");
    },
    onError: (e: any) => setFormError(e?.response?.data?.detail ?? "Failed to save"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name?.trim()) { setFormError("Name is required"); return; }
    const payload = { ...form };
    const pf = PERSON_FIELD[tab];
    if (payload[pf] === "" || payload[pf] === undefined) delete payload[pf];
    else payload[pf] = Number(payload[pf]);
    mut.mutate(payload);
  }

  const tabs: Tab[] = ["zones", "districts", "areas", "clusters"];
  const personField = PERSON_FIELD[tab];

  function getCurrentRows() {
    if (tab === "zones")     return zones.map(z => ({ id: z.id, name: z.name, person: z.zonal_head_id ? userMap[z.zonal_head_id] : null }));
    if (tab === "districts") return districts.map(d => ({ id: d.id, name: d.name, parent: zoneMap[d.zone_id] ?? String(d.zone_id), person: d.district_anchor_id ? userMap[d.district_anchor_id] : null }));
    if (tab === "areas")     return areas.map(a => ({ id: a.id, name: a.name, parent: districtMap[a.district_id] ?? String(a.district_id), person: a.education_coordinator_id ? userMap[a.education_coordinator_id] : null }));
    return clusters.map(c => ({ id: c.id, name: c.name, parent: areaMap[c.area_id] ?? String(c.area_id), person: c.cluster_coordinator_id ? userMap[c.cluster_coordinator_id] : null }));
  }

  function exportCsv() {
    const rows = getCurrentRows();
    if (!rows.length) return;
    const hasParent = tab !== "zones";
    const headers = hasParent ? ["ID", "Name", { districts: "Zone", areas: "District", clusters: "Area" }[tab] ?? "Parent", PERSON_LABEL[tab]] : ["ID", "Name", PERSON_LABEL[tab]];
    const lines = rows.map(r => hasParent
      ? [r.id, r.name, (r as any).parent ?? "—", r.person ?? "Unassigned"]
      : [r.id, r.name, r.person ?? "Unassigned"]
    );
    const csv = [headers, ...lines].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: "data:text/csv," + encodeURIComponent(csv), download: `${tab}.csv` });
    a.click();
  }

  function printTable() {
    const rows = getCurrentRows();
    const hasParent = tab !== "zones";
    const parentLabel = ({ districts: "Zone", areas: "District", clusters: "Area" } as Record<string, string>)[tab] ?? "Parent";
    const ths = hasParent
      ? `<th>ID</th><th>Name</th><th>${parentLabel}</th><th>${PERSON_LABEL[tab]}</th>`
      : `<th>ID</th><th>Name</th><th>${PERSON_LABEL[tab]}</th>`;
    const trs = rows.map(r => hasParent
      ? `<tr><td>${r.id}</td><td>${r.name}</td><td>${(r as any).parent ?? "—"}</td><td>${r.person ?? "Unassigned"}</td></tr>`
      : `<tr><td>${r.id}</td><td>${r.name}</td><td>${r.person ?? "Unassigned"}</td></tr>`
    ).join("");
    const title = tab.charAt(0).toUpperCase() + tab.slice(1);
    const w = window.open("", "_blank")!;
    w.document.write(`<html><head><title>${title}</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 10px;font-size:13px}th{background:#f0f4ff}</style></head><body><h2>${title}</h2><table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print();
  }

  const q = search.toLowerCase();
  const rows = getCurrentRows().filter(r =>
    !q || r.name.toLowerCase().includes(q) || (r.person ?? "").toLowerCase().includes(q) || ((r as any).parent ?? "").toLowerCase().includes(q)
  );

  const tabCount: Record<Tab, number> = { zones: zones.length, districts: districts.length, areas: areas.length, clusters: clusters.length };

  const addLabel = tab.slice(0, 1).toUpperCase() + tab.slice(1, -1);

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: "var(--text-primary)" }}>Geography</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={exportCsv} title="Export CSV" style={grs.btnIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button onClick={printTable} title="Print" style={grs.btnIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print
          </button>
          <button style={grs.btnPrimary} onClick={() => { setShowForm(true); setForm({}); setFormError(""); }}>
            + Add {addLabel}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 0, borderBottom: "2px solid var(--border)", paddingBottom: 0 }}>
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(""); }}
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

      {/* Search bar */}
      <div style={{ padding: "12px 0", display: "flex", alignItems: "center", gap: 8 }}>
        <input
          placeholder={`Search ${tab}…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...grs.searchInput, minWidth: 200, maxWidth: 320 }}
        />
        <span style={grs.muted}>{rows.length} {tab}</span>
      </div>

      {/* Table */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr>
                <th className="grs-thead-th" style={grs.th}>ID</th>
                <th className="grs-thead-th" style={grs.th}>Name</th>
                {tab !== "zones" && (
                  <th className="grs-thead-th" style={grs.th}>
                    {{ districts: "Zone", areas: "District", clusters: "Area" }[tab]}
                  </th>
                )}
                <th className="grs-thead-th" style={grs.th}>{PERSON_LABEL[tab]}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-input)" }}>
                  <td style={{ ...grs.td, width: 50 }}>{r.id}</td>
                  <td style={grs.td}><strong>{r.name}</strong></td>
                  {tab !== "zones" && <td style={grs.td}>{(r as any).parent ?? "—"}</td>}
                  <td style={grs.td}>
                    {r.person
                      ? r.person
                      : <span style={{ color: "var(--text-secondary)", fontStyle: "italic", fontSize: "0.8rem" }}>Unassigned</span>
                    }
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={tab !== "zones" ? 4 : 3} style={{ ...grs.td, textAlign: "center", color: "var(--text-secondary)" }}>
                    No {tab} found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add form modal */}
      {showForm && (
        <div style={grs.overlay}>
          <div style={grs.modal}>
            <h3 style={grs.modalTitle}>Add {addLabel}</h3>
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
              <div style={{ marginBottom: 10 }}>
                <label style={grs.fieldLabel}>{PERSON_LABEL[tab]}</label>
                <select style={grs.select} value={form[personField] ?? ""} onChange={e => setForm(f => ({ ...f, [personField]: e.target.value }))}>
                  <option value="">— unassigned —</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.username}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button type="submit" style={grs.btnPrimary} disabled={mut.isPending}>{mut.isPending ? "Saving…" : "Save"}</button>
                <button type="button" style={grs.btnSecondary} onClick={() => { setShowForm(false); setForm({}); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
