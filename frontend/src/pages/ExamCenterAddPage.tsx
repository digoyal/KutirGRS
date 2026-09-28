import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createExamCenter, listDistricts, type ExamCenter } from "../api/geo";
import { useAuth } from "../context/AuthContext";
import { grs } from "../styles/grs";

const STATES = ["Madhya Pradesh", "Jharkhand", "Chhattisgarh"];
const sec: React.CSSProperties = { background: "var(--bg-card)", borderRadius: 8, padding: "10px 14px", marginBottom: 8 };
const secTitle: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--badge-blue-fg, #2563eb)", marginBottom: 8 };

type FormState = { name: string; district_id: number | null; street: string; city: string; state: string; pincode: string; };
const BLANK: FormState = { name: "", district_id: null, street: "", city: "", state: "Madhya Pradesh", pincode: "" };

export default function ExamCenterAddPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.title === "Admin";
  const [form, setForm] = useState<FormState>(BLANK);
  const [saveError, setSaveError] = useState("");

  const { data: allDistricts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });

  const scopedDistricts = isAdmin || !user
    ? allDistricts
    : allDistricts.filter(d => user.district_ids.includes(d.id));

  // Auto-select if only one district
  useEffect(() => {
    if (scopedDistricts.length === 1 && !form.district_id) {
      setForm(f => ({ ...f, district_id: scopedDistricts[0].id }));
    }
  }, [scopedDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const createMut = useMutation({
    mutationFn: (data: Omit<ExamCenter, "id">) => createExamCenter(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exam-centers"] }); navigate(-1); },
    onError: (e: any) => setSaveError(e?.response?.data?.detail ?? "Failed to save"),
  });

  function handleSave() {
    if (!form.name.trim()) { setSaveError("Name is required"); return; }
    if (!form.district_id) { setSaveError("Please select a district"); return; }
    setSaveError("");
    createMut.mutate({ name: form.name.trim(), district_id: form.district_id, street: form.street || null, city: form.city || null, state: form.state || null, pincode: form.pincode || null });
  }

  return (
    <div style={{ maxWidth: 600, padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button style={{ background: "none", border: "none", color: "var(--link-color)", cursor: "pointer", fontSize: 14, padding: 0 }} onClick={() => navigate(-1)}>← Back</button>
        <h2 style={{ margin: 0, fontSize: 20 }}>Add Exam Center</h2>
      </div>

      {saveError && <div style={{ color: "var(--danger)", background: "var(--danger-bg,#fef2f2)", border: "1px solid var(--danger-border,#fca5a5)", borderRadius: 6, padding: "8px 12px", marginBottom: 16, fontSize: 13 }}>{saveError}</div>}

      <section style={sec}>
        <div style={secTitle}>Details</div>
        <div>
          <label style={grs.fieldLabel}>Name *</label>
          <input style={grs.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Exam center name" />
        </div>
      </section>

      <section style={sec}>
        <div style={secTitle}>Location</div>
        <div style={{ marginBottom: 8 }}>
          <label style={grs.fieldLabel}>Street</label>
          <input style={grs.input} value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div>
            <label style={grs.fieldLabel}>City</label>
            <input style={grs.input} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <div>
            <label style={grs.fieldLabel}>District *</label>
            <select style={grs.select} value={form.district_id ?? ""} onChange={e => setForm(f => ({ ...f, district_id: Number(e.target.value) || null }))}>
              <option value="">— select —</option>
              {scopedDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={grs.fieldLabel}>State</label>
            <select style={grs.select} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
              {STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={grs.fieldLabel}>Pincode</label>
            <input style={grs.input} value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} maxLength={10} />
          </div>
        </div>
      </section>

      <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
        <button style={grs.btnSecondary} onClick={() => navigate(-1)}>Cancel</button>
        <button style={grs.btnPrimary} disabled={createMut.isPending} onClick={handleSave}>{createMut.isPending ? "Saving…" : "Save Exam Center"}</button>
      </div>
    </div>
  );
}
