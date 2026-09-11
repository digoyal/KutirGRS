import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listSchools, createSchool, updateSchool, type School, type SchoolCreate } from "../api/schools";
import { listDistricts, listZones } from "../api/geo";

const SCHOOL_TYPES = ["EMRS", "JNV", "KSP", "MRS", "GNV", "KGBV", "SportsBoys", "SportsGirls", "Other"];
const STATES = ["Madhya Pradesh", "Jharkhand", "Chhattisgarh"];

const BLANK: SchoolCreate = {
  name: "",
  school_type: "EMRS",
  state: "Madhya Pradesh",
  city: null,
  street: null,
  district_id: null,
  pincode: null,
};

interface SchoolWithDistrict extends School {
  district?: { id: number; name: string } | null;
  is_active?: boolean;
}

function SchoolModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: (SchoolCreate & { id?: number }) | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<SchoolCreate>(initial ?? BLANK);
  const [selZone, setSelZone] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: zones = [] } = useQuery({ queryKey: ["zones"], queryFn: listZones });
  const { data: districts = [] } = useQuery({
    queryKey: ["districts", selZone],
    queryFn: () => listDistricts(selZone ?? undefined),
    enabled: !!selZone,
  });

  function set<K extends keyof SchoolCreate>(key: K, val: SchoolCreate[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await updateSchool(initial!.id!, form);
      } else {
        await createSchool(form);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#fff", borderRadius: 10, padding: "24px", width: 440, maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <h3 style={{ margin: "0 0 16px", color: "#1a365d" }}>
          {isEdit ? "Edit School" : "Add School"}
        </h3>

        {error && (
          <div style={{ background: "#fff5f5", border: "1px solid #fc8181", color: "#c53030", borderRadius: 6, padding: "8px 12px", fontSize: "0.85rem", marginBottom: 12 }}>
            {error}
          </div>
        )}

        <Row label="Name *">
          <input style={inp} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Row>
        <Row label="School Type">
          <select style={inp} value={form.school_type} onChange={(e) => set("school_type", e.target.value)}>
            {SCHOOL_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Row>
        <Row label="State">
          <select style={inp} value={form.state ?? "Madhya Pradesh"} onChange={(e) => set("state", e.target.value)}>
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Row>
        <Row label="Zone (for district filter)">
          <select style={inp} value={selZone ?? ""} onChange={(e) => { setSelZone(Number(e.target.value) || null); set("district_id", null); }}>
            <option value="">— any —</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </Row>
        <Row label="District">
          <select style={inp} value={form.district_id ?? ""} onChange={(e) => set("district_id", Number(e.target.value) || null)}>
            <option value="">— none —</option>
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Row>
        <Row label="City / Block">
          <input style={inp} value={form.city ?? ""} onChange={(e) => set("city", e.target.value || null)} />
        </Row>
        <Row label="Street / Address">
          <input style={inp} value={form.street ?? ""} onChange={(e) => set("street", e.target.value || null)} />
        </Row>
        <Row label="Pincode">
          <input style={inp} value={form.pincode ?? ""} onChange={(e) => set("pincode", e.target.value || null)} maxLength={10} />
        </Row>

        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnSecondary} disabled={saving}>Cancel</button>
          <button onClick={handleSave} style={btnPrimary} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add School"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SchoolsPage() {
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<(SchoolCreate & { id?: number }) | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data: schools = [], isLoading } = useQuery<SchoolWithDistrict[]>({
    queryKey: ["schools"],
    queryFn: () => listSchools() as Promise<SchoolWithDistrict[]>,
  });

  function refresh() { qc.invalidateQueries({ queryKey: ["schools"] }); }

  const filtered = schools.filter((s) => {
    if (filterType && s.school_type !== filterType) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const typeCounts = SCHOOL_TYPES.reduce((acc, t) => {
    acc[t] = schools.filter((s) => s.school_type === t).length;
    return acc;
  }, {} as Record<string, number>);

  function openAdd() {
    setModal(BLANK);
    setShowModal(true);
  }

  function openEdit(s: SchoolWithDistrict) {
    setModal({
      id: s.id,
      name: s.name,
      school_type: s.school_type,
      state: s.state,
      city: s.city,
      street: s.street,
      district_id: s.district_id,
      pincode: s.pincode,
    });
    setShowModal(true);
  }

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: "#1a365d" }}>Schools</h2>
        <button onClick={openAdd} style={btnPrimary}>+ Add School</button>
      </div>

      {/* Type chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        <button
          onClick={() => setFilterType("")}
          style={{
            ...chip,
            background: filterType === "" ? "#2c5282" : "#ebf4ff",
            color: filterType === "" ? "#fff" : "#2c5282",
          }}
        >
          All ({schools.length})
        </button>
        {SCHOOL_TYPES.filter((t) => typeCounts[t] > 0).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(filterType === t ? "" : t)}
            style={{
              ...chip,
              background: filterType === t ? "#2c5282" : "#ebf4ff",
              color: filterType === t ? "#fff" : "#2c5282",
            }}
          >
            {t} ({typeCounts[t]})
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        placeholder="Search schools…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ ...inp, maxWidth: 280, marginBottom: 14 }}
      />

      {/* Table */}
      {isLoading ? (
        <p style={{ color: "#718096" }}>Loading…</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr style={{ background: "#ebf4ff" }}>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>City / Block</th>
                <th style={styles.th}>District</th>
                <th style={styles.th}>State</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "#f7fafc" }}>
                  <td style={styles.td}>
                    <span style={{ fontWeight: 600, color: "#2d3748" }}>{s.name}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ background: typeColor(s.school_type).bg, color: typeColor(s.school_type).fg, borderRadius: 4, padding: "2px 8px", fontSize: "0.78rem", fontWeight: 600 }}>
                      {s.school_type}
                    </span>
                  </td>
                  <td style={styles.td}>{s.city ?? "—"}</td>
                  <td style={styles.td}>
                    {s.district
                      ? s.district.name
                      : s.district_id
                      ? `#${s.district_id}`
                      : "—"}
                  </td>
                  <td style={styles.td}>{s.state}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    <button
                      onClick={() => openEdit(s)}
                      style={{ background: "transparent", border: "1px solid #bee3f8", color: "#2c5282", borderRadius: 5, padding: "4px 12px", cursor: "pointer", fontSize: "0.8rem" }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p style={{ color: "#718096", textAlign: "center", padding: "32px 0" }}>
              No schools found.
            </p>
          )}
        </div>
      )}

      {showModal && modal && (
        <SchoolModal
          initial={modal}
          onClose={() => setShowModal(false)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function typeColor(type: string): { bg: string; fg: string } {
  const map: Record<string, { bg: string; fg: string }> = {
    EMRS: { bg: "#ebf4ff", fg: "#2c5282" },
    JNV: { bg: "#f0fff4", fg: "#276749" },
    KSP: { bg: "#faf5ff", fg: "#553c9a" },
    MRS: { bg: "#fffaf0", fg: "#744210" },
    GNV: { bg: "#fff5f5", fg: "#c53030" },
    KGBV: { bg: "#fef3c7", fg: "#92400e" },
    SportsBoys: { bg: "#e6fffa", fg: "#234e52" },
    SportsGirls: { bg: "#fff0f6", fg: "#702459" },
  };
  return map[type] ?? { bg: "#f7fafc", fg: "#4a5568" };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#4a5568", marginBottom: 3 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", border: "1px solid #cbd5e0", borderRadius: 6,
  padding: "7px 10px", fontSize: "0.875rem", boxSizing: "border-box",
};
const btnPrimary: React.CSSProperties = {
  background: "#2c5282", color: "#fff", border: "none", borderRadius: 6,
  padding: "8px 18px", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600,
};
const btnSecondary: React.CSSProperties = {
  background: "#fff", color: "#4a5568", border: "1px solid #cbd5e0",
  borderRadius: 6, padding: "8px 18px", cursor: "pointer", fontSize: "0.875rem",
};
const chip: React.CSSProperties = {
  border: "none", borderRadius: 14, padding: "4px 12px",
  fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
};
const styles: Record<string, React.CSSProperties> = {
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
  th: { padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#2c5282", borderBottom: "2px solid #bee3f8" },
  td: { padding: "10px 12px", borderBottom: "1px solid #e2e8f0" },
};
