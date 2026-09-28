import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getExamCenter, updateExamCenter, type ExamCenter } from "../api/geo";
import { listDistricts } from "../api/geo";
import { grs } from "../styles/grs";

const STATES = ["Madhya Pradesh", "Jharkhand", "Chhattisgarh"];
const viewVal: React.CSSProperties = { fontSize: 14, color: "var(--text-primary)", padding: "7px 0" };
const sec: React.CSSProperties = { background: "var(--bg-card)", borderRadius: 8, padding: "10px 14px", marginBottom: 8 };
const secTitle: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--badge-blue-fg, #2563eb)", marginBottom: 8 };

type FormState = { name: string; district_id: number | null; street: string; city: string; state: string; pincode: string; };

export default function ExamCenterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();

  const enteredViaEdit = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState(enteredViaEdit);
  const [form, setForm] = useState<FormState>({ name: "", district_id: null, street: "", city: "", state: "Madhya Pradesh", pincode: "" });
  const [saveError, setSaveError] = useState("");

  const { data: center, isLoading } = useQuery({
    queryKey: ["exam-center", Number(id)],
    queryFn: () => getExamCenter(Number(id)),
    enabled: !!id,
  });
  const { data: districts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });

  useEffect(() => {
    if (!center) return;
    setForm({ name: center.name, district_id: center.district_id ?? null, street: center.street ?? "", city: center.city ?? "", state: center.state ?? "Madhya Pradesh", pincode: center.pincode ?? "" });
  }, [center]);

  const updateMut = useMutation({
    mutationFn: (data: Partial<ExamCenter>) => updateExamCenter(Number(id), data),
    onSuccess: (updated) => {
      qc.setQueryData(["exam-center", Number(id)], (old: any) => ({ ...old, ...updated }));
      qc.invalidateQueries({ queryKey: ["exam-centers"] });
      if (enteredViaEdit) navigate(-1); else { setEditing(false); setSaveError(""); }
    },
    onError: (e: any) => setSaveError(e?.response?.data?.detail ?? "Save failed"),
  });

  function handleSave() {
    if (!form.name.trim()) { setSaveError("Name is required"); return; }
    if (!form.district_id) { setSaveError("Please select a district"); return; }
    setSaveError("");
    updateMut.mutate({ name: form.name.trim(), district_id: form.district_id, street: form.street || null, city: form.city || null, state: form.state || null, pincode: form.pincode || null });
  }
  function handleCancel() {
    if (enteredViaEdit) navigate(-1);
    else { setEditing(false); setSaveError(""); if (center) setForm({ name: center.name, district_id: center.district_id ?? null, street: center.street ?? "", city: center.city ?? "", state: center.state ?? "Madhya Pradesh", pincode: center.pincode ?? "" }); }
  }

  if (isLoading) return <div style={{ padding: 32, color: "var(--text-secondary)" }}>Loading…</div>;
  if (!center) return <div style={{ padding: 32, color: "var(--status-danger-fg)" }}>Exam center not found.</div>;

  const districtName = districts.find(d => d.id === center.district_id)?.name;

  function field(label: string, viewValue: React.ReactNode, editContent: React.ReactNode) {
    return <div><label style={grs.fieldLabel}>{label}</label>{editing ? editContent : <div style={viewVal}>{viewValue ?? "—"}</div>}</div>;
  }

  return (
    <div style={{ maxWidth: 600, padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button style={{ background: "none", border: "none", color: "var(--link-color)", cursor: "pointer", fontSize: 14, padding: 0 }} onClick={() => navigate("/exam-centers")}>← Back</button>
        <h2 style={{ margin: 0, fontSize: 20 }}>{center.name}</h2>
        {!editing && (
          <button style={{ ...grs.btnSecondary, marginLeft: "auto", fontSize: 13 }} onClick={() => setEditing(true)}>Edit</button>
        )}
      </div>

      {saveError && <div style={{ color: "var(--danger)", background: "var(--danger-bg,#fef2f2)", border: "1px solid var(--danger-border,#fca5a5)", borderRadius: 6, padding: "8px 12px", marginBottom: 16, fontSize: 13 }}>{saveError}</div>}

      <section style={sec}>
        <div style={secTitle}>Details</div>
        {field("Name *", center.name,
          <input style={grs.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        )}
      </section>

      <section style={sec}>
        <div style={secTitle}>Location</div>
        <div style={{ marginBottom: 8 }}>
          {field("Street", center.street,
            <input style={grs.input} value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          {field("City", center.city,
            <input style={grs.input} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
          )}
          {field("District *", districtName,
            <select style={grs.select} value={form.district_id ?? ""} onChange={e => setForm(f => ({ ...f, district_id: Number(e.target.value) || null }))}>
              <option value="">— select —</option>
              {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {field("State", center.state,
            <select style={grs.select} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
              {STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          )}
          {field("Pincode", center.pincode,
            <input style={grs.input} value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} maxLength={10} />
          )}
        </div>
      </section>

      {editing && (
        <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
          <button style={grs.btnSecondary} onClick={handleCancel}>Cancel</button>
          <button style={grs.btnPrimary} disabled={updateMut.isPending} onClick={handleSave}>{updateMut.isPending ? "Saving…" : "Save Changes"}</button>
        </div>
      )}
    </div>
  );
}
