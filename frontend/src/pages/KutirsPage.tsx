import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listKutirs, createKutir, type KutirCreate } from "../api/kutirs";
import { listClusters, listAreas, listDistricts, listZones } from "../api/geo";

const KUTIR_TYPES = ["Seva Kutir", "Shiksha Kutir", "Non-Kutir"];
const STATES = ["Madhya Pradesh", "Jharkhand", "Chhattisgarh"];

const EMPTY: KutirCreate = { name: "", kutir_type: "Seva Kutir", cluster_id: 0, state: "Madhya Pradesh" };

export default function KutirsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(() => window.innerWidth > 640);
  const [form, setForm] = useState<KutirCreate>(EMPTY);
  const [formError, setFormError] = useState("");
  const [selZone, setSelZone] = useState<number | null>(null);
  const [selDistrict, setSelDistrict] = useState<number | null>(null);
  const [selArea, setSelArea] = useState<number | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [filterDistrict, setFilterDistrict] = useState<number | "">("");
  const [filterCluster, setFilterCluster] = useState<number | "">("");

  const { data: kutirs = [], isLoading } = useQuery({ queryKey: ["kutirs"], queryFn: () => listKutirs() });
  const { data: zones = [] } = useQuery({ queryKey: ["zones"], queryFn: listZones });
  const { data: districts = [] } = useQuery({ queryKey: ["districts", selZone], queryFn: () => listDistricts(selZone ?? undefined), enabled: !!selZone });
  const { data: areas = [] } = useQuery({ queryKey: ["areas", selDistrict], queryFn: () => listAreas(selDistrict ?? undefined), enabled: !!selDistrict });
  const { data: clusters = [] } = useQuery({ queryKey: ["clusters", selArea], queryFn: () => listClusters(selArea ?? undefined), enabled: !!selArea });

  // All geo data for filter dropdowns
  const { data: allDistricts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { data: allAreas = [] } = useQuery({ queryKey: ["all-areas"], queryFn: () => listAreas() });
  const { data: allClusters = [] } = useQuery({ queryKey: ["all-clusters"], queryFn: () => listClusters() });

  // Filter computed
  const areaMap = new Map(allAreas.map(a => [a.id, a]));
  const clusterMap = new Map(allClusters.map(c => [c.id, c]));
  const filterClusters = allClusters.filter(c => filterDistrict === "" || areaMap.get(c.area_id)?.district_id === filterDistrict);
  const displayed = kutirs.filter(k => {
    if (search && !k.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCluster !== "" && k.cluster_id !== filterCluster) return false;
    if (filterDistrict !== "" && filterCluster === "") {
      const cl = clusterMap.get(k.cluster_id);
      if (!cl) return false;
      const ar = areaMap.get(cl.area_id);
      if (!ar || ar.district_id !== filterDistrict) return false;
    }
    return true;
  });

  const createMut = useMutation({
    mutationFn: createKutir,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["kutirs"] }); setShowForm(false); setForm(EMPTY); setFormError(""); },
    onError: (e: any) => setFormError(e?.response?.data?.detail ?? "Failed to create kutir"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Name is required"); return; }
    if (!form.cluster_id) { setFormError("Please select a cluster"); return; }
    createMut.mutate(form);
  }

  function exportCsv() {
    const headers = ["Name", "Type", "State", "Village", "5th Enroll", "8th Enroll"];
    const rows = displayed.map(k => [k.name, k.kutir_type, k.state, k.village ?? "", k.enrollment_5th ?? "", k.enrollment_8th ?? ""]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: "data:text/csv," + encodeURIComponent(csv), download: "kutirs.csv" });
    a.click();
  }

  function printTable() {
    const w = window.open("", "_blank")!;
    const rows = displayed.map(k => `<tr><td>${k.name}</td><td>${k.kutir_type}</td><td>${k.state}</td><td>${k.village ?? ""}</td><td>${k.enrollment_5th ?? ""}</td><td>${k.enrollment_8th ?? ""}</td></tr>`).join("");
    w.document.write(`<html><head><title>Kutirs</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 10px;font-size:13px}th{background:#f0f4ff}</style></head><body><h2>Kutirs</h2><table><thead><tr><th>Name</th><th>Type</th><th>State</th><th>Village</th><th>5th Enroll</th><th>8th Enroll</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print();
  }

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>Kutirs</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={exportCsv} title="Export CSV" className="grs-ibtn" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", border: "1px solid #cbd5e0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.8rem", color: "#4a5568", fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> <span className="grs-lbl">Export CSV</span>
          </button>
          <button onClick={printTable} title="Print" className="grs-ibtn" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", border: "1px solid #cbd5e0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.8rem", color: "#4a5568", fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> <span className="grs-lbl">Print</span>
          </button>
          <button style={styles.primaryBtn} onClick={() => { setShowForm(true); setFormError(""); }}>+ Add Kutir</button>
        </div>
      </div>

      {/* Filter bar */}
      <button className="grs-filter-toggle" onClick={() => setFiltersOpen(o => !o)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        <span>Filters {filtersOpen ? "▲" : "▼"}</span>
      </button>
      <div style={styles.filterBar} className={filtersOpen ? "grs-fbar" : "grs-fbar grs-fbar--hidden"}>
        <input
          style={styles.filterInput}
          placeholder="Search kutirs…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={styles.filterSelect}
          value={filterDistrict}
          onChange={e => { setFilterDistrict(e.target.value === "" ? "" : Number(e.target.value)); setFilterCluster(""); }}
        >
          <option value="">All Districts</option>
          {allDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select
          style={styles.filterSelect}
          value={filterCluster}
          onChange={e => setFilterCluster(e.target.value === "" ? "" : Number(e.target.value))}
          disabled={filterDistrict === ""}
        >
          <option value="">All Clusters</option>
          {filterClusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {isLoading ? <p style={{ color: "#718096" }}>Loading…</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead><tr style={{ background: "#ebf4ff" }}>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>State</th>
              <th style={styles.th}>Village</th>
              <th style={styles.th}>5th Enroll</th>
              <th style={styles.th}>8th Enroll</th>
            </tr></thead>
            <tbody>
              {displayed.map((k, i) => (
                <tr key={k.id} style={{ background: i % 2 === 0 ? "#fff" : "#f7fafc" }}>
                  <td style={styles.td}><Link to={`/kutirs/${k.id}`} style={{ color: "#2c5282", textDecoration: "none", fontWeight: 600 }}>{k.name}</Link></td>
                  <td style={styles.td}>{k.kutir_type}</td>
                  <td style={styles.td}>{k.state}</td>
                  <td style={styles.td}>{k.village ?? "—"}</td>
                  <td style={styles.td}>{k.enrollment_5th ?? "—"}</td>
                  <td style={styles.td}>{k.enrollment_8th ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {displayed.length === 0 && <p style={{ color: "#718096" }}>{kutirs.length === 0 ? "No kutirs yet. Add geo data first (Zone → District → Area → Cluster), then add kutirs." : "No kutirs match the current filters."}</p>}
        </div>
      )}

      {showForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{ margin: "0 0 1rem" }}>Add Kutir</h3>
            {formError && <p style={styles.error}>{formError}</p>}
            <form onSubmit={handleSubmit}>
              <Row label="Name *"><input style={styles.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Row>
              <Row label="Type">
                <select style={styles.input} value={form.kutir_type} onChange={e => setForm(f => ({ ...f, kutir_type: e.target.value }))}>
                  {KUTIR_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Row>
              <Row label="State">
                <select style={styles.input} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Row>
              <Row label="Zone">
                <select style={styles.input} value={selZone ?? ""} onChange={e => { setSelZone(Number(e.target.value) || null); setSelDistrict(null); setSelArea(null); setForm(f => ({ ...f, cluster_id: 0 })); }}>
                  <option value="">— select zone —</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </Row>
              <Row label="District">
                <select style={styles.input} value={selDistrict ?? ""} disabled={!selZone} onChange={e => { setSelDistrict(Number(e.target.value) || null); setSelArea(null); setForm(f => ({ ...f, cluster_id: 0, district_id: Number(e.target.value) || undefined })); }}>
                  <option value="">— select district —</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Row>
              <Row label="Area">
                <select style={styles.input} value={selArea ?? ""} disabled={!selDistrict} onChange={e => { setSelArea(Number(e.target.value) || null); setForm(f => ({ ...f, cluster_id: 0 })); }}>
                  <option value="">— select area —</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Row>
              <Row label="Cluster *">
                <select style={styles.input} value={form.cluster_id || ""} disabled={!selArea} onChange={e => setForm(f => ({ ...f, cluster_id: Number(e.target.value) }))}>
                  <option value="">— select cluster —</option>
                  {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Row>
              <Row label="Village"><input style={styles.input} value={form.village ?? ""} onChange={e => setForm(f => ({ ...f, village: e.target.value || null }))} /></Row>
              <Row label="Enroll 5th"><input style={styles.input} type="number" value={form.enrollment_5th ?? ""} onChange={e => setForm(f => ({ ...f, enrollment_5th: Number(e.target.value) || null }))} /></Row>
              <Row label="Enroll 8th"><input style={styles.input} type="number" value={form.enrollment_8th ?? ""} onChange={e => setForm(f => ({ ...f, enrollment_8th: Number(e.target.value) || null }))} /></Row>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button type="submit" style={styles.primaryBtn} disabled={createMut.isPending}>{createMut.isPending ? "Saving…" : "Save"}</button>
                <button type="button" style={styles.secondaryBtn} onClick={() => { setShowForm(false); setForm(EMPTY); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#4a5568", marginBottom: 3 }}>{label}</label>
      {children}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
  th: { padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#2c5282", borderBottom: "2px solid #bee3f8" },
  td: { padding: "10px 12px", borderBottom: "1px solid #e2e8f0" },
  primaryBtn: { background: "#2b6cb0", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: "0.875rem" },
  secondaryBtn: { background: "#e2e8f0", color: "#2d3748", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: "0.875rem" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "#fff", borderRadius: 10, padding: "1.5rem", width: 420, maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto" },
  input: { width: "100%", padding: "7px 10px", border: "1px solid #cbd5e0", borderRadius: 5, fontSize: "0.875rem", boxSizing: "border-box" },
  error: { color: "#c53030", background: "#fff5f5", border: "1px solid #fc8181", borderRadius: 5, padding: "8px 12px", marginBottom: 12, fontSize: "0.85rem" },
  filterBar: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" as const, alignItems: "center" },
  filterInput: { padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.875rem", minWidth: 200, boxSizing: "border-box" as const },
  filterSelect: { padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.875rem", minWidth: 160, background: "#fff", cursor: "pointer" },
};
