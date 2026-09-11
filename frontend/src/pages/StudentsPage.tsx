import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listStudents, createStudent, deleteStudent, type Student, type StudentCreate } from "../api/students";
import { listKutirs } from "../api/kutirs";
import { listDistricts, listAreas, listClusters } from "../api/geo";
import { useAuth } from "../context/AuthContext";

const EMPTY_FORM: StudentCreate = {
  first_name: "", last_name: "", gender: "Boy",
  kutir_id: null, dob: null, phone: null,
  father_name: null, mother_name: null, street: null, pincode: null,
};

export default function StudentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(() => window.innerWidth > 640);
  const [filterDistrict, setFilterDistrict] = useState<number | "">("");
  const [filterCluster, setFilterCluster] = useState<number | "">("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<StudentCreate>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students", search],
    queryFn: () => listStudents({ search: search || undefined, limit: 2000 }),
  });

  const { data: allKutirs = [] } = useQuery({ queryKey: ["all-kutirs"], queryFn: () => listKutirs() });
  const { data: allDistricts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { data: allAreas = [] } = useQuery({ queryKey: ["all-areas"], queryFn: () => listAreas() });
  const { data: allClusters = [] } = useQuery({ queryKey: ["all-clusters"], queryFn: () => listClusters() });

  const kutirMap = new Map(allKutirs.map(k => [k.id, k]));
  const areaMap = new Map(allAreas.map(a => [a.id, a]));
  const clusterMap = new Map(allClusters.map(c => [c.id, c]));
  const filterClusters = allClusters.filter(c => filterDistrict === "" || areaMap.get(c.area_id)?.district_id === filterDistrict);
  const displayed = students.filter(s => {
    if (filterCluster !== "") {
      const k = s.kutir_id != null ? kutirMap.get(s.kutir_id) : null;
      if (!k || k.cluster_id !== filterCluster) return false;
    } else if (filterDistrict !== "") {
      const k = s.kutir_id != null ? kutirMap.get(s.kutir_id) : null;
      if (!k) return false;
      const cl = clusterMap.get(k.cluster_id);
      if (!cl) return false;
      const ar = areaMap.get(cl.area_id);
      if (!ar || ar.district_id !== filterDistrict) return false;
    }
    return true;
  });

  const createMut = useMutation({
    mutationFn: createStudent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); setShowForm(false); setForm(EMPTY_FORM); setFormError(""); },
    onError: (e: any) => setFormError(e?.response?.data?.detail ?? "Failed to create student"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) { setFormError("First and last name are required"); return; }
    createMut.mutate(form);
  }

  function docsBadge(s: Student) {
    const count = [s.aadhaar, s.category_cert, s.birth_cert, s.residence_proof, s.medical].filter(Boolean).length;
    return `${count}/5`;
  }


  function exportCSV() {
    if (students.length === 0) return;
    const headers = ["ID","First Name","Last Name","Gender","DOB","Phone","Father","Mother","Docs","Added"];
    const rows = students.map(s => [
      s.id, s.first_name, s.last_name, s.gender, s.dob ?? "",
      s.phone ?? "", s.father_name ?? "", s.mother_name ?? "",
      [s.aadhaar,s.category_cert,s.birth_cert,s.residence_proof,s.medical].filter(Boolean).length + "/5",
      new Date(s.created_at).toLocaleDateString("en-IN"),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "students.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function printTable() {
    const w = window.open("", "_blank")!;
    const rows = displayed.map(s => `<tr><td>${s.first_name} ${s.last_name}</td><td>${s.gender ?? ""}</td><td>${s.phone ?? ""}</td><td>${s.father_name ?? ""}</td></tr>`).join("");
    w.document.write(`<html><head><title>Students</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 10px;font-size:13px}th{background:#f0f4ff}</style></head><body><h2>Students</h2><table><thead><tr><th>Name</th><th>Gender</th><th>Phone</th><th>Father</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print();
  }

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>Students</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={exportCSV} disabled={displayed.length === 0} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", border: "1px solid #cbd5e0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.8rem", color: "#4a5568", fontWeight: 500 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span className="grs-lbl">Export CSV</span>
            </button>
            <button onClick={printTable} title="Print" className="grs-ibtn" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", border: "1px solid #cbd5e0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.8rem", color: "#4a5568", fontWeight: 500 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              <span className="grs-lbl">Print</span>
            </button>
            <button style={styles.primaryBtn} onClick={() => { setShowForm(true); setFormError(""); }}>+ Add Student</button>
        </div>
      </div>

      <button className="grs-filter-toggle" onClick={() => setFiltersOpen(o => !o)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        <span>Filters {filtersOpen ? "▲" : "▼"}</span>
      </button>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }} className={filtersOpen ? "grs-fbar" : "grs-fbar grs-fbar--hidden"}>
        <input
          style={{ ...styles.search, marginBottom: 0 }}
          placeholder="Search by name, phone…"
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

      {isLoading ? (
        <p style={{ color: "#718096" }}>Loading…</p>
      ) : displayed.length === 0 ? (
        <p style={{ color: "#718096" }}>No students found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Gender</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Father</th>
                <th style={styles.th}>Mother</th>
                <th style={styles.th}>Docs</th>
                <th style={styles.th}>Added</th>
                {user?.title === "Admin" && <th style={styles.th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {displayed.map((s, i) => (
                <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "#f7fafc" }}>
                  <td style={styles.td}><Link to={`/students/${s.id}`} style={{ color: "#2b6cb0", textDecoration: "none", fontWeight: 600 }}>{s.first_name} {s.last_name}</Link></td>
                  <td style={styles.td}>{s.gender}</td>
                  <td style={styles.td}>{s.phone ?? "—"}</td>
                  <td style={styles.td}>{s.father_name ?? "—"}</td>
                  <td style={styles.td}>{s.mother_name ?? "—"}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, background: docsBadge(s) === "5/5" ? "#c6f6d5" : "#fefcbf", color: "#2d3748" }}>
                      {docsBadge(s)}
                    </span>
                  </td>
                  <td style={styles.td}>{new Date(s.created_at).toLocaleDateString("en-IN")}</td>
                  {user?.title === "Admin" && (
                    <td style={styles.td}>
                      <button
                        style={styles.dangerBtn}
                        onClick={() => { if (confirm(`Delete ${s.first_name} ${s.last_name}?`)) deleteMut.mutate(s.id); }}
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{ margin: "0 0 1rem" }}>Add Student</h3>
            {formError && <p style={styles.error}>{formError}</p>}
            <form onSubmit={handleSubmit}>
              <div style={styles.formRow}>
                <label style={styles.label}>First Name *</label>
                <input style={styles.input} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div style={styles.formRow}>
                <label style={styles.label}>Last Name *</label>
                <input style={styles.input} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
              <div style={styles.formRow}>
                <label style={styles.label}>Gender</label>
                <select style={styles.input} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                  <option>Boy</option>
                  <option>Girl</option>
                </select>
              </div>
              <div style={styles.formRow}>
                <label style={styles.label}>Date of Birth</label>
                <input style={styles.input} type="date" value={form.dob ?? ""} onChange={e => setForm(f => ({ ...f, dob: e.target.value || null }))} />
              </div>
              <div style={styles.formRow}>
                <label style={styles.label}>Phone</label>
                <input style={styles.input} value={form.phone ?? ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value || null }))} />
              </div>
              <div style={styles.formRow}>
                <label style={styles.label}>Father's Name</label>
                <input style={styles.input} value={form.father_name ?? ""} onChange={e => setForm(f => ({ ...f, father_name: e.target.value || null }))} />
              </div>
              <div style={styles.formRow}>
                <label style={styles.label}>Mother's Name</label>
                <input style={styles.input} value={form.mother_name ?? ""} onChange={e => setForm(f => ({ ...f, mother_name: e.target.value || null }))} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button type="submit" style={styles.primaryBtn} disabled={createMut.isPending}>
                  {createMut.isPending ? "Saving…" : "Save"}
                </button>
                <button type="button" style={styles.secondaryBtn} onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  search: { width: "100%", maxWidth: 360, padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 6, marginBottom: 16, fontSize: "0.9rem", boxSizing: "border-box" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
  thead: { background: "#ebf4ff" },
  th: { padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#2c5282", borderBottom: "2px solid #bee3f8" },
  td: { padding: "10px 12px", borderBottom: "1px solid #e2e8f0", verticalAlign: "middle" },
  badge: { padding: "2px 8px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 600 },
  primaryBtn: { background: "#2b6cb0", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: "0.875rem" },
  secondaryBtn: { background: "#e2e8f0", color: "#2d3748", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: "0.875rem" },
  dangerBtn: { background: "#fed7d7", color: "#c53030", border: "none", padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: "0.75rem" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "#fff", borderRadius: 10, padding: "1.5rem", width: 420, maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto" },
  formRow: { marginBottom: 12 },
  label: { display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#4a5568", marginBottom: 4 },
  input: { width: "100%", padding: "7px 10px", border: "1px solid #cbd5e0", borderRadius: 5, fontSize: "0.875rem", boxSizing: "border-box" },
  error: { color: "#c53030", background: "#fff5f5", border: "1px solid #fc8181", borderRadius: 5, padding: "8px 12px", marginBottom: 12, fontSize: "0.85rem" },
  filterSelect: { padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.875rem", minWidth: 160, background: "#fff", cursor: "pointer" },
};
