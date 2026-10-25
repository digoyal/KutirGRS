/**
 * Shared kutir form used by KutirAddPage and KutirDetailPage.
 * Caller owns form state; this component is presentational + interactive.
 * Modes: add (empty/editable), edit (editable), view (read-only).
 */
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ViewField, ViewSection, viewStyles } from "@parivaar/ui";
import { type KutirCreate, type KutirDetail } from "../api/kutirs";
import { listZones, listDistricts, listAreas, listClusters } from "../api/geo";
import { useAuth } from "../context/AuthContext";
import { grs } from "../styles/grs";

const KUTIR_TYPES = ["Seva Kutir", "Shiksha Kutir", "Non-Kutir"];
const STATES = ["Madhya Pradesh", "Jharkhand", "Chhattisgarh"];

export type KutirFormState = KutirCreate;

export function emptyKutirForm(): KutirFormState {
  return { name: "", kutir_type: "Seva Kutir", cluster_id: 0, state: "Madhya Pradesh" };
}

export function kutirFormFromDetail(kutir: KutirDetail): KutirFormState {
  return {
    name: kutir.name,
    kutir_type: kutir.kutir_type,
    cluster_id: kutir.cluster_id,
    district_id: kutir.district_id,
    street: kutir.street,
    state: kutir.state,
    pincode: kutir.pincode,
    enrollment_5th: kutir.enrollment_5th,
    enrollment_8th: kutir.enrollment_8th,
  };
}

const sec: React.CSSProperties = viewStyles.section;
const secTitle: React.CSSProperties = viewStyles.sectionTitle;

interface KutirFormProps {
  form: KutirFormState;
  setForm: React.Dispatch<React.SetStateAction<KutirFormState>>;
  mode: "add" | "edit" | "view";
  /** Nested geo names for view mode (from KutirDetail). */
  locationLabels?: {
    zone?: string | null;
    district?: string | null;
    area?: string | null;
    cluster?: string | null;
  };
  /** Optional teacher block shown only in view mode. */
  teacher?: KutirDetail["teacher"];
}

export function KutirForm({
  form,
  setForm,
  mode,
  locationLabels,
  teacher,
}: KutirFormProps) {
  const readOnly = mode === "view";
  const isAdd = mode === "add";
  const { user } = useAuth();
  const isAdmin = user?.title === "Admin";

  const [selZone, setSelZone] = useState<number | null>(null);
  const [selDistrict, setSelDistrict] = useState<number | null>(null);
  const [selArea, setSelArea] = useState<number | null>(null);
  const [geoSeeded, setGeoSeeded] = useState(false);

  const { data: allZones = [] } = useQuery({ queryKey: ["zones"], queryFn: listZones });
  const { data: allDistricts = [] } = useQuery({
    queryKey: ["all-districts"],
    queryFn: () => listDistricts(),
  });
  const { data: allAreas = [] } = useQuery({
    queryKey: ["all-areas"],
    queryFn: () => listAreas(),
  });
  const { data: allClusters = [] } = useQuery({
    queryKey: ["all-clusters"],
    queryFn: () => listClusters(),
  });

  const scopedDistricts =
    isAdmin || !user
      ? allDistricts
      : allDistricts.filter((d) => user.district_ids.includes(d.id));
  const scopedClusters =
    isAdmin || !user
      ? allClusters
      : user.cluster_ids.length > 0
        ? allClusters.filter((c) => user.cluster_ids.includes(c.id))
        : allClusters;

  // Auto-select when only one option (add)
  useEffect(() => {
    if (!isAdd) return;
    if (scopedDistricts.length === 1 && !selDistrict) {
      const d = scopedDistricts[0];
      setSelDistrict(d.id);
      setSelZone(d.zone_id ?? null);
      const areas = allAreas.filter((a) => a.district_id === d.id);
      if (areas.length === 1) {
        setSelArea(areas[0].id);
        const clusters = scopedClusters.filter((c) => c.area_id === areas[0].id);
        if (clusters.length === 1) setForm((f) => ({ ...f, cluster_id: clusters[0].id }));
      }
    }
  }, [isAdd, scopedDistricts.length, allAreas.length, scopedClusters.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Seed geo cascade from cluster_id (edit)
  useEffect(() => {
    if (isAdd || readOnly || geoSeeded || !form.cluster_id || allClusters.length === 0) return;
    const cl = allClusters.find((c) => c.id === form.cluster_id);
    const ar = cl ? allAreas.find((a) => a.id === cl.area_id) : null;
    const di = ar ? allDistricts.find((d) => d.id === ar.district_id) : null;
    setSelArea(cl?.area_id ?? null);
    setSelDistrict(ar?.district_id ?? null);
    setSelZone(di?.zone_id ?? null);
    setGeoSeeded(true);
  }, [isAdd, readOnly, form.cluster_id, allClusters, allAreas, allDistricts, geoSeeded]);

  const filteredDistricts = selZone
    ? (isAdd ? scopedDistricts : allDistricts).filter((d) => d.zone_id === selZone)
    : isAdd
      ? scopedDistricts
      : allDistricts;
  const filteredAreas = selDistrict
    ? allAreas.filter((a) => a.district_id === selDistrict)
    : allAreas;
  const clusterSource = isAdd ? scopedClusters : allClusters;
  const filteredClusters = selArea
    ? clusterSource.filter((c) => c.area_id === selArea)
    : clusterSource;

  // ── VIEW ───────────────────────────────────────────────────────────────────
  if (readOnly) {
    return (
      <div>
        <ViewSection title="Location">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <ViewField label="Zone">{locationLabels?.zone}</ViewField>
            <ViewField label="District">{locationLabels?.district}</ViewField>
            <ViewField label="Area">{locationLabels?.area}</ViewField>
            <ViewField label="Cluster">{locationLabels?.cluster}</ViewField>
          </div>
        </ViewSection>

        <ViewSection title="Details">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <ViewField label="Name *">{form.name || null}</ViewField>
            <ViewField label="Type">{form.kutir_type || null}</ViewField>
          </div>
          <ViewField label="State">{form.state}</ViewField>
        </ViewSection>

        <ViewSection title="Enrollment">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <ViewField label="5th Grade">{form.enrollment_5th}</ViewField>
            <ViewField label="8th Grade">{form.enrollment_8th}</ViewField>
          </div>
        </ViewSection>

        {teacher && (
          <ViewSection title="Teacher">
            <div style={viewStyles.value}>
              {[teacher.first_name, teacher.last_name].filter(Boolean).join(" ") ||
                teacher.username}
              {teacher.title && (
                <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  {" "}
                  ({teacher.title})
                </span>
              )}
            </div>
          </ViewSection>
        )}
      </div>
    );
  }

  // ── ADD / EDIT ─────────────────────────────────────────────────────────────
  return (
    <div>
      <section style={sec}>
        <div style={secTitle}>Location</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div>
            <label style={grs.fieldLabel}>Zone</label>
            <select
              style={grs.select}
              value={selZone ?? ""}
              onChange={(e) => {
                setSelZone(Number(e.target.value) || null);
                setSelDistrict(null);
                setSelArea(null);
                setForm((f) => ({ ...f, cluster_id: 0 }));
              }}
            >
              <option value="">— select zone —</option>
              {allZones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={grs.fieldLabel}>District</label>
            <select
              style={grs.select}
              value={selDistrict ?? ""}
              disabled={!selZone}
              onChange={(e) => {
                setSelDistrict(Number(e.target.value) || null);
                setSelArea(null);
                setForm((f) => ({ ...f, cluster_id: 0 }));
              }}
            >
              <option value="">— select district —</option>
              {filteredDistricts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={grs.fieldLabel}>Area</label>
            <select
              style={grs.select}
              value={selArea ?? ""}
              disabled={!selDistrict}
              onChange={(e) => {
                setSelArea(Number(e.target.value) || null);
                setForm((f) => ({ ...f, cluster_id: 0 }));
              }}
            >
              <option value="">— select area —</option>
              {filteredAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={grs.fieldLabel}>Cluster *</label>
            <select
              style={grs.select}
              value={form.cluster_id || ""}
              disabled={!selArea}
              onChange={(e) => setForm((f) => ({ ...f, cluster_id: Number(e.target.value) }))}
            >
              <option value="">— select cluster —</option>
              {filteredClusters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section style={sec}>
        <div style={secTitle}>Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div>
            <label style={grs.fieldLabel}>Name *</label>
            <input
              style={grs.input}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Kutir name"
            />
          </div>
          <div>
            <label style={grs.fieldLabel}>Type</label>
            <select
              style={grs.select}
              value={form.kutir_type}
              onChange={(e) => setForm((f) => ({ ...f, kutir_type: e.target.value }))}
            >
              {KUTIR_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label style={grs.fieldLabel}>State</label>
          <select
            style={grs.select}
            value={form.state ?? "Madhya Pradesh"}
            onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
          >
            {STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </section>

      <section style={sec}>
        <div style={secTitle}>Enrollment</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={grs.fieldLabel}>5th Grade</label>
            <input
              style={grs.input}
              type="number"
              value={form.enrollment_5th ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, enrollment_5th: Number(e.target.value) || null }))
              }
              placeholder="0"
            />
          </div>
          <div>
            <label style={grs.fieldLabel}>8th Grade</label>
            <input
              style={grs.input}
              type="number"
              value={form.enrollment_8th ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, enrollment_8th: Number(e.target.value) || null }))
              }
              placeholder="0"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
