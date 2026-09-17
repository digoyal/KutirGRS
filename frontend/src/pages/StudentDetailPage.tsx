import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStudent, updateStudent, type Student } from "../api/students";
import { listKutirs } from "../api/kutirs";
import type { Kutir } from "../api/kutirs";
import { listDistricts, listClusters, listCategories, listSubCategories } from "../api/geo";
import type { District, Cluster, Category, SubCategory } from "../api/geo";
import { grs } from "../styles/grs";

const DOCS: { key: keyof Student; label: string }[] = [
  { key: "aadhaar",        label: "Aadhaar Card" },
  { key: "category_cert",  label: "Category Certificate" },
  { key: "birth_cert",     label: "Birth Certificate" },
  { key: "residence_proof",label: "Residence Proof" },
  { key: "medical",        label: "Medical Certificate" },
];

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(() => searchParams.get("edit") === "1");
  const [form, setForm] = useState<Partial<Student>>({});
  const [saveError, setSaveError] = useState("");

  const { data: student, isLoading } = useQuery({
    queryKey: ["student", id],
    queryFn: () => getStudent(Number(id)),
    onSuccess: (s: Student) => setForm(s),
  } as any);

  const { data: kutirs = [] }    = useQuery<Kutir[]>({ queryKey: ["all-kutirs"],    queryFn: () => listKutirs() });
  const { data: districts = [] } = useQuery<District[]>({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { data: clusters = [] }  = useQuery<Cluster[]>({ queryKey: ["all-clusters"],  queryFn: () => listClusters() });
  const { data: categories = [] }= useQuery<Category[]>({ queryKey: ["categories"],    queryFn: () => listCategories() });
  const formCategoryId = (form.category_id as number | null) ?? null;
  const { data: subCategories = [] } = useQuery({
    queryKey: ["sub-categories", formCategoryId],
    queryFn: () => listSubCategories(formCategoryId ?? undefined) as Promise<SubCategory[]>,
    enabled: formCategoryId != null,
  });

  const updateMut = useMutation({
    mutationFn: (data: Partial<Student>) => updateStudent(Number(id), data),
    onSuccess: (updated: Student) => {
      qc.setQueryData(["student", id], updated);
      qc.invalidateQueries({ queryKey: ["students"] });
      setEditing(false);
      setSaveError("");
    },
    onError: (e: any) => setSaveError(e?.response?.data?.detail ?? "Save failed"),
  });

  if (isLoading) return <p style={{ color: "var(--text-secondary)", padding: 24 }}>Loading…</p>;
  if (!student)  return <p style={{ color: "var(--danger)", padding: 24 }}>Student not found.</p>;

  const s = student as Student;

  // Derived display values for view mode
  const kutir    = kutirs.find(k => k.id === s.kutir_id);
  const cluster  = clusters.find(c => c.id === (kutir as any)?.cluster_id);
  const district = districts.find(d => { const area_id = (cluster as any)?.area_id; return !!area_id && (d as any).id === area_id; });
  const category    = categories.find(c => c.id === s.category_id);

  function inp(label: string, key: keyof Student, type = "text") {
    return (
      <div>
        <label style={grs.fieldLabel}>{label}</label>
        {editing
          ? <input style={grs.input} type={type}
              value={(form[key] as string | null) ?? ""}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value || null }))} />
          : <div style={viewVal}>{(s[key] as string | null) ?? "—"}</div>}
      </div>
    );
  }

  const viewVal: React.CSSProperties = {
    fontSize: 14, color: "var(--text-primary)",
    padding: "7px 0", borderBottom: "1px solid transparent",
  };

  return (
    <div style={{ maxWidth: 600, padding: "16px 20px" }}>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button style={{ background: "none", border: "none", color: "var(--link-color)", cursor: "pointer", fontSize: 14, padding: 0 }}
          onClick={() => navigate("/students")}>← Back</button>
        <h2 style={{ margin: 0, fontSize: 20 }}>{s.first_name} {s.last_name}</h2>
        {!editing && (
          <button style={{ ...grs.btnPrimary, marginLeft: "auto" }} onClick={() => { setEditing(true); setForm(s); }}>Edit</button>
        )}
      </div>

      {saveError && (
        <div style={{ color: "var(--danger)", background: "var(--danger-bg,#fef2f2)", border: "1px solid var(--danger-border,#fca5a5)", borderRadius: 6, padding: "8px 12px", marginBottom: 16, fontSize: 13 }}>
          {saveError}
        </div>
      )}

      {/* ── Location ── */}
      <section style={sec}>
        <div style={secTitle}>Location</div>
        {editing ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div>
              <label style={grs.fieldLabel}>District</label>
              <select style={grs.select} value={(form as any).district_filter ?? district?.id ?? ""}
                onChange={() => setForm(f => ({ ...f, kutir_id: null }))}>
                <option value="">— any —</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label style={grs.fieldLabel}>Cluster</label>
              <select style={grs.select} value={cluster?.id ?? ""}
                onChange={() => setForm(f => ({ ...f, kutir_id: null }))}>
                <option value="">— any —</option>
                {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={grs.fieldLabel}>Kutir</label>
              <select style={grs.select} value={form.kutir_id ?? ""}
                onChange={e => setForm(f => ({ ...f, kutir_id: Number(e.target.value) || null }))}>
                <option value="">— select —</option>
                {kutirs.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div><label style={grs.fieldLabel}>District</label><div style={viewVal}>{district?.name ?? "—"}</div></div>
            <div><label style={grs.fieldLabel}>Cluster</label><div style={viewVal}>{cluster?.name ?? "—"}</div></div>
            <div><label style={grs.fieldLabel}>Kutir</label><div style={viewVal}>{kutir?.name ?? "—"}</div></div>
          </div>
        )}
      </section>

      {/* ── Personal Info ── */}
      <section style={sec}>
        <div style={secTitle}>Personal Info</div>

        {/* First + Last Name */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          {inp("First Name", "first_name")}
          {inp("Last Name", "last_name")}
        </div>

        {/* Gender + DOB + Class */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 110px", gap: 8, marginBottom: 8 }}>
          <div>
            <label style={grs.fieldLabel}>Gender</label>
            {editing
              ? <select style={grs.select} value={(form.gender as string) ?? "Boy"}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                  <option>Boy</option><option>Girl</option>
                </select>
              : <div style={viewVal}>{s.gender}</div>}
          </div>
          {inp("Date of Birth", "dob", "date")}
        </div>

        {/* Category + Sub-category */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div>
            <label style={grs.fieldLabel}>Category</label>
            {editing
              ? <select style={grs.select} value={form.category_id ?? ""}
                  onChange={e => {
                    const id = Number(e.target.value) || null;
                    setForm(f => ({ ...f, category_id: id, sub_category_id: null }));
                  }}>
                  <option value="">— none —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              : <div style={viewVal}>{category?.name ?? "—"}</div>}
          </div>
          <div>
            <label style={grs.fieldLabel}>Sub-Category</label>
            {editing
              ? <select style={grs.select} value={form.sub_category_id ?? ""}
                  disabled={!formCategoryId}
                  onChange={e => setForm(f => ({ ...f, sub_category_id: Number(e.target.value) || null }))}>
                  <option value="">— none —</option>
                  {subCategories.map((sc: any) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                </select>
              : <div style={viewVal}>{subCategories.find((sc: any) => sc.id === s.sub_category_id)?.name ?? "—"}</div>}
          </div>
        </div>

        {/* Phone + Email */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {inp("Phone", "phone")}
          {inp("Email", "email", "email")}
        </div>
      </section>

      {/* ── Family ── */}
      <section style={sec}>
        <div style={secTitle}>Family</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          {inp("Father's Name", "father_name")}
          {inp("Mother's Name", "mother_name")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {inp("Alt Contact Name", "alt_contact_name")}
          {inp("Alt Contact Phone", "alt_contact_phone")}
        </div>
      </section>

      {/* ── Address ── */}
      <section style={sec}>
        <div style={secTitle}>Address</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {inp("Street", "street")}
          {inp("Pincode", "pincode")}
        </div>
      </section>

      {/* ── Documents ── */}
      <section style={sec}>
        <div style={secTitle}>Documents Collected</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
          {DOCS.map(({ key, label }) => {
            const checked = editing ? !!(form[key]) : !!(s[key]);
            return (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: editing ? "pointer" : "default", fontSize: 14 }}>
                <input type="checkbox" disabled={!editing} checked={checked}
                  onChange={e => editing && setForm(f => ({ ...f, [key]: e.target.checked }))}
                  style={{ width: 15, height: 15 }} />
                <span style={{ color: checked ? "var(--status-success-fg, #16a34a)" : "var(--text-secondary)" }}>{label}</span>
                {checked
                  ? <span style={tag("#dcfce7","#16a34a")}>✓</span>
                  : <span style={tag("#fef2f2","#dc2626")}>Missing</span>}
              </label>
            );
          })}
        </div>
      </section>

      {/* ── Save / Cancel (edit mode) ── */}
      {editing && (
        <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
          <button style={grs.btnSecondary}
            onClick={() => { setEditing(false); setForm(s); setSaveError(""); }}>Cancel</button>
          <button style={grs.btnPrimary} disabled={updateMut.isPending}
            onClick={() => updateMut.mutate(form, { onSuccess: () => navigate("/students") })}>
            {updateMut.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}

      {/* ── Record timestamps ── */}
      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8 }}>
        Added: {new Date(s.created_at).toLocaleString("en-IN")} &nbsp;·&nbsp;
        Updated: {new Date(s.updated_at).toLocaleString("en-IN")}
      </p>
    </div>
  );
}

const sec: React.CSSProperties = {
  background: "var(--bg-card)", borderRadius: 8, padding: "10px 14px", marginBottom: 8,
};
const secTitle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
  color: "var(--badge-blue-fg, #2563eb)", marginBottom: 8,
};
function tag(bg: string, color: string): React.CSSProperties {
  return { fontSize: 11, background: bg, color, padding: "1px 6px", borderRadius: 10, fontWeight: 600 };
}
