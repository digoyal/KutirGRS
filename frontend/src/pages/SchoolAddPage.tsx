import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSchool, type SchoolCreate } from "../api/schools";
import { useAuth } from "../context/AuthContext";
import { listDistricts } from "../api/geo";
import { grs } from "../styles/grs";

const SCHOOL_TYPES = ["EMRS", "JNV", "KSP", "MRS", "GNV", "KGBV", "SportsBoys", "SportsGirls", "Other"];
const STATES = ["Madhya Pradesh", "Jharkhand", "Chhattisgarh"];
const BLANK: SchoolCreate = { name: "", school_type: "EMRS", state: "Madhya Pradesh", city: null, street: null, district_id: null, pincode: null };

const sec: React.CSSProperties = { background: "var(--bg-card)", borderRadius: 8, padding: "10px 14px", marginBottom: 8 };
const secTitle: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--badge-blue-fg, #2563eb)", marginBottom: 8 };

export default function SchoolAddPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<SchoolCreate>(BLANK);
  const [saveError, setSaveError] = useState("");

  const { data: districts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { user } = useAuth();

  const scopedDistricts = useMemo(() => {
    if (!user || user.title === "Admin") return districts;
    return user.district_ids?.length > 0
      ? districts.filter((d: any) => user.district_ids.includes(d.id))
      : districts;
  }, [districts, user]);

  useEffect(() => {
    if (scopedDistricts.length === 1 && !form.district_id) {
      setForm(f => ({ ...f, district_id: scopedDistricts[0].id }));
    }
  }, [scopedDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const createMut = useMutation({
    mutationFn: createSchool,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["schools"] }); navigate(-1); },
    onError: (e: any) => setSaveError(e?.response?.data?.detail ?? "Failed to save"),
  });

  function handleSave() {
    if (!form.name.trim()) { setSaveError("Name is required"); return; }
    setSaveError(""); createMut.mutate(form);
  }

  return (
    <div style={{ maxWidth: 600, padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button style={{ background: "none", border: "none", color: "var(--link-color)", cursor: "pointer", fontSize: 14, padding: 0 }} onClick={() => navigate(-1)}>← Back</button>
        <h2 style={{ margin: 0, fontSize: 20 }}>Add School</h2>
      </div>

      {saveError && <div style={{ color: "var(--danger)", background: "var(--danger-bg,#fef2f2)", border: "1px solid var(--danger-border,#fca5a5)", borderRadius: 6, padding: "8px 12px", marginBottom: 16, fontSize: 13 }}>{saveError}</div>}

      <section style={sec}>
        <div style={secTitle}>Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginBottom: 8 }}>
          <div>
            <label style={grs.fieldLabel}>Type</label>
            <select style={grs.select} value={form.school_type} onChange={e => setForm(f => ({ ...f, school_type: e.target.value }))}>
              {SCHOOL_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={grs.fieldLabel}>Name *</label>
            <input style={grs.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="School name" />
          </div>
        </div>
        <div>
          <label style={grs.fieldLabel}>Street / Address</label>
          <input style={grs.input} value={form.street ?? ""} onChange={e => setForm(f => ({ ...f, street: e.target.value || null }))} />
        </div>
      </section>

      <section style={sec}>
        <div style={secTitle}>Location</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div>
            <label style={grs.fieldLabel}>City / Block</label>
            <input style={grs.input} value={form.city ?? ""} onChange={e => setForm(f => ({ ...f, city: e.target.value || null }))} />
          </div>
          <div>
            <label style={grs.fieldLabel}>District</label>
            <select style={grs.select} value={form.district_id ?? ""} onChange={e => setForm(f => ({ ...f, district_id: Number(e.target.value) || null }))}>
              <option value="">— none —</option>
              {scopedDistricts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={grs.fieldLabel}>State</label>
            <select style={grs.select} value={form.state ?? "Madhya Pradesh"} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
              {STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={grs.fieldLabel}>Pincode</label>
            <input style={grs.input} value={form.pincode ?? ""} onChange={e => setForm(f => ({ ...f, pincode: e.target.value || null }))} maxLength={10} />
          </div>
        </div>
      </section>

      <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
        <button style={grs.btnSecondary} onClick={() => navigate(-1)}>Cancel</button>
        <button style={grs.btnPrimary} disabled={createMut.isPending} onClick={handleSave}>{createMut.isPending ? "Saving…" : "Save School"}</button>
      </div>
    </div>
  );
}
