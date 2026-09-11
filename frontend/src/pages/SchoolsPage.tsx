import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { listSchools, createSchool, updateSchool, deleteSchool, type School, type SchoolCreate } from "../api/schools";
import { listDistricts } from "../api/geo";
import { GrsTable, type Col } from "../components/GrsTable";
import { grs } from "../styles/grs";

const SCHOOL_TYPES = ["EMRS", "JNV", "KSP", "MRS", "GNV", "KGBV", "SportsBoys", "SportsGirls", "Other"];
const STATES = ["Madhya Pradesh", "Jharkhand", "Chhattisgarh"];

const BLANK: SchoolCreate = {
  name: "", school_type: "EMRS", state: "Madhya Pradesh",
  city: null, street: null, district_id: null, pincode: null,
};

interface SchoolWithDistrict extends School {
  district?: { id: number; name: string } | null;
  is_active?: boolean;
}

// Map school type → CSS variable pair names (no hardcoded hex)
const TYPE_BADGE: Record<string, { bg: string; fg: string }> = {
  EMRS:       { bg: "var(--badge-blue-bg)",   fg: "var(--badge-blue-fg)"   },
  JNV:        { bg: "var(--badge-green-bg)",  fg: "var(--badge-green-fg)"  },
  KSP:        { bg: "var(--badge-purple-bg)", fg: "var(--badge-purple-fg)" },
  MRS:        { bg: "var(--badge-amber-bg)",  fg: "var(--badge-amber-fg)"  },
  GNV:        { bg: "var(--badge-red-bg)",    fg: "var(--badge-red-fg)"    },
  KGBV:       { bg: "var(--badge-yellow-bg)", fg: "var(--badge-yellow-fg)" },
  SportsBoys: { bg: "var(--badge-teal-bg)",   fg: "var(--badge-teal-fg)"   },
  SportsGirls:{ bg: "var(--badge-pink-bg)",   fg: "var(--badge-pink-fg)"   },
};
function typeBadge(type: string) {
  return TYPE_BADGE[type] ?? { bg: "var(--badge-grey-bg)", fg: "var(--badge-grey-fg)" };
}

function SchoolModal({
  initial, onClose, onSaved,
}: {
  initial: (SchoolCreate & { id?: number }) | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<SchoolCreate>(initial ?? BLANK);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: districts = [] } = useQuery({
    queryKey: ["districts", null],
    queryFn: () => listDistricts(),
  });

  function set<K extends keyof SchoolCreate>(key: K, val: SchoolCreate[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError(null);
    try {
      if (isEdit) { await updateSchool(initial!.id!, form); }
      else { await createSchool(form); }
      onSaved(); onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Save failed.");
    } finally { setSaving(false); }
  }

  return (
    <div style={grs.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={grs.modal}>
        <h3 style={grs.modalTitle}>{isEdit ? "Edit School" : "Add School"}</h3>
        {error && <div style={grs.errorBox}>{error}</div>}

        {/* Row 1: Type + Name */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={grs.fieldLabel}>School Type</label>
            <select style={grs.select} value={form.school_type} onChange={e => set("school_type", e.target.value)}>
              {SCHOOL_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={grs.fieldLabel}>Name *</label>
            <input style={grs.input} value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
        </div>

        {/* Row 2: Street / Address */}
        <div style={{ marginBottom: 10 }}>
          <label style={grs.fieldLabel}>Street / Address</label>
          <input style={grs.input} value={form.street ?? ""} onChange={e => set("street", e.target.value || null)} />
        </div>

        {/* Row 3: City + District */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={grs.fieldLabel}>City / Block</label>
            <input style={grs.input} value={form.city ?? ""} onChange={e => set("city", e.target.value || null)} />
          </div>
          <div>
            <label style={grs.fieldLabel}>District</label>
            <select style={grs.select} value={form.district_id ?? ""} onChange={e => set("district_id", Number(e.target.value) || null)}>
              <option value="">— none —</option>
              {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>

        {/* Row 4: State + Pincode */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={grs.fieldLabel}>State</label>
            <select style={grs.select} value={form.state ?? "Madhya Pradesh"} onChange={e => set("state", e.target.value)}>
              {STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={grs.fieldLabel}>Pincode</label>
            <input style={grs.input} value={form.pincode ?? ""} onChange={e => set("pincode", e.target.value || null)} maxLength={10} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={grs.btnSecondary} disabled={saving}>Cancel</button>
          <button onClick={handleSave} style={grs.btnPrimary} disabled={saving}>
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
  const [modal, setModal] = useState<(SchoolCreate & { id?: number }) | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data: schools = [], isLoading } = useQuery<SchoolWithDistrict[]>({
    queryKey: ["schools"],
    queryFn: () => listSchools() as Promise<SchoolWithDistrict[]>,
  });

  const { user } = useAuth();
  const isAdmin = user?.title === "Admin";

  function refresh() { qc.invalidateQueries({ queryKey: ["schools"] }); }

  const deleteMut = useMutation({
    mutationFn: deleteSchool,
    onSuccess: refresh,
  });

  function openAdd() { setModal(BLANK); setShowModal(true); }
  function openEdit(s: SchoolWithDistrict) {
    setModal({ id: s.id, name: s.name, school_type: s.school_type, state: s.state, city: s.city, street: s.street, district_id: s.district_id, pincode: s.pincode });
    setShowModal(true);
  }

  const typeCounts = SCHOOL_TYPES.reduce((acc, t) => {
    acc[t] = schools.filter(s => s.school_type === t).length;
    return acc;
  }, {} as Record<string, number>);

  // Pre-filter by type; GrsTable handles search
  const displayed = filterType ? schools.filter(s => s.school_type === filterType) : schools;

  const columns: Col<SchoolWithDistrict>[] = [
    {
      key: "name", label: "Name", sortable: true,
      render: s => <strong style={{ color: "var(--text-primary)" }}>{s.name}</strong>,
    },
    {
      key: "school_type", label: "Type", sortable: true,
      render: s => {
        const { bg, fg } = typeBadge(s.school_type);
        return (
          <span style={{ ...grs.badge, background: bg, color: fg }}>{s.school_type}</span>
        );
      },
    },
    { key: "city", label: "City / Block", render: s => s.city ?? "—" },
    {
      key: "district", label: "District",
      render: s => s.district ? s.district.name : s.district_id ? `#${s.district_id}` : "—",
    },
    { key: "state", label: "State", sortable: true, render: s => s.state },

  ];

  return (
    <div style={{ padding: "24px 28px" }}>
      <GrsTable
        title="Schools"
        columns={columns}
        data={displayed}
        rowKey={s => s.id}
        isLoading={isLoading}
        emptyMessage="No schools found."
        actions={s => ({ onView: () => window.open(`/schools/${s.id}`, '_self'), onEdit: () => openEdit(s), onDelete: isAdmin ? () => { if (confirm(`Delete "${s.name}"?`)) deleteMut.mutate(s.id); } : undefined })}
        searchable
        filters={
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={grs.filterSelect}>
            <option value="">All Types</option>
            {SCHOOL_TYPES.filter(t => typeCounts[t] > 0).map(t => (
              <option key={t} value={t}>{t} ({typeCounts[t]})</option>
            ))}
          </select>
        }
        searchFn={(s, q) => {
          const lower = q.toLowerCase();
          return s.name.toLowerCase().includes(lower)
            || (s.city ?? "").toLowerCase().includes(lower)
            || (s.district?.name ?? "").toLowerCase().includes(lower);
        }}
        exportFilename="schools"
        printTitle="Schools"
        onAdd={openAdd}
        addLabel="Add School"
      />

      {showModal && modal && (
        <SchoolModal initial={modal} onClose={() => setShowModal(false)} onSaved={refresh} />
      )}
    </div>
  );
}
