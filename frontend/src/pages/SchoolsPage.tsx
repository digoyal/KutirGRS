import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { listSchools, createSchool, updateSchool, deleteSchool, type School, type SchoolCreate } from "../api/schools";
import { listDistricts } from "../api/geo";
import { GrsTable, type Col } from "../components/GrsTable";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { SCHOOLS_FIELDS } from "../constants/schoolsFields";
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
  initial, onClose, onSaved, readOnly,
}: {
  initial: (SchoolCreate & { id?: number }) | null;
  onClose: () => void;
  onSaved: () => void;
  readOnly?: boolean;
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
        <h3 style={grs.modalTitle}>{readOnly ? "View School" : isEdit ? "Edit School" : "Add School"}</h3>
        {error && <div style={grs.errorBox}>{error}</div>}

        {/* Row 1: Type + Name */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={grs.fieldLabel}>School Type</label>
            <select style={grs.select} value={form.school_type} onChange={readOnly ? undefined : e => set("school_type", e.target.value)} disabled={readOnly}>
              {SCHOOL_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={grs.fieldLabel}>Name *</label>
            <input style={grs.input} value={form.name} onChange={readOnly ? undefined : e => set("name", e.target.value)} disabled={readOnly} />
          </div>
        </div>

        {/* Row 2: Street / Address */}
        <div style={{ marginBottom: 10 }}>
          <label style={grs.fieldLabel}>Street / Address</label>
          <input style={grs.input} value={form.street ?? ""} onChange={readOnly ? undefined : e => set("street", e.target.value || null)} disabled={readOnly} />
        </div>

        {/* Row 3: City + District */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={grs.fieldLabel}>City / Block</label>
            <input style={grs.input} value={form.city ?? ""} onChange={readOnly ? undefined : e => set("city", e.target.value || null)} disabled={readOnly} />
          </div>
          <div>
            <label style={grs.fieldLabel}>District</label>
            <select style={grs.select} value={form.district_id ?? ""} onChange={readOnly ? undefined : e => set("district_id", Number(e.target.value) || null)} disabled={readOnly}>
              <option value="">— none —</option>
              {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>

        {/* Row 4: State + Pincode */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={grs.fieldLabel}>State</label>
            <select style={grs.select} value={form.state ?? "Madhya Pradesh"} onChange={readOnly ? undefined : e => set("state", e.target.value)} disabled={readOnly}>
              {STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={grs.fieldLabel}>Pincode</label>
            <input style={grs.input} value={form.pincode ?? ""} onChange={readOnly ? undefined : e => set("pincode", e.target.value || null)} disabled={readOnly} maxLength={10} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={grs.btnSecondary} disabled={saving}>{readOnly ? "Close" : "Cancel"}</button>
          {!readOnly && <button onClick={handleSave} style={grs.btnPrimary} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add School"}
          </button>}
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
  const [viewSchool, setViewSchool] = useState<SchoolWithDistrict | null>(null);

  const { data: schools = [], isLoading } = useQuery<SchoolWithDistrict[]>({
    queryKey: ["schools"],
    queryFn: () => listSchools() as Promise<SchoolWithDistrict[]>,
  });

  const { user } = useAuth();
  const isAdmin = user?.title === "Admin";

  useEffect(() => {
    if (window.location.search.includes("_=")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

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

  const allColumns: Col<SchoolWithDistrict>[] = [
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
    { key: "street", label: "Street", sortable: false, render: s => s.street ?? "—", csvValue: s => s.street ?? "" },
    { key: "pincode", label: "Pincode", sortable: true, render: s => s.pincode ?? "—", csvValue: s => s.pincode ?? "" },
  ];

  const { isVisible, orderedMetas } = useFieldConfig("schools", SCHOOLS_FIELDS);
  const columns = useMemo(() => {
    const colByKey = new Map(allColumns.map(c => [c.key, c]));
    return orderedMetas
      .filter(m => isVisible(m.key))
      .map(m => colByKey.get(m.key))
      .filter((c): c is NonNullable<typeof c> => c != null);
  }, [allColumns, orderedMetas, isVisible]);

  return (
    <div style={{ padding: "24px 28px" }}>
      <GrsTable
        title="Schools"
        columns={columns}
        data={displayed}
        rowKey={s => s.id}
        isLoading={isLoading}
        emptyMessage="No schools found."
        actions={s => ({ onView: () => setViewSchool(s), onEdit: () => openEdit(s), onDelete: () => { if (confirm(`Delete "${s.name}"?`)) deleteMut.mutate(s.id); } })}
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
        headerExtra={isAdmin ? (
          <a href="/admin/field-config?table=schools" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8125rem", color: "var(--text-secondary)", textDecoration: "none", padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <span>Columns</span>
          </a>
        ) : undefined}
        exportFilename="schools"
        printTitle="Schools"
        onAdd={openAdd}
        addLabel="Add School"
      />

      {showModal && modal && (
        <SchoolModal initial={modal} onClose={() => setShowModal(false)} onSaved={refresh} />
      )}
      {viewSchool && (
        <SchoolModal
          initial={{ id: viewSchool.id, name: viewSchool.name, school_type: viewSchool.school_type, state: viewSchool.state, city: viewSchool.city ?? null, street: viewSchool.street ?? null, district_id: viewSchool.district_id ?? null, pincode: viewSchool.pincode ?? null }}
          onClose={() => setViewSchool(null)} onSaved={refresh} readOnly />
      )}
    </div>
  );
}
