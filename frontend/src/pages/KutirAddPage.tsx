import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createKutir, type KutirCreate } from "../api/kutirs";
import { listZones, listDistricts, listAreas, listClusters } from "../api/geo";
import { grs } from "../styles/grs";
import { useAuth } from "../context/AuthContext";

const KUTIR_TYPES = ["Seva Kutir", "Shiksha Kutir", "Non-Kutir"];
const STATES = ["Madhya Pradesh", "Jharkhand", "Chhattisgarh"];
const EMPTY: KutirCreate = { name: "", kutir_type: "Seva Kutir", cluster_id: 0, state: "Madhya Pradesh" };

const sec: React.CSSProperties = {
  background: "var(--bg-card)", borderRadius: 8, padding: "10px 14px", marginBottom: 8,
};
const secTitle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
  color: "var(--badge-blue-fg, #2563eb)", marginBottom: 8,
};

export default function KutirAddPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const isAdmin = user?.title === "Admin";

  const [form, setForm] = useState<KutirCreate>(EMPTY);
  const [selZone, setSelZone] = useState<number | null>(null);
  const [selDistrict, setSelDistrict] = useState<number | null>(null);
  const [selArea, setSelArea] = useState<number | null>(null);
  const [saveError, setSaveError] = useState("");

  const { data: allZones = [] }     = useQuery({ queryKey: ["zones"],         queryFn: listZones });
  const { data: allDistricts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { data: allAreas = [] }     = useQuery({ queryKey: ["all-areas"],     queryFn: () => listAreas() });
  const { data: allClusters = [] }  = useQuery({ queryKey: ["all-clusters"],  queryFn: () => listClusters() });

  // Scope for non-admin
  const scopedDistricts = isAdmin || !user
    ? allDistricts
    : allDistricts.filter((d: any) => user.district_ids.includes(d.id));
  const scopedClusters = isAdmin || !user
    ? allClusters
    : user.cluster_ids.length > 0
      ? allClusters.filter((c: any) => user.cluster_ids.includes(c.id))
      : allClusters;

  // Auto-select when only one option available
  useEffect(() => {
    if (scopedDistricts.length === 1 && !selDistrict) {
      const d = scopedDistricts[0] as any;
      setSelDistrict(d.id);
      setSelZone(d.zone_id ?? null);
      const areas = allAreas.filter((a: any) => a.district_id === d.id);
      if (areas.length === 1) {
        setSelArea(areas[0].id);
        const clusters = scopedClusters.filter((c: any) => c.area_id === areas[0].id);
        if (clusters.length === 1) setForm(f => ({ ...f, cluster_id: clusters[0].id }));
      }
    }
  }, [scopedDistricts.length, allAreas.length, scopedClusters.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredDistricts = selZone ? scopedDistricts.filter((d: any) => d.zone_id === selZone) : scopedDistricts;
  const filteredAreas     = selDistrict ? allAreas.filter((a: any) => a.district_id === selDistrict) : allAreas;
  const filteredClusters  = selArea ? scopedClusters.filter((c: any) => c.area_id === selArea) : scopedClusters;

  const createMut = useMutation({
    mutationFn: createKutir,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kutirs"] });
      navigate(-1);
    },
    onError: (e: any) => setSaveError(e?.response?.data?.detail ?? "Failed to save"),
  });

  function handleSave() {
    if (!form.name.trim()) { setSaveError("Name is required"); return; }
    if (!form.cluster_id) { setSaveError("Please select a cluster"); return; }
    setSaveError("");
    createMut.mutate(form);
  }

  return (
    <div style={{ maxWidth: 600, padding: "16px 20px" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button style={{ background: "none", border: "none", color: "var(--link-color)", cursor: "pointer", fontSize: 14, padding: 0 }}
          onClick={() => navigate(-1)}>← Back</button>
        <h2 style={{ margin: 0, fontSize: 20 }}>Add Kutir</h2>
      </div>

      {saveError && (
        <div style={{ color: "var(--danger)", background: "var(--danger-bg,#fef2f2)", border: "1px solid var(--danger-border,#fca5a5)", borderRadius: 6, padding: "8px 12px", marginBottom: 16, fontSize: 13 }}>
          {saveError}
        </div>
      )}

      {/* Location */}
      <section style={sec}>
        <div style={secTitle}>Location</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div>
            <label style={grs.fieldLabel}>Zone</label>
            <select style={grs.select} value={selZone ?? ""}
              onChange={e => { setSelZone(Number(e.target.value) || null); setSelDistrict(null); setSelArea(null); setForm(f => ({ ...f, cluster_id: 0 })); }}>
              <option value="">— select zone —</option>
              {allZones.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div>
            <label style={grs.fieldLabel}>District</label>
            <select style={grs.select} value={selDistrict ?? ""} disabled={!selZone}
              onChange={e => { setSelDistrict(Number(e.target.value) || null); setSelArea(null); setForm(f => ({ ...f, cluster_id: 0 })); }}>
              <option value="">— select district —</option>
              {filteredDistricts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={grs.fieldLabel}>Area</label>
            <select style={grs.select} value={selArea ?? ""} disabled={!selDistrict}
              onChange={e => { setSelArea(Number(e.target.value) || null); setForm(f => ({ ...f, cluster_id: 0 })); }}>
              <option value="">— select area —</option>
              {filteredAreas.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label style={grs.fieldLabel}>Cluster *</label>
            <select style={grs.select} value={form.cluster_id || ""} disabled={!selArea}
              onChange={e => setForm(f => ({ ...f, cluster_id: Number(e.target.value) }))}>
              <option value="">— select cluster —</option>
              {filteredClusters.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Details */}
      <section style={sec}>
        <div style={secTitle}>Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div>
            <label style={grs.fieldLabel}>Name *</label>
            <input style={grs.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Kutir name" />
          </div>
          <div>
            <label style={grs.fieldLabel}>Type</label>
            <select style={grs.select} value={form.kutir_type} onChange={e => setForm(f => ({ ...f, kutir_type: e.target.value }))}>
              {KUTIR_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={grs.fieldLabel}>State</label>
          <select style={grs.select} value={form.state ?? "Madhya Pradesh"} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
            {STATES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </section>

      {/* Enrollment */}
      <section style={sec}>
        <div style={secTitle}>Enrollment</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={grs.fieldLabel}>5th Grade</label>
            <input style={grs.input} type="number" value={form.enrollment_5th ?? ""} onChange={e => setForm(f => ({ ...f, enrollment_5th: Number(e.target.value) || null }))} placeholder="0" />
          </div>
          <div>
            <label style={grs.fieldLabel}>8th Grade</label>
            <input style={grs.input} type="number" value={form.enrollment_8th ?? ""} onChange={e => setForm(f => ({ ...f, enrollment_8th: Number(e.target.value) || null }))} placeholder="0" />
          </div>
        </div>
      </section>

      <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
        <button style={grs.btnSecondary} onClick={() => navigate(-1)}>Cancel</button>
        <button style={grs.btnPrimary} disabled={createMut.isPending} onClick={handleSave}>
          {createMut.isPending ? "Saving…" : "Save Kutir"}
        </button>
      </div>
    </div>
  );
}
