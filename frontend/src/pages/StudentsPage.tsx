import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listStudents, createStudent, deleteStudent, type Student, type StudentCreate } from "../api/students";
import { listKutirs } from "../api/kutirs";
import { listDistricts, listAreas, listClusters, listCategories, listSubCategories, type Category, type SubCategory } from "../api/geo";
import { useAuth } from "../context/AuthContext";
import { grs } from "../styles/grs";
import { GrsTable, type Col } from "../components/GrsTable";

const EMPTY_FORM: StudentCreate = {
  first_name: "", last_name: "", gender: "Boy",
  kutir_id: null, dob: null, phone: null, email: null,
  father_name: null, mother_name: null,
  category_id: null, sub_category_id: null,
  alt_contact_name: null, alt_contact_phone: null,
  aadhaar: false, category_cert: false, birth_cert: false,
  residence_proof: false, medical: false,
};

type EnrichedStudent = Student & { docsCount: number; addedDate: string };

function docCount(s: Student) {
  return [s.aadhaar, s.category_cert, s.birth_cert, s.residence_proof, s.medical].filter(Boolean).length;
}

export default function StudentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.title === "Admin";

  const [filterDistrict, setFilterDistrict] = useState<number | "">("");
  const [filterCluster, setFilterCluster] = useState<number | "">("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<StudentCreate>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<number | null>(null);
  const [formDistrict, setFormDistrict] = useState<number | null>(null);
  const [formCluster, setFormCluster] = useState<number | null>(null);

  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["categories"], queryFn: listCategories });
  const { data: subCategories = [] } = useQuery<SubCategory[]>({
    queryKey: ["sub-categories", formCategoryId],
    queryFn: () => listSubCategories(formCategoryId ?? undefined),
    enabled: formCategoryId !== null,
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => listStudents({ limit: 2000 }),
  });

  const { data: allKutirs = [] } = useQuery({ queryKey: ["all-kutirs"], queryFn: () => listKutirs() });
  const { data: allDistricts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { data: allAreas = [] } = useQuery({ queryKey: ["all-areas"], queryFn: () => listAreas() });
  const { data: allClusters = [] } = useQuery({ queryKey: ["all-clusters"], queryFn: () => listClusters() });

  const kutirMap = new Map(allKutirs.map(k => [k.id, k]));
  const areaMap = new Map(allAreas.map(a => [a.id, a]));
  const clusterMap = new Map(allClusters.map(c => [c.id, c]));
  const filterClusters = allClusters.filter(c =>
    filterDistrict === "" || areaMap.get(c.area_id)?.district_id === filterDistrict
  );

  const geoFiltered = students.filter(s => {
    if (filterCluster !== "") {
      const k = s.kutir_id != null ? kutirMap.get(s.kutir_id) : null;
      if (!k || k.cluster_id !== filterCluster) return false;
    } else if (filterDistrict !== "") {
      const k = s.kutir_id != null ? kutirMap.get(s.kutir_id) : null;
      if (!k) return false;
      const cl = clusterMap.get(k.cluster_id);
      if (!cl) return false;
      const ar = areaMap.get(cl.area_id);
      if (!ar || ar.district_id !== filterDistrict) return false;
    }
    return true;
  });

  const enriched: EnrichedStudent[] = geoFiltered.map(s => ({
    ...s,
    docsCount: docCount(s),
    addedDate: new Date(s.created_at).toLocaleDateString("en-IN"),
  }));

  const createMut = useMutation({
    mutationFn: createStudent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); setShowForm(false); setForm(EMPTY_FORM); setFormError(""); },
    onError: (e: any) => setFormError(e?.response?.data?.detail ?? "Failed to create student"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) { setFormError("First and last name are required"); return; }
    createMut.mutate(form);
  }

  const columns: Col<EnrichedStudent>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (s) => (
        <Link to={`/students/${s.id}`} style={{ color: "var(--text-primary)", textDecoration: "none" }}>
          {s.first_name} {s.last_name}
        </Link>
      ),
      csvValue: (s) => `${s.first_name} ${s.last_name}`,
    },
    { key: "gender", label: "Gender", sortable: true },
    {
      key: "phone",
      label: "Phone",
      sortable: true,
      render: (s) => s.phone ?? "—",
      csvValue: (s) => s.phone ?? "",
    },
    {
      key: "father_name",
      label: "Father",
      sortable: true,
      render: (s) => s.father_name ?? "—",
      csvValue: (s) => s.father_name ?? "",
    },
    {
      key: "mother_name",
      label: "Mother",
      sortable: true,
      render: (s) => s.mother_name ?? "—",
      csvValue: (s) => s.mother_name ?? "",
    },
    {
      key: "docsCount",
      label: "Docs",
      sortable: true,
      render: (s) => (
        <span style={{
          ...grs.badge,
          background: s.docsCount === 5 ? "var(--status-success-bg)" : "var(--badge-yellow-bg)",
          color: "var(--text-primary)",
        }}>
          {s.docsCount}/5
        </span>
      ),
      csvValue: (s) => `${s.docsCount}/5`,
    },
    {
      key: "addedDate",
      label: "Added",
      sortable: true,
      csvValue: (s) => s.addedDate,
    },

  ];

  const geoFilters = (
    <>
      <select
        style={grs.filterSelect}
        value={filterDistrict}
        onChange={e => { setFilterDistrict(e.target.value === "" ? "" : Number(e.target.value)); setFilterCluster(""); }}
      >
        <option value="">All Districts</option>
        {allDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <select
        style={grs.filterSelect}
        value={filterCluster}
        onChange={e => setFilterCluster(e.target.value === "" ? "" : Number(e.target.value))}
        disabled={filterDistrict === ""}
      >
        <option value="">All Clusters</option>
        {filterClusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </>
  );

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      <GrsTable
        title="Students"
        columns={columns}
        data={enriched}
        rowKey={s => s.id}
        isLoading={isLoading}
        emptyMessage="No students found."
        actions={s => ({ onView: () => window.location.href = `/students/${s.id}`, onDelete: isAdmin ? () => { if (confirm(`Delete ${s.first_name} ${s.last_name}?`)) deleteMut.mutate(s.id); } : undefined })}
        searchable
        searchPlaceholder="Search by name, phone…"
        searchFn={(s: EnrichedStudent, q: string) => {
          const lq = q.toLowerCase();
          return (
            `${s.first_name} ${s.last_name}`.toLowerCase().includes(lq) ||
            (s.phone ?? "").toLowerCase().includes(lq) ||
            (s.father_name ?? "").toLowerCase().includes(lq) ||
            (s.mother_name ?? "").toLowerCase().includes(lq)
          );
        }}
        filters={geoFilters}
        exportFilename="students"
        printTitle="Students"
        onAdd={() => { setShowForm(true); setFormError(""); }}
        addLabel="+ Add Student"
      />

      {showForm && (
        <div style={grs.overlay}>
          <div style={grs.modal}>
            <h3 style={grs.modalTitle}>Add Student</h3>
            {formError && <p style={grs.errorBox}>{formError}</p>}
            <form onSubmit={handleSubmit}>
              {/* Kutir selector: District → Cluster → Kutir */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={grs.fieldLabel}>District</label>
                  <select style={grs.select} value={formDistrict ?? ""} onChange={e => {
                    const id = Number(e.target.value) || null;
                    setFormDistrict(id);
                    setFormCluster(null);
                    setForm(f => ({ ...f, kutir_id: null }));
                  }}>
                    <option value="">— any —</option>
                    {allDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={grs.fieldLabel}>Cluster</label>
                  <select style={grs.select} value={formCluster ?? ""} disabled={!formDistrict} onChange={e => {
                    const id = Number(e.target.value) || null;
                    setFormCluster(id);
                    setForm(f => ({ ...f, kutir_id: null }));
                  }}>
                    <option value="">— any —</option>
                    {allClusters
                      .filter(c => !formDistrict || areaMap.get(c.area_id)?.district_id === formDistrict)
                      .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={grs.fieldLabel}>Kutir</label>
                  <select style={grs.select} value={form.kutir_id ?? ""} disabled={!formCluster} onChange={e => setForm(f => ({ ...f, kutir_id: Number(e.target.value) || null }))}>
                    <option value="">— select —</option>
                    {allKutirs
                      .filter(k => !formCluster || k.cluster_id === formCluster)
                      .map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                  </select>
                </div>
              </div>
              {/* Row 1: First Name + Last Name */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={grs.fieldLabel}>First Name *</label>
                  <input style={grs.input} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
                </div>
                <div>
                  <label style={grs.fieldLabel}>Last Name *</label>
                  <input style={grs.input} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
                </div>
              </div>
              {/* Row 2: Gender + DOB */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={grs.fieldLabel}>Gender</label>
                  <select style={grs.select} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option>Boy</option>
                    <option>Girl</option>
                  </select>
                </div>
                <div>
                  <label style={grs.fieldLabel}>Date of Birth</label>
                  <input style={grs.input} type="date" value={form.dob ?? ""} onChange={e => setForm(f => ({ ...f, dob: e.target.value || null }))} />
                </div>
              </div>
              {/* Row 3: Category + Sub-Category */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={grs.fieldLabel}>Category</label>
                  <select style={grs.select} value={formCategoryId ?? ""} onChange={e => {
                    const id = Number(e.target.value) || null;
                    setFormCategoryId(id);
                    setForm(f => ({ ...f, category_id: id, sub_category_id: null }));
                  }}>
                    <option value="">— none —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={grs.fieldLabel}>Sub-Category</label>
                  <select style={grs.select} value={form.sub_category_id ?? ""} onChange={e => setForm(f => ({ ...f, sub_category_id: Number(e.target.value) || null }))} disabled={!formCategoryId}>
                    <option value="">— none —</option>
                    {subCategories.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                  </select>
                </div>
              </div>
              {/* Row 4: Father's Name + Mother's Name */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={grs.fieldLabel}>Father's Name</label>
                  <input style={grs.input} value={form.father_name ?? ""} onChange={e => setForm(f => ({ ...f, father_name: e.target.value || null }))} />
                </div>
                <div>
                  <label style={grs.fieldLabel}>Mother's Name</label>
                  <input style={grs.input} value={form.mother_name ?? ""} onChange={e => setForm(f => ({ ...f, mother_name: e.target.value || null }))} />
                </div>
              </div>
              {/* Row 5: Phone + Email */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={grs.fieldLabel}>Phone</label>
                  <input style={grs.input} value={form.phone ?? ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value || null }))} />
                </div>
                <div>
                  <label style={grs.fieldLabel}>Email</label>
                  <input style={grs.input} type="email" value={form.email ?? ""} onChange={e => setForm(f => ({ ...f, email: e.target.value || null }))} />
                </div>
              </div>
              {/* Row 6: Alt Contact Name + Alt Contact Phone */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={grs.fieldLabel}>Alt Contact Name</label>
                  <input style={grs.input} value={form.alt_contact_name ?? ""} onChange={e => setForm(f => ({ ...f, alt_contact_name: e.target.value || null }))} />
                </div>
                <div>
                  <label style={grs.fieldLabel}>Alt Contact Phone</label>
                  <input style={grs.input} value={form.alt_contact_phone ?? ""} onChange={e => setForm(f => ({ ...f, alt_contact_phone: e.target.value || null }))} />
                </div>
              </div>
              {/* Documents */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ ...grs.fieldLabel, marginBottom: 6 }}>Documents Collected</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {([
                    ["aadhaar", "Aadhaar"],
                    ["category_cert", "Category Cert"],
                    ["birth_cert", "Birth Cert"],
                    ["residence_proof", "Residence Proof"],
                    ["medical", "Medical"],
                  ] as const).map(([key, label]) => (
                    <label key={key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer", color: "var(--text-primary)" }}>
                      <input type="checkbox" checked={!!form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button type="submit" style={grs.btnPrimary} disabled={createMut.isPending}>
                  {createMut.isPending ? "Saving…" : "Save"}
                </button>
                <button type="button" style={grs.btnSecondary} onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormCategoryId(null); setFormDistrict(null); setFormCluster(null); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
