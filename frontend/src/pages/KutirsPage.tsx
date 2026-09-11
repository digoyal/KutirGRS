import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listKutirs, createKutir, updateKutir, deleteKutir, type KutirCreate, type Kutir } from "../api/kutirs";
import { useAuth } from "../context/AuthContext";
import { listClusters, listAreas, listDistricts, listZones } from "../api/geo";
import { grs } from "../styles/grs";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";

const KUTIR_TYPES = ["Seva Kutir", "Shiksha Kutir", "Non-Kutir"];
const STATES = ["Madhya Pradesh", "Jharkhand", "Chhattisgarh"];
const EMPTY: KutirCreate = { name: "", kutir_type: "Seva Kutir", cluster_id: 0, state: "Madhya Pradesh" };

export default function KutirsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.title === "Admin";
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<KutirCreate>(EMPTY);
  const [formError, setFormError] = useState("");
  const [selZone, setSelZone] = useState<number | null>(null);
  const [selDistrict, setSelDistrict] = useState<number | null>(null);
  const [selArea, setSelArea] = useState<number | null>(null);
  const [filterDistrict, setFilterDistrict] = useState<number | "">("");
  const [filterCluster, setFilterCluster] = useState<number | "">("");
  const [editItem, setEditItem] = useState<Kutir | null>(null);

  const { data: kutirs = [], isLoading } = useQuery({ queryKey: ["kutirs"], queryFn: () => listKutirs() });
  const { data: zones = [] } = useQuery({ queryKey: ["zones"], queryFn: listZones });
  const { data: districts = [] } = useQuery({ queryKey: ["districts", selZone], queryFn: () => listDistricts(selZone ?? undefined), enabled: !!selZone });
  const { data: areas = [] } = useQuery({ queryKey: ["areas", selDistrict], queryFn: () => listAreas(selDistrict ?? undefined), enabled: !!selDistrict });
  const { data: clusters = [] } = useQuery({ queryKey: ["clusters", selArea], queryFn: () => listClusters(selArea ?? undefined), enabled: !!selArea });
  const { data: allDistricts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { data: allAreas = [] } = useQuery({ queryKey: ["all-areas"], queryFn: () => listAreas() });
  const { data: allClusters = [] } = useQuery({ queryKey: ["all-clusters"], queryFn: () => listClusters() });

  const areaMap = new Map(allAreas.map(a => [a.id, a]));
  const clusterMap = new Map(allClusters.map(c => [c.id, c]));
  const filterClusters = allClusters.filter(c => filterDistrict === "" || areaMap.get(c.area_id)?.district_id === filterDistrict);

  const displayed = kutirs.filter(k => {
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

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<KutirCreate> }) => updateKutir(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["kutirs"] }); setShowForm(false); setEditItem(null); setForm(EMPTY); setFormError(""); },
    onError: (e: any) => setFormError(e?.response?.data?.detail ?? "Failed to update kutir"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteKutir,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kutirs"] }),
  });

  function openEdit(k: Kutir) {
    setEditItem(k);
    setForm({ name: k.name, kutir_type: k.kutir_type, cluster_id: k.cluster_id, district_id: k.district_id, village: k.village, street: k.street, state: k.state, pincode: k.pincode, enrollment_5th: k.enrollment_5th, enrollment_8th: k.enrollment_8th });
    // pre-select geo cascade from allClusters/allAreas/allDistricts
    const cl = allClusters.find(c => c.id === k.cluster_id);
    const ar = cl ? allAreas.find(a => a.id === cl.area_id) : null;
    const di = ar ? allDistricts.find(d => d.id === ar.district_id) : null;
    setSelDistrict(ar?.district_id ?? null);
    setSelArea(cl?.area_id ?? null);
    if (di) setSelZone(di.zone_id ?? null);
    setFormError("");
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Name is required"); return; }
    if (!form.cluster_id) { setFormError("Please select a cluster"); return; }
    if (editItem) { updateMut.mutate({ id: editItem.id, data: form }); }
    else { createMut.mutate(form); }
  }

  type KutirRow = typeof displayed[0];

  const columns: Col<KutirRow>[] = [
    { key: "name", label: "Name", sortable: true,
      render: r => <Link to={`/kutirs/${r.id}`} style={{ color: "var(--text-primary)", textDecoration: "none" }}>{r.name}</Link>,
      csvValue: r => r.name },
    { key: "kutir_type", label: "Type", sortable: true },
    { key: "state", label: "State", sortable: true },
    { key: "village", label: "Village", sortable: true, render: r => r.village ?? "—", csvValue: r => r.village ?? "" },
    { key: "enrollment_5th", label: "5th Enroll", sortable: true, render: r => r.enrollment_5th ?? "—", csvValue: r => String(r.enrollment_5th ?? "") },
    { key: "enrollment_8th", label: "8th Enroll", sortable: true, render: r => r.enrollment_8th ?? "—", csvValue: r => String(r.enrollment_8th ?? "") },
  ];

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      <GrsTable
        title="Kutirs"
        columns={columns}
        data={displayed}
        rowKey={r => r.id}
        isLoading={isLoading}
        emptyMessage={kutirs.length === 0
          ? "No kutirs yet. Add geo data first (Zone → District → Area → Cluster), then add kutirs."
          : "No kutirs match the current filters."}
        searchable
        searchPlaceholder="Search kutirs…"
        searchFn={(r, q) => r.name.toLowerCase().includes(q) || (r.village ?? "").toLowerCase().includes(q)}
        filters={<>
          <select style={grs.filterSelect} value={filterDistrict}
            onChange={e => { setFilterDistrict(e.target.value === "" ? "" : Number(e.target.value)); setFilterCluster(""); }}>
            <option value="">All Districts</option>
            {allDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select style={grs.filterSelect} value={filterCluster}
            onChange={e => setFilterCluster(e.target.value === "" ? "" : Number(e.target.value))}
            disabled={filterDistrict === ""}>
            <option value="">All Clusters</option>
            {filterClusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </>}
        exportFilename="kutirs"
        printTitle="Kutirs"
        onAdd={isAdmin ? () => { setShowForm(true); setFormError(""); setEditItem(null); setForm(EMPTY); } : undefined}
        addLabel="+ Add Kutir"
        actions={r => ({ onView: () => window.location.href = `/kutirs/${r.id}`, onEdit: isAdmin ? () => openEdit(r) : undefined, onDelete: isAdmin ? () => { if (confirm(`Delete kutir "${r.name}"?`)) deleteMut.mutate(r.id); } : undefined })}
      />

      {showForm && (
        <div style={grs.overlay}>
          <div style={grs.modal}>
            <h3 style={grs.modalTitle}>{editItem ? "Edit Kutir" : "Add Kutir"}</h3>
            {formError && <p style={grs.errorBox}>{formError}</p>}
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Filters: Zone → District → Area → Cluster cascade */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Row label="Zone">
                    <select style={grs.select} value={selZone ?? ""} onChange={e => { setSelZone(Number(e.target.value) || null); setSelDistrict(null); setSelArea(null); setForm(f => ({ ...f, cluster_id: 0 })); }}>
                      <option value="">— select zone —</option>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                  </Row>
                  <Row label="District">
                    <select style={grs.select} value={selDistrict ?? ""} disabled={!selZone} onChange={e => { setSelDistrict(Number(e.target.value) || null); setSelArea(null); setForm(f => ({ ...f, cluster_id: 0 })); }}>
                      <option value="">— select district —</option>
                      {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </Row>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Row label="Area">
                    <select style={grs.select} value={selArea ?? ""} disabled={!selDistrict} onChange={e => { setSelArea(Number(e.target.value) || null); setForm(f => ({ ...f, cluster_id: 0 })); }}>
                      <option value="">— select area —</option>
                      {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </Row>
                  <Row label="Cluster *">
                    <select style={grs.select} value={form.cluster_id || ""} disabled={!selArea} onChange={e => setForm(f => ({ ...f, cluster_id: Number(e.target.value) }))}>
                      <option value="">— select cluster —</option>
                      {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Row>
                </div>
                {/* Name + Type */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Row label="Name *"><input style={grs.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Row>
                  <Row label="Type">
                    <select style={grs.select} value={form.kutir_type} onChange={e => setForm(f => ({ ...f, kutir_type: e.target.value }))}>
                      {KUTIR_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </Row>
                </div>
                {/* Village + State */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Row label="Village"><input style={grs.input} value={form.village ?? ""} onChange={e => setForm(f => ({ ...f, village: e.target.value || null }))} /></Row>
                  <Row label="State">
                    <select style={grs.select} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
                      {STATES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </Row>
                </div>
                {/* Enrollment */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Row label="Enroll 5th"><input style={grs.input} type="number" value={form.enrollment_5th ?? ""} onChange={e => setForm(f => ({ ...f, enrollment_5th: Number(e.target.value) || null }))} /></Row>
                  <Row label="Enroll 8th"><input style={grs.input} type="number" value={form.enrollment_8th ?? ""} onChange={e => setForm(f => ({ ...f, enrollment_8th: Number(e.target.value) || null }))} /></Row>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button type="submit" style={grs.btnPrimary} disabled={createMut.isPending}>{(createMut.isPending || updateMut.isPending) ? "Saving…" : editItem ? "Save Changes" : "Save"}</button>
                <button type="button" style={grs.btnSecondary} onClick={() => { setShowForm(false); setForm(EMPTY); setEditItem(null); }}>Cancel</button>
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
      <label style={grs.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}
