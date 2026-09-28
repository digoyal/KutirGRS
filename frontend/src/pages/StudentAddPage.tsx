import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createStudent, type StudentCreate } from "../api/students";
import { listKutirs } from "../api/kutirs";
import { listDistricts, listAreas, listClusters, listCategories, listSubCategories, type Category, type SubCategory } from "../api/geo";
import { useAuth } from "../context/AuthContext";
import { grs } from "../styles/grs";

const EMPTY_FORM: StudentCreate = {
  first_name: "", last_name: "", gender: "Boy",
  kutir_id: null, dob: null, phone: null, email: null,
  father_name: null, mother_name: null,
  category_id: null, sub_category_id: null,
  alt_contact_name: null, alt_contact_phone: null,
  aadhaar: false, category_cert: false, birth_cert: false,
  residence_proof: false, medical: false,
};

export default function StudentAddPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.title === "Admin";

  const [form, setForm] = useState<StudentCreate>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<number | null>(null);
  const [formDistrict, setFormDistrict] = useState<number | null>(null);
  const [formCluster, setFormCluster] = useState<number | null>(null);

  const { data: allKutirs = [] } = useQuery({ queryKey: ["all-kutirs"], queryFn: () => listKutirs() });
  const { data: allDistricts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { data: allAreas = [] } = useQuery({ queryKey: ["all-areas"], queryFn: () => listAreas() });
  const { data: allClusters = [] } = useQuery({ queryKey: ["all-clusters"], queryFn: () => listClusters() });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["categories"], queryFn: listCategories });
  const { data: subCategories = [] } = useQuery<SubCategory[]>({
    queryKey: ["sub-categories", formCategoryId],
    queryFn: () => listSubCategories(formCategoryId ?? undefined),
    enabled: formCategoryId !== null,
  });

  const areaMap = new Map(allAreas.map(a => [a.id, a]));

  const scopedDistricts = isAdmin || !user
    ? allDistricts
    : allDistricts.filter(d => user.district_ids.includes(d.id));
  const scopedClusters = isAdmin || !user
    ? allClusters
    : user.cluster_ids.length > 0
      ? allClusters.filter(c => user.cluster_ids.includes(c.id))
      : allClusters;
  const scopedKutirs = isAdmin || !user
    ? allKutirs
    : user.kutir_ids.length > 0
      ? allKutirs.filter(k => user.kutir_ids.includes(k.id))
      : allKutirs;

  // Auto-populate district/cluster when scoped to single option
  useEffect(() => {
    if (scopedDistricts.length === 1) {
      const d = scopedDistricts[0].id;
      setFormDistrict(d);
      const clustersForDistrict = scopedClusters.filter(
        c => areaMap.get(c.area_id)?.district_id === d
      );
      if (clustersForDistrict.length === 1) setFormCluster(clustersForDistrict[0].id);
    }
  }, [scopedDistricts.length, scopedClusters.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select cluster when district changes and only one cluster matches
  useEffect(() => {
    if (!formDistrict) return;
    const clustersForDistrict = scopedClusters.filter(
      c => areaMap.get(c.area_id)?.district_id === formDistrict
    );
    if (clustersForDistrict.length === 1) setFormCluster(clustersForDistrict[0].id);
  }, [formDistrict]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select kutir when cluster changes and only one kutir matches
  useEffect(() => {
    if (!formCluster) return;
    const kutirForCluster = scopedKutirs.filter(k => k.cluster_id === formCluster);
    if (kutirForCluster.length === 1) setForm(f => ({ ...f, kutir_id: kutirForCluster[0].id }));
  }, [formCluster]); // eslint-disable-line react-hooks/exhaustive-deps

  const createMut = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      navigate(-1);
    },
    onError: (e: any) => setFormError(e?.response?.data?.detail ?? "Failed to create student"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormError("First and last name are required");
      return;
    }
    createMut.mutate(form);
  }

  return (
    <div style={{ padding: "24px 28px", maxWidth: 600 }}>
      {/* Plain text header — matches ProgressAddPage style */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "1.1rem", padding: 0 }}
        >←</button>
        <h2 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>Add Student</h2>
      </div>

      {formError && <p style={grs.errorBox}>{formError}</p>}

      <form onSubmit={handleSubmit}>
        {/* Kutir selector: District → Cluster → Kutir */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div>
            <label style={grs.fieldLabel}>District</label>
            <select style={grs.select} value={formDistrict ?? ""} onChange={e => {
              const id = Number(e.target.value) || null;
              setFormDistrict(id);
              setFormCluster(null);
              setForm(f => ({ ...f, kutir_id: null }));
            }}>
              {isAdmin && <option value="">— any —</option>}
              {scopedDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label style={grs.fieldLabel}>Cluster</label>
            <select style={grs.select} value={formCluster ?? ""} disabled={!formDistrict} onChange={e => {
              const id = Number(e.target.value) || null;
              setFormCluster(id);
              setForm(f => ({ ...f, kutir_id: null }));
            }}>
              <option value="">— Select —</option>
              {scopedClusters
                .filter(c => !formDistrict || areaMap.get(c.area_id)?.district_id === formDistrict)
                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={grs.fieldLabel}>Kutir</label>
            <select style={grs.select} value={form.kutir_id ?? ""} disabled={!formCluster} onChange={e => setForm(f => ({ ...f, kutir_id: Number(e.target.value) || null }))}>
              <option value="">— select —</option>
              {scopedKutirs
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
        <div style={{ marginBottom: 16 }}>
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

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button type="submit" style={grs.btnPrimary} disabled={createMut.isPending}>
            {createMut.isPending ? "Saving…" : "Add Student"}
          </button>
          <button type="button" style={grs.btnSecondary} onClick={() => navigate(-1)} disabled={createMut.isPending}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
