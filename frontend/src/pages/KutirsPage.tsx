import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listKutirs, createKutir, updateKutir, deleteKutir, type KutirCreate, type Kutir } from "../api/kutirs";
import { useAuth } from "../context/AuthContext";
import { listClusters, listAreas, listDistricts, listZones } from "../api/geo";
import { grs } from "../styles/grs";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { KUTIRS_FIELDS } from "../constants/kutirsFields";

const KUTIR_TYPES = ["Seva Kutir", "Shiksha Kutir", "Non-Kutir"];
const STATES = ["Madhya Pradesh", "Jharkhand", "Chhattisgarh"];
const EMPTY: KutirCreate = { name: "", kutir_type: "Seva Kutir", cluster_id: 0, state: "Madhya Pradesh" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={grs.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

function KutirModal({
  mode, initial,
  allZones, allDistricts, allAreas, allClusters,
  onClose, onSave,
}: {
  mode: "add" | "edit" | "view";
  initial: Kutir | null;
  allZones: Array<{ id: number; name: string }>;
  allDistricts: Array<{ id: number; name: string; zone_id?: number | null }>;
  allAreas: Array<{ id: number; name: string; district_id: number }>;
  allClusters: Array<{ id: number; name: string; area_id: number }>;
  onClose: () => void;
  onSave: (data: KutirCreate) => Promise<void>;
}) {
  const isView = mode === "view";
  const [form, setForm] = useState<KutirCreate>(EMPTY);
  const [selZone, setSelZone] = useState<number | null>(null);
  const [selDistrict, setSelDistrict] = useState<number | null>(null);
  const [selArea, setSelArea] = useState<number | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name, kutir_type: initial.kutir_type, cluster_id: initial.cluster_id,
        district_id: initial.district_id, street: initial.street,
        state: initial.state, pincode: initial.pincode,
        enrollment_5th: initial.enrollment_5th, enrollment_8th: initial.enrollment_8th,
      });
      const cl = allClusters.find(c => c.id === initial.cluster_id);
      const ar = cl ? allAreas.find(a => a.id === cl.area_id) : null;
      const di = ar ? allDistricts.find(d => d.id === ar.district_id) : null;
      setSelDistrict(ar?.district_id ?? null);
      setSelArea(cl?.area_id ?? null);
      setSelZone(di?.zone_id ?? null);
    } else {
      setForm(EMPTY);
      setSelZone(null); setSelDistrict(null); setSelArea(null);
    }
    setFormError("");
  }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredDistricts = selZone ? allDistricts.filter(d => d.zone_id === selZone) : allDistricts;
  const filteredAreas = selDistrict ? allAreas.filter(a => a.district_id === selDistrict) : allAreas;
  const filteredClusters = selArea ? allClusters.filter(c => c.area_id === selArea) : allClusters;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isView) return;
    if (!form.name.trim()) { setFormError("Name is required"); return; }
    if (!form.cluster_id) { setFormError("Please select a cluster"); return; }
    setSaving(true); setFormError("");
    try {
      await onSave({ ...form });
    } catch (e: any) {
      setFormError(e?.response?.data?.detail ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const title = mode === "add" ? "Add Kutir" : mode === "edit" ? "Edit Kutir" : "View Kutir";

  return (
    <div style={grs.overlay}>
      <div style={grs.modal}>
        <h3 style={grs.modalTitle}>{title}</h3>
        {formError && <p style={grs.errorBox}>{formError}</p>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Geo cascade: Zone → District → Area → Cluster */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Row label="Zone">
                <select style={grs.select} value={selZone ?? ""} disabled={isView}
                  onChange={e => { setSelZone(Number(e.target.value) || null); setSelDistrict(null); setSelArea(null); setForm(f => ({ ...f, cluster_id: 0 })); }}>
                  <option value="">— select zone —</option>
                  {allZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </Row>
              <Row label="District">
                <select style={grs.select} value={selDistrict ?? ""} disabled={isView || !selZone}
                  onChange={e => { setSelDistrict(Number(e.target.value) || null); setSelArea(null); setForm(f => ({ ...f, cluster_id: 0 })); }}>
                  <option value="">— select district —</option>
                  {filteredDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Row>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Row label="Area">
                <select style={grs.select} value={selArea ?? ""} disabled={isView || !selDistrict}
                  onChange={e => { setSelArea(Number(e.target.value) || null); setForm(f => ({ ...f, cluster_id: 0 })); }}>
                  <option value="">— select area —</option>
                  {filteredAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Row>
              <Row label="Cluster *">
                <select style={grs.select} value={form.cluster_id || ""} disabled={isView || !selArea}
                  onChange={e => setForm(f => ({ ...f, cluster_id: Number(e.target.value) }))}>
                  <option value="">— select cluster —</option>
                  {filteredClusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Row>
            </div>
            {/* Name + Type */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Row label="Name *"><input style={grs.input} value={form.name} disabled={isView} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Row>
              <Row label="Type">
                <select style={grs.select} value={form.kutir_type} disabled={isView} onChange={e => setForm(f => ({ ...f, kutir_type: e.target.value }))}>
                  {KUTIR_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Row>
            </div>
            {/* State */}
            <Row label="State">
              <select style={grs.select} value={form.state} disabled={isView} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Row>
            {/* Enrollment */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Row label="Enroll 5th"><input style={grs.input} type="number" value={form.enrollment_5th ?? ""} disabled={isView} onChange={e => setForm(f => ({ ...f, enrollment_5th: Number(e.target.value) || null }))} /></Row>
              <Row label="Enroll 8th"><input style={grs.input} type="number" value={form.enrollment_8th ?? ""} disabled={isView} onChange={e => setForm(f => ({ ...f, enrollment_8th: Number(e.target.value) || null }))} /></Row>
            </div>

          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {!isView && <button type="submit" style={grs.btnPrimary} disabled={saving}>{saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Save"}</button>}
            <button type="button" style={grs.btnSecondary} onClick={onClose}>{isView ? "Close" : "Cancel"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function KutirsPage() {
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

  const [filterDistrict, setFilterDistrict] = useState<number | "">("");
  const [filterCluster, setFilterCluster] = useState<number | "">("");
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view" | null>(null);
  const [modalItem, setModalItem] = useState<Kutir | null>(null);

  const { data: kutirs = [], isLoading } = useQuery({ queryKey: ["kutirs"], queryFn: () => listKutirs() });
  const { data: allZones = [] } = useQuery({ queryKey: ["zones"], queryFn: listZones });
  const { data: allDistricts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { data: allAreas = [] } = useQuery({ queryKey: ["all-areas"], queryFn: () => listAreas() });
  const { data: allClusters = [] } = useQuery({ queryKey: ["all-clusters"], queryFn: () => listClusters() });

  const areaMap = new Map(allAreas.map(a => [a.id, a]));
  const clusterMap = new Map(allClusters.map(c => [c.id, c]));
  const filterClusters = allClusters.filter(c => filterDistrict === "" || areaMap.get(c.area_id)?.district_id === filterDistrict);

  // Auto-select when scoped user has only one option available
  useEffect(() => {
    if (allDistricts.length === 1) setFilterDistrict(allDistricts[0].id);
  }, [allDistricts]);

  useEffect(() => {
    if (filterClusters.length === 1) setFilterCluster(filterClusters[0].id);
  }, [filterClusters.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const createMut = useMutation({ mutationFn: createKutir });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<KutirCreate> }) => updateKutir(id, data),
  });
  const deleteMut = useMutation({
    mutationFn: deleteKutir,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kutirs"] }),
  });

  async function handleModalSave(data: KutirCreate) {
    if (modalMode === "edit" && modalItem) {
      await updateMut.mutateAsync({ id: modalItem.id, data });
    } else {
      await createMut.mutateAsync(data);
    }
    await qc.invalidateQueries({ queryKey: ["kutirs"] });
    setModalMode(null);
    setModalItem(null);
  }

  type KutirRow = typeof displayed[0];

  const allColumns: Col<KutirRow>[] = [
    { key: "name", label: "Name", sortable: true,
      render: r => <Link to={`/kutirs/${r.id}`} style={{ color: "var(--text-primary)", textDecoration: "none" }}>{r.name}</Link>,
      csvValue: r => r.name },
    { key: "kutir_type", label: "Type", sortable: true },
    { key: "cluster_id", label: "Cluster", sortable: true,
      sortValue: r => clusterMap.get(r.cluster_id)?.name ?? "",
      render: r => <span style={{ fontSize: "0.82rem" }}>{clusterMap.get(r.cluster_id)?.name ?? "—"}</span>,
      csvValue: r => clusterMap.get(r.cluster_id)?.name ?? "" },
    { key: "street", label: "Street", sortable: false, render: r => r.street ?? "—", csvValue: r => r.street ?? "" },
    { key: "state", label: "State", sortable: true },
    { key: "pincode", label: "Pincode", sortable: true, render: r => r.pincode ?? "—", csvValue: r => r.pincode ?? "" },
    { key: "enrollment_5th", label: "5th Enroll", sortable: true, render: r => r.enrollment_5th ?? "—", csvValue: r => String(r.enrollment_5th ?? "") },
    { key: "enrollment_8th", label: "8th Enroll", sortable: true, render: r => r.enrollment_8th ?? "—", csvValue: r => String(r.enrollment_8th ?? "") },
  ];

  const { isVisible, orderedMetas } = useFieldConfig("kutirs", KUTIRS_FIELDS);
  const columns = useMemo(() => {
    const colByKey = new Map(allColumns.map(c => [c.key, c]));
    return orderedMetas
      .filter(m => isVisible(m.key))
      .map(m => colByKey.get(m.key))
      .filter((c): c is NonNullable<typeof c> => c != null);
  }, [allColumns, orderedMetas, isVisible]);

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
        searchFn={(r, q) => r.name.toLowerCase().includes(q)}
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
        headerExtra={isAdmin ? (
          <a href="/admin/field-config?table=kutirs" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8125rem", color: "var(--text-secondary)", textDecoration: "none", padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <span>Columns</span>
          </a>
        ) : undefined}
        exportFilename="kutirs"
        printTitle="Kutirs"
        onAdd={() => { setModalItem(null); setModalMode("add"); }}
        addLabel="+ Add Kutir"
        actions={r => ({
          onView: () => { setModalItem(r); setModalMode("view"); },
          onEdit: () => { setModalItem(r); setModalMode("edit"); },
          onDelete: () => { if (confirm(`Delete kutir "${r.name}"?`)) deleteMut.mutate(r.id); },
        })}
      />

      {modalMode && (
        <KutirModal
          mode={modalMode}
          initial={modalItem}
          allZones={allZones}
          allDistricts={allDistricts}
          allAreas={allAreas}
          allClusters={allClusters}
          onClose={() => { setModalMode(null); setModalItem(null); }}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}
