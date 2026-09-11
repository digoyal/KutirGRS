import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listZones, listDistricts, listAreas, listClusters, createZone, createDistrict, createArea, createCluster } from "../api/geo";
import { listUsers } from "../api/users";

type Tab = "zones" | "districts" | "areas" | "clusters";

const PERSON_FIELD: Record<Tab, string> = {
  zones:     "zonal_head_id",
  districts: "district_anchor_id",
  areas:     "education_coordinator_id",
  clusters:  "cluster_coordinator_id",
};
const PERSON_LABEL: Record<Tab, string> = {
  zones:     "Zonal Head",
  districts: "District Anchor",
  areas:     "Education Coordinator",
  clusters:  "Cluster Coordinator",
};

export default function GeoPage() {
  const [tab, setTab] = useState<Tab>("zones");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState("");
  const qc = useQueryClient();

  const { data: zones = [] }     = useQuery({ queryKey: ["zones"],            queryFn: listZones });
  const { data: districts = [] } = useQuery({ queryKey: ["districts", null],  queryFn: () => listDistricts() });
  const { data: areas = [] }     = useQuery({ queryKey: ["areas", null],      queryFn: () => listAreas() });
  const { data: clusters = [] }  = useQuery({ queryKey: ["clusters", null],   queryFn: () => listClusters() });
  const { data: users = [] }     = useQuery({ queryKey: ["users"],            queryFn: listUsers });

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

  function getCurrentData() {
    if (tab === "zones") return zones.map(z => ({ ID: z.id, Name: z.name }));
    if (tab === "districts") return districts.map(d => ({ ID: d.id, Name: d.name, Zone: zoneMap[d.zone_id] ?? d.zone_id }));
    if (tab === "areas") return areas.map(a => ({ ID: a.id, Name: a.name, District: districtMap[a.district_id] ?? a.district_id }));
    return clusters.map(cl => ({ ID: cl.id, Name: cl.name, Area: areaMap[cl.area_id] ?? cl.area_id }));
  }

  function exportCsv() {
    const data = getCurrentData();
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(r => Object.values(r));
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: "data:text/csv," + encodeURIComponent(csv), download: `${tab}.csv` });
    a.click();
  }

  function printTable() {
    const data = getCurrentData();
    const headers = data.length ? Object.keys(data[0]) : [];
    const rows = data.map(r => `<tr>${Object.values(r).map(v => `<td>${v}</td>`).join("")}</tr>`).join("");
    const ths = headers.map(h => `<th>${h}</th>`).join("");
    const w = window.open("", "_blank")!;
    const title = tab.charAt(0).toUpperCase() + tab.slice(1);
    w.document.write(`<html><head><title>${title}</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 10px;font-size:13px}th{background:#f0f4ff}</style></head><body><h2>${title}</h2><table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print();
  }

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>Geography</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={exportCsv} title="Export CSV" className="grs-ibtn" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", border: "1px solid #cbd5e0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.8rem", color: "#4a5568", fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> <span className="grs-lbl">Export CSV</span>
          </button>
          <button onClick={printTable} title="Print" className="grs-ibtn" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", border: "1px solid #cbd5e0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.8rem", color: "#4a5568", fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> <span className="grs-lbl">Print</span>
          </button>
          <button style={styles.primaryBtn} onClick={() => { setShowForm(true); setForm({}); setFormError(""); }}>
            + Add {tab.slice(0, -1).charAt(0).toUpperCase() + tab.slice(1, -1)}
          </button>
        </div>
      </div>

      <div style={styles.tabs}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span style={styles.count}>
              {t === "zones" ? zones.length : t === "districts" ? districts.length : t === "areas" ? areas.length : clusters.length}
            </span>
          </button>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead><tr style={{ background: "#ebf4ff" }}>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Name</th>
            {tab === "districts" && <th style={styles.th}>Zone</th>}
            {tab === "areas"     && <th style={styles.th}>District</th>}
            {tab === "clusters"  && <th style={styles.th}>Area</th>}
            <th style={styles.th}>{PERSON_LABEL[tab]}</th>
          </tr></thead>
          <tbody>
            {tab === "zones" && zones.map((z, i) => (
              <tr key={z.id} style={{ background: i % 2 === 0 ? "#fff" : "#f7fafc" }}>
                <td style={styles.td}>{z.id}</td>
                <td style={styles.td}><strong>{z.name}</strong></td>
                <td style={styles.td}>{z.zonal_head_id ? userMap[z.zonal_head_id] ?? "—" : <span style={styles.unassigned}>Unassigned</span>}</td>
              </tr>
            ))}
            {tab === "districts" && districts.map((d, i) => (
              <tr key={d.id} style={{ background: i % 2 === 0 ? "#fff" : "#f7fafc" }}>
                <td style={styles.td}>{d.id}</td>
                <td style={styles.td}><strong>{d.name}</strong></td>
                <td style={styles.td}>{zoneMap[d.zone_id] ?? d.zone_id}</td>
                <td style={styles.td}>{d.district_anchor_id ? userMap[d.district_anchor_id] ?? "—" : <span style={styles.unassigned}>Unassigned</span>}</td>
              </tr>
            ))}
            {tab === "areas" && areas.map((a, i) => (
              <tr key={a.id} style={{ background: i % 2 === 0 ? "#fff" : "#f7fafc" }}>
                <td style={styles.td}>{a.id}</td>
                <td style={styles.td}><strong>{a.name}</strong></td>
                <td style={styles.td}>{districtMap[a.district_id] ?? a.district_id}</td>
                <td style={styles.td}>{a.education_coordinator_id ? userMap[a.education_coordinator_id] ?? "—" : <span style={styles.unassigned}>Unassigned</span>}</td>
              </tr>
            ))}
            {tab === "clusters" && clusters.map((c, i) => (
              <tr key={c.id} style={{ background: i % 2 === 0 ? "#fff" : "#f7fafc" }}>
                <td style={styles.td}>{c.id}</td>
                <td style={styles.td}><strong>{c.name}</strong></td>
                <td style={styles.td}>{areaMap[c.area_id] ?? c.area_id}</td>
                <td style={styles.td}>{c.cluster_coordinator_id ? userMap[c.cluster_coordinator_id] ?? "—" : <span style={styles.unassigned}>Unassigned</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{ margin: "0 0 1rem" }}>Add {tab.slice(0, -1)}</h3>
            {formError && <p style={styles.error}>{formError}</p>}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 10 }}>
                <label style={styles.label}>Name *</label>
                <input style={styles.input} value={form.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 10 }}>
              </div>
              {tab === "districts" && (
                <div style={{ marginBottom: 10 }}>
                  <label style={styles.label}>Zone *</label>
                  <select style={styles.input} value={form.zone_id ?? ""} onChange={e => setForm(f => ({ ...f, zone_id: Number(e.target.value) }))}>
                    <option value="">— select zone —</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
              )}
              {tab === "areas" && (
                <div style={{ marginBottom: 10 }}>
                  <label style={styles.label}>District *</label>
                  <select style={styles.input} value={form.district_id ?? ""} onChange={e => setForm(f => ({ ...f, district_id: Number(e.target.value) }))}>
                    <option value="">— select district —</option>
                    {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              {tab === "clusters" && (
                <div style={{ marginBottom: 10 }}>
                  <label style={styles.label}>Area *</label>
                  <select style={styles.input} value={form.area_id ?? ""} onChange={e => setForm(f => ({ ...f, area_id: Number(e.target.value) }))}>
                    <option value="">— select area —</option>
                    {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ marginBottom: 10 }}>
                <label style={styles.label}>{PERSON_LABEL[tab]}</label>
                <select style={styles.input} value={form[personField] ?? ""} onChange={e => setForm(f => ({ ...f, [personField]: e.target.value }))}>
                  <option value="">— unassigned —</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.username}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button type="submit" style={styles.primaryBtn} disabled={mut.isPending}>{mut.isPending ? "Saving…" : "Save"}</button>
                <button type="button" style={styles.secondaryBtn} onClick={() => { setShowForm(false); setForm({}); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header:       { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  tabs:         { display: "flex", gap: 4, marginBottom: 16, borderBottom: "2px solid #e2e8f0", paddingBottom: 0 },
  tab:          { padding: "8px 16px", border: "none", background: "none", cursor: "pointer", fontSize: "0.875rem", color: "#718096", borderBottom: "2px solid transparent", marginBottom: -2, display: "flex", gap: 6, alignItems: "center" },
  tabActive:    { color: "#2b6cb0", borderBottom: "2px solid #2b6cb0", fontWeight: 600 },
  count:        { background: "#e2e8f0", color: "#4a5568", borderRadius: 10, padding: "1px 6px", fontSize: "0.7rem", fontWeight: 700 },
  table:        { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
  th:           { padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#2c5282", borderBottom: "2px solid #bee3f8" },
  td:           { padding: "10px 12px", borderBottom: "1px solid #e2e8f0" },
  unassigned:   { color: "#a0aec0", fontStyle: "italic", fontSize: "0.8rem" },
  primaryBtn:   { background: "#2b6cb0", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: "0.875rem" },
  secondaryBtn: { background: "#e2e8f0", color: "#2d3748", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: "0.875rem" },
  overlay:      { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal:        { background: "#fff", borderRadius: 10, padding: "1.5rem", width: 420, maxWidth: "90vw" },
  label:        { display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#4a5568", marginBottom: 3 },
  input:        { width: "100%", padding: "7px 10px", border: "1px solid #cbd5e0", borderRadius: 5, fontSize: "0.875rem", boxSizing: "border-box" },
  error:        { color: "#c53030", background: "#fff5f5", border: "1px solid #fc8181", borderRadius: 5, padding: "8px 12px", marginBottom: 12, fontSize: "0.85rem" },
};
