import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getKutir, updateKutir, type KutirCreate } from "../api/kutirs";
import { listZones, listDistricts, listAreas, listClusters } from "../api/geo";
import { grs } from "../styles/grs";
import { useAuth } from "../context/AuthContext";

const KUTIR_TYPES = ["Seva Kutir", "Shiksha Kutir", "Non-Kutir"];
const STATES = ["Madhya Pradesh", "Jharkhand", "Chhattisgarh"];

const viewVal: React.CSSProperties = {
  fontSize: 14, color: "var(--text-primary)",
  padding: "7px 0", borderBottom: "1px solid transparent",
};

const sec: React.CSSProperties = {
  background: "var(--bg-card)", borderRadius: 8, padding: "10px 14px", marginBottom: 8,
};
const secTitle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
  color: "var(--badge-blue-fg, #2563eb)", marginBottom: 8,
};

export default function KutirDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { user } = useAuth();

  const MANAGER_ROLES = ["Admin", "Regional Head", "District Anchor", "Education Coordinator", "Cluster Coordinator"];
  const canManage = MANAGER_ROLES.includes(user?.title ?? "");

  const enteredViaEdit = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState(enteredViaEdit);
  const [form, setForm] = useState<KutirCreate>({ name: "", kutir_type: "Seva Kutir", cluster_id: 0, state: "Madhya Pradesh" });
  const [selZone, setSelZone] = useState<number | null>(null);
  const [selDistrict, setSelDistrict] = useState<number | null>(null);
  const [selArea, setSelArea] = useState<number | null>(null);
  const [saveError, setSaveError] = useState("");

  const { data: kutir, isLoading } = useQuery({
    queryKey: ["kutir", Number(id)],
    queryFn: () => getKutir(Number(id)),
    enabled: !!id,
  });

  const { data: allZones = [] }     = useQuery({ queryKey: ["zones"],         queryFn: listZones });
  const { data: allDistricts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { data: allAreas = [] }     = useQuery({ queryKey: ["all-areas"],     queryFn: () => listAreas() });
  const { data: allClusters = [] }  = useQuery({ queryKey: ["all-clusters"],  queryFn: () => listClusters() });

  // Populate form + geo selectors when kutir loads
  useEffect(() => {
    if (!kutir) return;
    setForm({
      name: kutir.name,
      kutir_type: kutir.kutir_type,
      cluster_id: kutir.cluster_id,
      district_id: kutir.district_id,
      street: kutir.street,
      state: kutir.state,
      pincode: kutir.pincode,
      enrollment_5th: kutir.enrollment_5th,
      enrollment_8th: kutir.enrollment_8th,
    });
    // Derive geo selectors from cluster chain
    const cl = allClusters.find(c => c.id === kutir.cluster_id);
    const ar = cl ? allAreas.find(a => a.id === cl.area_id) : null;
    const di = ar ? allDistricts.find(d => d.id === ar.district_id) : null;
    setSelArea(cl?.area_id ?? null);
    setSelDistrict(ar?.district_id ?? null);
    setSelZone((di as any)?.zone_id ?? null);
  }, [kutir, allClusters.length, allAreas.length, allDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredDistricts = selZone ? allDistricts.filter((d: any) => d.zone_id === selZone) : allDistricts;
  const filteredAreas     = selDistrict ? allAreas.filter(a => a.district_id === selDistrict) : allAreas;
  const filteredClusters  = selArea ? allClusters.filter(c => c.area_id === selArea) : allClusters;

  const updateMut = useMutation({
    mutationFn: (data: Partial<KutirCreate>) => updateKutir(Number(id), data),
    onSuccess: (updated) => {
      qc.setQueryData(["kutir", Number(id)], (old: any) => ({ ...old, ...updated }));
      qc.invalidateQueries({ queryKey: ["kutirs"] });
      if (enteredViaEdit) { navigate(-1); } else { setEditing(false); setSaveError(""); }
    },
    onError: (e: any) => setSaveError(e?.response?.data?.detail ?? "Save failed"),
  });

  function handleSave() {
    if (!form.name.trim()) { setSaveError("Name is required"); return; }
    if (!form.cluster_id) { setSaveError("Please select a cluster"); return; }
    setSaveError("");
    updateMut.mutate(form);
  }

  function handleCancel() {
    if (enteredViaEdit) navigate(-1);
    else { setEditing(false); setSaveError(""); if (kutir) setForm({ name: kutir.name, kutir_type: kutir.kutir_type, cluster_id: kutir.cluster_id, district_id: kutir.district_id, street: kutir.street, state: kutir.state, pincode: kutir.pincode, enrollment_5th: kutir.enrollment_5th, enrollment_8th: kutir.enrollment_8th }); }
  }

  if (isLoading) return <div style={{ padding: 32, color: "var(--text-secondary)" }}>Loading…</div>;
  if (!kutir)    return <div style={{ padding: 32, color: "var(--status-danger-fg)" }}>Kutir not found.</div>;

  // Derived display values for view mode
  const zone     = kutir.cluster?.area?.district?.zone?.name;
  const district = kutir.cluster?.area?.district?.name;
  const area     = kutir.cluster?.area?.name;
  const cluster  = kutir.cluster?.name;

  function field(label: string, viewValue: React.ReactNode, editContent: React.ReactNode) {
    return (
      <div>
        <label style={grs.fieldLabel}>{label}</label>
        {editing ? editContent : <div style={viewVal}>{viewValue ?? "—"}</div>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, padding: "16px 20px" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button style={{ background: "none", border: "none", color: "var(--link-color)", cursor: "pointer", fontSize: 14, padding: 0 }}
          onClick={() => navigate("/kutirs")}>← Back</button>
        <h2 style={{ margin: 0, fontSize: 20 }}>{kutir.name}</h2>
        {!editing && canManage && (
          <button style={{ ...grs.btnSecondary, marginLeft: "auto", fontSize: 13 }}
            onClick={() => setEditing(true)}>Edit</button>
        )}
      </div>

      {saveError && (
        <div style={{ color: "var(--danger)", background: "var(--danger-bg,#fef2f2)", border: "1px solid var(--danger-border,#fca5a5)", borderRadius: 6, padding: "8px 12px", marginBottom: 16, fontSize: 13 }}>
          {saveError}
        </div>
      )}

      {/* Location */}
      <section style={sec}>
        <div style={secTitle}>Location</div>
        {editing ? (
          <>
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
          </>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div><label style={grs.fieldLabel}>Zone</label><div style={viewVal}>{zone ?? "—"}</div></div>
            <div><label style={grs.fieldLabel}>District</label><div style={viewVal}>{district ?? "—"}</div></div>
            <div><label style={grs.fieldLabel}>Area</label><div style={viewVal}>{area ?? "—"}</div></div>
            <div><label style={grs.fieldLabel}>Cluster</label><div style={viewVal}>{cluster ?? "—"}</div></div>
          </div>
        )}
      </section>

      {/* Details */}
      <section style={sec}>
        <div style={secTitle}>Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          {field("Name *", kutir.name,
            <input style={grs.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          )}
          {field("Type", kutir.kutir_type,
            <select style={grs.select} value={form.kutir_type} onChange={e => setForm(f => ({ ...f, kutir_type: e.target.value }))}>
              {KUTIR_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          )}
        </div>
        {field("State", kutir.state,
          <select style={grs.select} value={form.state ?? "Madhya Pradesh"} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
            {STATES.map(s => <option key={s}>{s}</option>)}
          </select>
        )}
      </section>

      {/* Enrollment */}
      <section style={sec}>
        <div style={secTitle}>Enrollment</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {field("5th Grade", kutir.enrollment_5th ?? "—",
            <input style={grs.input} type="number" value={form.enrollment_5th ?? ""} onChange={e => setForm(f => ({ ...f, enrollment_5th: Number(e.target.value) || null }))} />
          )}
          {field("8th Grade", kutir.enrollment_8th ?? "—",
            <input style={grs.input} type="number" value={form.enrollment_8th ?? ""} onChange={e => setForm(f => ({ ...f, enrollment_8th: Number(e.target.value) || null }))} />
          )}
        </div>
      </section>

      {/* Teacher */}
      {!editing && kutir.teacher && (
        <section style={sec}>
          <div style={secTitle}>Teacher</div>
          <div style={viewVal}>
            {[kutir.teacher.first_name, kutir.teacher.last_name].filter(Boolean).join(" ") || kutir.teacher.username}
            {kutir.teacher.title && <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}> ({kutir.teacher.title})</span>}
          </div>
        </section>
      )}

      {/* Save / Cancel */}
      {editing && (
        <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
          <button style={grs.btnSecondary} onClick={handleCancel}>Cancel</button>
          <button style={grs.btnPrimary} disabled={updateMut.isPending} onClick={handleSave}>
            {updateMut.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
