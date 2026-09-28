import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSchool, updateSchool, type SchoolCreate } from "../api/schools";
import { listDistricts } from "../api/geo";
import { grs } from "../styles/grs";

const SCHOOL_TYPES = ["EMRS", "JNV", "KSP", "MRS", "GNV", "KGBV", "SportsBoys", "SportsGirls", "Other"];
const STATES = ["Madhya Pradesh", "Jharkhand", "Chhattisgarh"];

const viewVal: React.CSSProperties = { fontSize: 14, color: "var(--text-primary)", padding: "7px 0" };
const sec: React.CSSProperties = { background: "var(--bg-card)", borderRadius: 8, padding: "10px 14px", marginBottom: 8 };
const secTitle: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--badge-blue-fg, #2563eb)", marginBottom: 8 };

export default function SchoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();

  const enteredViaEdit = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState(enteredViaEdit);
  const [form, setForm] = useState<SchoolCreate>({ name: "", school_type: "EMRS", state: "Madhya Pradesh", city: null, street: null, district_id: null, pincode: null });
  const [saveError, setSaveError] = useState("");

  const { data: school, isLoading } = useQuery({
    queryKey: ["school", Number(id)],
    queryFn: () => getSchool(Number(id)),
    enabled: !!id,
  });
  const { data: districts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });

  useEffect(() => {
    if (!school) return;
    setForm({ name: school.name, school_type: school.school_type, state: school.state, city: school.city, street: school.street, district_id: school.district_id, pincode: school.pincode });
  }, [school]);

  const updateMut = useMutation({
    mutationFn: (data: Partial<SchoolCreate>) => updateSchool(Number(id), data),
    onSuccess: (updated) => {
      qc.setQueryData(["school", Number(id)], (old: any) => ({ ...old, ...updated }));
      qc.invalidateQueries({ queryKey: ["schools"] });
      if (enteredViaEdit) navigate(-1); else { setEditing(false); setSaveError(""); }
    },
    onError: (e: any) => setSaveError(e?.response?.data?.detail ?? "Save failed"),
  });

  function handleSave() {
    if (!form.name.trim()) { setSaveError("Name is required"); return; }
    setSaveError(""); updateMut.mutate(form);
  }
  function handleCancel() {
    if (enteredViaEdit) navigate(-1);
    else { setEditing(false); setSaveError(""); if (school) setForm({ name: school.name, school_type: school.school_type, state: school.state, city: school.city, street: school.street, district_id: school.district_id, pincode: school.pincode }); }
  }

  if (isLoading) return <div style={{ padding: 32, color: "var(--text-secondary)" }}>Loading…</div>;
  if (!school) return <div style={{ padding: 32, color: "var(--status-danger-fg)" }}>School not found.</div>;

  const districtName = districts.find(d => d.id === school.district_id)?.name;

  function field(label: string, viewValue: React.ReactNode, editContent: React.ReactNode) {
    return <div><label style={grs.fieldLabel}>{label}</label>{editing ? editContent : <div style={viewVal}>{viewValue ?? "—"}</div>}</div>;
  }

  return (
    <div style={{ maxWidth: 600, padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button style={{ background: "none", border: "none", color: "var(--link-color)", cursor: "pointer", fontSize: 14, padding: 0 }} onClick={() => navigate("/schools")}>← Back</button>
        <h2 style={{ margin: 0, fontSize: 20 }}>{school.name}</h2>
        {!editing && (
          <button style={{ ...grs.btnSecondary, marginLeft: "auto", fontSize: 13 }} onClick={() => setEditing(true)}>Edit</button>
        )}
      </div>

      {saveError && <div style={{ color: "var(--danger)", background: "var(--danger-bg,#fef2f2)", border: "1px solid var(--danger-border,#fca5a5)", borderRadius: 6, padding: "8px 12px", marginBottom: 16, fontSize: 13 }}>{saveError}</div>}

      <section style={sec}>
        <div style={secTitle}>Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginBottom: 8 }}>
          {field("Type", school.school_type,
            <select style={grs.select} value={form.school_type} onChange={e => setForm(f => ({ ...f, school_type: e.target.value }))}>
              {SCHOOL_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          )}
          {field("Name *", school.name,
            <input style={grs.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          )}
        </div>
        {field("Street / Address", school.street,
          <input style={grs.input} value={form.street ?? ""} onChange={e => setForm(f => ({ ...f, street: e.target.value || null }))} />
        )}
      </section>

      <section style={sec}>
        <div style={secTitle}>Location</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          {field("City / Block", school.city,
            <input style={grs.input} value={form.city ?? ""} onChange={e => setForm(f => ({ ...f, city: e.target.value || null }))} />
          )}
          {field("District", districtName,
            <select style={grs.select} value={form.district_id ?? ""} onChange={e => setForm(f => ({ ...f, district_id: Number(e.target.value) || null }))}>
              <option value="">— none —</option>
              {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {field("State", school.state,
            <select style={grs.select} value={form.state ?? "Madhya Pradesh"} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
              {STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          )}
          {field("Pincode", school.pincode,
            <input style={grs.input} value={form.pincode ?? ""} onChange={e => setForm(f => ({ ...f, pincode: e.target.value || null }))} maxLength={10} />
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
