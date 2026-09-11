import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStudent, updateStudent, type Student } from "../api/students";

const DOCS: { key: keyof Student; label: string }[] = [
  { key: "aadhaar", label: "Aadhaar Card" },
  { key: "category_cert", label: "Category Certificate" },
  { key: "birth_cert", label: "Birth Certificate" },
  { key: "residence_proof", label: "Residence Proof" },
  { key: "medical", label: "Medical Certificate" },
];

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Student>>({});
  const [saveError, setSaveError] = useState("");

  const { data: student, isLoading } = useQuery({
    queryKey: ["student", id],
    queryFn: () => getStudent(Number(id)),
    onSuccess: (s: Student) => setForm(s),
  } as any);

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

  if (isLoading) return <p style={{ color: "var(--text-secondary)" }}>Loading…</p>;
  if (!student) return <p style={{ color: "var(--status-danger-fg)" }}>Student not found.</p>;

  const s = student as Student;

  function field(label: string, key: keyof Student, type = "text") {
    const val = editing ? (form[key] as string | null) ?? "" : (s[key] as string | null) ?? "—";
    return (
      <div style={styles.field}>
        <label style={styles.fieldLabel}>{label}</label>
        {editing ? (
          <input
            style={styles.input}
            type={type}
            value={val as string}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value || null }))}
          />
        ) : (
          <span style={styles.fieldVal}>{val as string}</span>
        )}
      </div>
    );
  }

  function selectField(label: string, key: keyof Student, options: string[]) {
    return (
      <div style={styles.field}>
        <label style={styles.fieldLabel}>{label}</label>
        {editing ? (
          <select style={styles.input} value={(form[key] as string) ?? ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}>
            {options.map(o => <option key={o}>{o}</option>)}
          </select>
        ) : (
          <span style={styles.fieldVal}>{(s[key] as string) ?? "—"}</span>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, padding: "24px 28px" }}>
      <div style={styles.topbar}>
        <button style={styles.backBtn} onClick={() => navigate("/students")}>← Back</button>
        <h2 style={{ margin: 0 }}>{s.first_name} {s.last_name}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {editing ? (
            <>
              <button style={styles.primaryBtn} disabled={updateMut.isPending} onClick={() => updateMut.mutate(form)}>
                {updateMut.isPending ? "Saving…" : "Save"}
              </button>
              <button style={styles.secondaryBtn} onClick={() => { setEditing(false); setForm(s); setSaveError(""); }}>Cancel</button>
            </>
          ) : (
            <button style={styles.primaryBtn} onClick={() => { setEditing(true); setForm(s); }}>Edit</button>
          )}
        </div>
      </div>

      {saveError && <p style={styles.error}>{saveError}</p>}

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Personal Info</h3>
        <div style={styles.grid2}>
          {field("First Name", "first_name")}
          {field("Last Name", "last_name")}
          {selectField("Gender", "gender", ["Boy", "Girl"])}
          {field("Date of Birth", "dob", "date")}
          {field("Phone", "phone")}
          {field("Email", "email", "email")}
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Family</h3>
        <div style={styles.grid2}>
          {field("Father's Name", "father_name")}
          {field("Mother's Name", "mother_name")}
          {field("Alt Contact", "alt_contact_name")}
          {field("Alt Phone", "alt_contact_phone")}
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Address</h3>
        <div style={styles.grid2}>
          {field("Street", "street")}
          {field("Pincode", "pincode")}
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Documents</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {DOCS.map(({ key, label }) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: editing ? "pointer" : "default" }}>
              <input
                type="checkbox"
                disabled={!editing}
                checked={editing ? !!(form[key]) : !!(s[key])}
                onChange={e => editing && setForm(f => ({ ...f, [key]: e.target.checked }))}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: "0.9rem", color: (editing ? form[key] : s[key]) ? "var(--status-success-fg)" : "var(--text-secondary)" }}>{label}</span>
              {(editing ? form[key] : s[key])
                ? <span style={{ fontSize: "0.75rem", background: "var(--status-success-bg)", color: "var(--status-success-fg)", padding: "1px 6px", borderRadius: 10 }}>✓</span>
                : <span style={{ fontSize: "0.75rem", background: "var(--status-danger-bg)", color: "var(--status-danger-fg)", padding: "1px 6px", borderRadius: 10 }}>Missing</span>}
            </label>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Record</h3>
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          Added: {new Date(s.created_at).toLocaleString("en-IN")} &nbsp;·&nbsp;
          Updated: {new Date(s.updated_at).toLocaleString("en-IN")}
        </p>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  topbar: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  backBtn: { background: "none", border: "none", color: "var(--link-color)", cursor: "pointer", fontSize: "0.9rem", padding: 0 },
  primaryBtn: { background: "var(--link-color)", color: "white", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: "0.875rem" },
  secondaryBtn: { background: "var(--border)", color: "var(--text-primary)", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: "0.875rem" },
  section: { background: "var(--bg-card)", borderRadius: 8, padding: "1rem 1.25rem", marginBottom: 16 },
  sectionTitle: { margin: "0 0 12px", fontSize: "0.85rem", fontWeight: 700, color: "var(--badge-blue-fg)", textTransform: "uppercase", letterSpacing: "0.05em" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" },
  field: { display: "flex", flexDirection: "column", gap: 3 },
  fieldLabel: { fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", textAlign: "left" as const },
  fieldVal: { fontSize: "0.9rem", color: "var(--text-primary)" },
  input: { padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: "0.875rem" },
  error: { color: "var(--status-danger-fg)", background: "var(--status-danger-bg)", border: "1px solid var(--badge-red-fg)", borderRadius: 5, padding: "8px 12px", marginBottom: 12, fontSize: "0.85rem" },
};
