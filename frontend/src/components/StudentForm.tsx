/**
 * Shared student form used by StudentAddPage and StudentDetailPage.
 * Caller owns form state; this component is presentational + interactive.
 * Modes: add (empty/editable), edit (editable), view (read-only).
 */
import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ViewField, viewStyles } from "@parivaar/ui";
import { type StudentCreate } from "../api/students";
import { listKutirs } from "../api/kutirs";
import {
  listDistricts,
  listAreas,
  listClusters,
  listCategories,
  listSubCategories,
} from "../api/geo";
import { useAuth } from "../context/AuthContext";
import { hasGlobalDataScope } from "../constants/roles";
import { studentFieldLabel } from "../constants/studentsFields";
import { grs } from "../styles/grs";

const DOCS: { key: keyof StudentFormState; label: string }[] = [
  { key: "aadhaar", label: "Aadhaar Card" },
  { key: "category_cert", label: "Category Certificate" },
  { key: "birth_cert", label: "Birth Certificate" },
  { key: "residence_proof", label: "Residence Proof" },
  { key: "medical", label: "Medical Certificate" },
];

export type StudentFormState = StudentCreate;

export function emptyStudentForm(): StudentFormState {
  return {
    first_name: "",
    last_name: "",
    gender: "Boy",
    kutir_id: null,
    dob: null,
    phone: null,
    email: null,
    father_name: null,
    mother_name: null,
    street: null,
    pincode: null,
    category_id: null,
    sub_category_id: null,
    alt_contact_name: null,
    alt_contact_phone: null,
    aadhaar: false,
    category_cert: false,
    birth_cert: false,
    residence_proof: false,
    medical: false,
  };
}

export function studentFormFromDetail(s: {
  first_name: string;
  last_name: string;
  gender: string;
  kutir_id: number | null;
  dob: string | null;
  phone: string | null;
  email: string | null;
  father_name: string | null;
  mother_name: string | null;
  street: string | null;
  pincode: string | null;
  category_id: number | null;
  sub_category_id: number | null;
  alt_contact_name: string | null;
  alt_contact_phone: string | null;
  aadhaar: boolean;
  category_cert: boolean;
  birth_cert: boolean;
  residence_proof: boolean;
  medical: boolean;
}): StudentFormState {
  return {
    first_name: s.first_name,
    last_name: s.last_name,
    gender: s.gender,
    kutir_id: s.kutir_id,
    dob: s.dob,
    phone: s.phone,
    email: s.email,
    father_name: s.father_name,
    mother_name: s.mother_name,
    street: s.street,
    pincode: s.pincode,
    category_id: s.category_id,
    sub_category_id: s.sub_category_id,
    alt_contact_name: s.alt_contact_name,
    alt_contact_phone: s.alt_contact_phone,
    aadhaar: s.aadhaar,
    category_cert: s.category_cert,
    birth_cert: s.birth_cert,
    residence_proof: s.residence_proof,
    medical: s.medical,
  };
}

const sec: React.CSSProperties = viewStyles.section;
const secTitle: React.CSSProperties = viewStyles.sectionTitle;

function tag(bg: string, color: string): React.CSSProperties {
  return {
    fontSize: 11,
    background: bg,
    color,
    padding: "1px 6px",
    borderRadius: 10,
    fontWeight: 600,
  };
}

interface StudentFormProps {
  form: StudentFormState;
  setForm: React.Dispatch<React.SetStateAction<StudentFormState>>;
  mode: "add" | "edit" | "view";
  /** Geo display names for view mode. */
  locationLabels?: {
    district?: string | null;
    cluster?: string | null;
    kutir?: string | null;
  };
  /** Category display name for view mode. */
  categoryName?: string | null;
  /** Sub-category display name for view mode. */
  subCategoryName?: string | null;
}

export function StudentForm({
  form,
  setForm,
  mode,
  locationLabels,
  categoryName,
  subCategoryName,
}: StudentFormProps) {
  const readOnly = mode === "view";
  const isAdd = mode === "add";
  const { user } = useAuth();
  const unscoped = hasGlobalDataScope(user?.title);

  const [selDistrict, setSelDistrict] = useState<number | null>(null);
  const [selCluster, setSelCluster] = useState<number | null>(null);
  const [geoSeeded, setGeoSeeded] = useState(false);

  const { data: allKutirs = [] } = useQuery({
    queryKey: ["all-kutirs"],
    queryFn: () => listKutirs(),
  });
  const { data: allDistricts = [] } = useQuery({
    queryKey: ["districts", { parivaar_presence: true }],
    queryFn: () => listDistricts(undefined, { parivaar_presence: true }),
  });
  const { data: allAreas = [] } = useQuery({
    queryKey: ["all-areas"],
    queryFn: () => listAreas(),
  });
  const { data: allClusters = [] } = useQuery({
    queryKey: ["all-clusters"],
    queryFn: () => listClusters(),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
  });

  const formCategoryId = form.category_id ?? null;
  const { data: subCategories = [] } = useQuery({
    queryKey: ["sub-categories", formCategoryId],
    queryFn: () => listSubCategories(formCategoryId ?? undefined),
    enabled: formCategoryId !== null,
  });

  const areaMap = useMemo(() => new Map(allAreas.map((a) => [a.id, a])), [allAreas]);

  const scopedDistricts =
    unscoped || !user
      ? allDistricts
      : allDistricts.filter((d) => user.district_ids.includes(d.id));
  const scopedClusters =
    unscoped || !user
      ? allClusters
      : user.cluster_ids.length > 0
        ? allClusters.filter((c) => user.cluster_ids.includes(c.id))
        : allClusters;
  const scopedKutirs =
    unscoped || !user
      ? allKutirs
      : user.kutir_ids.length > 0
        ? allKutirs.filter((k) => user.kutir_ids.includes(k.id))
        : allKutirs;

  // Auto-select district when scoped to one (add). Cluster/kutir follow in
  // separate effects so they still run after areas/clusters arrive (first-load race).
  useEffect(() => {
    if (!isAdd) return;
    if (scopedDistricts.length === 1 && selDistrict == null) {
      setSelDistrict(scopedDistricts[0].id);
    }
  }, [isAdd, scopedDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAdd || selDistrict == null) return;
    const clustersForDistrict = scopedClusters.filter(
      (c) => areaMap.get(c.area_id)?.district_id === selDistrict,
    );
    if (clustersForDistrict.length === 1 && selCluster !== clustersForDistrict[0].id) {
      setSelCluster(clustersForDistrict[0].id);
    }
  }, [isAdd, selDistrict, scopedClusters.length, allAreas.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAdd || selCluster == null) return;
    const kutirForCluster = scopedKutirs.filter((k) => k.cluster_id === selCluster);
    if (kutirForCluster.length === 1 && form.kutir_id !== kutirForCluster[0].id) {
      setForm((f) => ({ ...f, kutir_id: kutirForCluster[0].id }));
    }
  }, [isAdd, selCluster, scopedKutirs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Seed geo cascade from kutir_id (edit)
  useEffect(() => {
    if (isAdd || readOnly || geoSeeded || !form.kutir_id || allKutirs.length === 0) return;
    const kutir = allKutirs.find((k) => k.id === form.kutir_id);
    if (!kutir) return;
    const cluster = allClusters.find((c) => c.id === kutir.cluster_id);
    const area = cluster ? areaMap.get(cluster.area_id) : undefined;
    setSelCluster(kutir.cluster_id ?? null);
    setSelDistrict(area?.district_id ?? null);
    setGeoSeeded(true);
  }, [isAdd, readOnly, form.kutir_id, allKutirs, allClusters, areaMap, geoSeeded]);

  const districtSource = isAdd ? scopedDistricts : allDistricts;
  const clusterSource = isAdd ? scopedClusters : allClusters;
  const kutirSource = isAdd ? scopedKutirs : allKutirs;

  const filteredClusters = selDistrict
    ? clusterSource.filter((c) => areaMap.get(c.area_id)?.district_id === selDistrict)
    : clusterSource;
  const filteredKutirs = selCluster
    ? kutirSource.filter((k) => k.cluster_id === selCluster)
    : kutirSource;

  /**
   * Pass `label` for form-only fields (not in STUDENTS_FIELDS).
   * Otherwise label comes from studentFieldLabel(key).
   */
  function textField(
    key: keyof StudentFormState,
    opts?: { type?: string; required?: boolean; label?: string },
  ) {
    const raw = form[key];
    const display =
      typeof raw === "boolean" ? String(raw) : ((raw as string | null | undefined) ?? null);
    const fieldLabel =
      opts?.label != null
        ? `${opts.label}${opts.required ? " *" : ""}`
        : studentFieldLabel(String(key), { required: opts?.required });
    if (readOnly) {
      return <ViewField label={fieldLabel}>{display || null}</ViewField>;
    }
    return (
      <div>
        <label style={grs.fieldLabel}>{fieldLabel}</label>
        <input
          style={grs.input}
          type={opts?.type ?? "text"}
          value={(form[key] as string | null | undefined) ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, [key]: e.target.value || (opts?.required ? "" : null) }))
          }
        />
      </div>
    );
  }

  return (
    <div>
      <section style={sec}>
        <div style={secTitle}>Location</div>
        {readOnly ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <ViewField label="District">{locationLabels?.district}</ViewField>
            <ViewField label="Cluster">{locationLabels?.cluster}</ViewField>
            <ViewField label={studentFieldLabel("kutir_id")}>{locationLabels?.kutir}</ViewField>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div>
              <label style={grs.fieldLabel}>District</label>
              <select
                style={grs.select}
                value={selDistrict ?? ""}
                onChange={(e) => {
                  const id = Number(e.target.value) || null;
                  setSelDistrict(id);
                  setSelCluster(null);
                  setForm((f) => ({ ...f, kutir_id: null }));
                }}
              >
                {/* Always include "" so a null selDistrict isn’t shown as the first
                    district while Cluster stays disabled (first-load quirk). */}
                <option value="">{isAdd ? "— Select —" : "— any —"}</option>
                {districtSource.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={grs.fieldLabel}>Cluster</label>
              <select
                style={grs.select}
                value={selCluster ?? ""}
                disabled={isAdd && !selDistrict}
                onChange={(e) => {
                  const id = Number(e.target.value) || null;
                  setSelCluster(id);
                  setForm((f) => ({ ...f, kutir_id: null }));
                }}
              >
                <option value="">{isAdd ? "— Select —" : "— any —"}</option>
                {filteredClusters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={grs.fieldLabel}>{studentFieldLabel("kutir_id")}</label>
              <select
                style={grs.select}
                value={form.kutir_id ?? ""}
                disabled={isAdd && !selCluster}
                onChange={(e) =>
                  setForm((f) => ({ ...f, kutir_id: Number(e.target.value) || null }))
                }
              >
                <option value="">— select —</option>
                {filteredKutirs.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      <section style={sec}>
        <div style={secTitle}>Personal Info</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          {textField("first_name", { required: true, label: "First Name" })}
          {textField("last_name", { required: true, label: "Last Name" })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          {readOnly ? (
            <ViewField label={studentFieldLabel("gender")}>{form.gender || null}</ViewField>
          ) : (
            <div>
              <label style={grs.fieldLabel}>{studentFieldLabel("gender")}</label>
              <select
                style={grs.select}
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              >
                <option>Boy</option>
                <option>Girl</option>
              </select>
            </div>
          )}
          {textField("dob", { type: "date" })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          {readOnly ? (
            <ViewField label="Category">{categoryName}</ViewField>
          ) : (
            <div>
              <label style={grs.fieldLabel}>Category</label>
              <select
                style={grs.select}
                value={form.category_id ?? ""}
                onChange={(e) => {
                  const id = Number(e.target.value) || null;
                  setForm((f) => ({ ...f, category_id: id, sub_category_id: null }));
                }}
              >
                <option value="">— none —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {readOnly ? (
            <ViewField label="Sub-Category">{subCategoryName}</ViewField>
          ) : (
            <div>
              <label style={grs.fieldLabel}>Sub-Category</label>
              <select
                style={grs.select}
                value={form.sub_category_id ?? ""}
                disabled={!formCategoryId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sub_category_id: Number(e.target.value) || null,
                  }))
                }
              >
                <option value="">— none —</option>
                {subCategories.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {textField("phone")}
          {textField("email", { type: "email" })}
        </div>
      </section>

      <section style={sec}>
        <div style={secTitle}>Family</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          {textField("father_name")}
          {textField("mother_name")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {textField("alt_contact_name")}
          {textField("alt_contact_phone")}
        </div>
      </section>

      <section style={sec}>
        <div style={secTitle}>Address</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {textField("street", { label: "Street" })}
          {textField("pincode", { label: "Pincode" })}
        </div>
      </section>

      <section style={sec}>
        <div style={secTitle}>Documents Collected</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
          {DOCS.map(({ key, label }) => {
            const checked = !!(form[key] as boolean | undefined);
            return (
              <label
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: readOnly ? "default" : "pointer",
                  fontSize: 14,
                }}
              >
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={checked}
                  onChange={(e) =>
                    !readOnly && setForm((f) => ({ ...f, [key]: e.target.checked }))
                  }
                  style={{ width: 15, height: 15 }}
                />
                <span
                  style={{
                    color: checked
                      ? "var(--status-success-fg, #16a34a)"
                      : "var(--text-secondary)",
                  }}
                >
                  {label}
                </span>
                {checked ? (
                  <span style={tag("#dcfce7", "#16a34a")}>✓</span>
                ) : (
                  <span style={tag("#fef2f2", "#dc2626")}>Missing</span>
                )}
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}
