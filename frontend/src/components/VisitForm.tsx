/**
 * Shared visit form used by VisitAddPage and VisitDetailPage.
 * Caller owns form state; this component is presentational + interactive.
 * Modes: add (empty/editable), edit (editable), view (read-only).
 */
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BLANK_VISIT,
  type KutirVisit,
  type KutirVisitCreate,
} from "../api/visits";
import { listKutirs } from "../api/kutirs";
import { listDistricts, listAreas, listClusters } from "../api/geo";
import { ViewField, viewStyles } from "@parivaar/ui";
import { useAuth } from "../context/AuthContext";
import { hasGlobalDataScope } from "../constants/roles";
import { grs } from "../styles/grs";

const MEDIA_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8001/api/v1").replace(
  "/api/v1",
  "",
);

const RATING_FIELDS: [keyof KutirVisitCreate, string][] = [
  ["cleanliness", "Cleanliness"],
  ["hindi_proficiency", "Hindi Proficiency"],
  ["english_proficiency", "English Proficiency"],
  ["maths_proficiency", "Math Proficiency"],
  ["evs_proficiency", "EVS Proficiency (class 5 only)"],
  ["reasoning_proficiency", "Reasoning Proficiency (class 5 only)"],
  ["material_management", "Material Management"],
  ["staff_behavior", "Kutir Staff Behavior"],
  ["kutir_performance", "Kutir Performance"],
];

const REGISTER_FIELDS: [keyof KutirVisitCreate, string][] = [
  ["reg_admission_forms", "Admission Forms File"],
  ["reg_attendance_students", "Students Attendance Register"],
  ["reg_daily_activity", "Daily Activity Register"],
  ["reg_observation", "Observation Register"],
  ["reg_students_data", "Student Alive Data File"],
  ["reg_attendance_teachers", "Teachers Attendance Register"],
  ["reg_students_documents", "Student Documents File"],
];

const TIMESLOT_FIELDS: [keyof KutirVisitCreate, string][] = [
  ["timeslot_bal_sabha", "Bal Sabha"],
  ["timeslot_sports", "Sports"],
  ["timeslot_yoga", "Yoga"],
  ["timeslot_value_ed", "Value Education"],
  ["timeslot_gk_map", "GK / Map"],
];

export type VisitFormState = KutirVisitCreate;

export function emptyVisitForm(): VisitFormState {
  return { ...BLANK_VISIT };
}

export function visitFormFromVisit(visit: KutirVisit): VisitFormState {
  const {
    id: _id,
    visited_by_id: _vid,
    visit_photo: _vp,
    created_at: _ca,
    updated_at: _ua,
    ...rest
  } = visit;
  return rest;
}

function SectionHead({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        color: "var(--link-color)",
        borderBottom: "2px solid var(--badge-blue-bg)",
        paddingBottom: 5,
        marginBottom: 12,
        marginTop: 22,
        textAlign: "left",
      }}
    >
      {label}
    </div>
  );
}

/** View-mode section title — shared chip/label size blue title. */
function ViewSectionHead({ label }: { label: string }) {
  return <div style={{ ...viewStyles.sectionTitle, marginTop: 16 }}>{label}</div>;
}

function StarRating({
  value,
  onChange,
  readOnly,
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
}) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={() => !readOnly && onChange?.(n)}
          style={{
            fontSize: "1.2rem",
            cursor: readOnly ? "default" : "pointer",
            color: n <= value ? "var(--star-active)" : "var(--star-inactive)",
          }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        cursor: disabled ? "default" : "pointer",
        fontSize: "0.875rem",
        padding: "4px 0",
        color: "var(--text-primary)",
        textAlign: "left",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 15, height: 15, cursor: disabled ? "default" : "pointer" }}
      />
      {label}
    </label>
  );
}

function RatingRow({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>{label}</span>
      <StarRating value={value} onChange={onChange} readOnly={readOnly} />
    </div>
  );
}

function workbookColor(wc: string | null) {
  if (wc === "Upto Date") return "var(--status-success-fg)";
  if (wc === "Partial Upto Date") return "var(--status-warn-fg)";
  return "var(--status-danger-fg)";
}

const detailGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "140px 1fr",
  gap: "6px 12px",
  fontSize: "0.875rem",
  color: "var(--text-primary)",
};
const detailLabel: React.CSSProperties = viewStyles.label;
const detailValue: React.CSSProperties = viewStyles.value;

interface VisitFormProps {
  form: VisitFormState;
  setForm: React.Dispatch<React.SetStateAction<VisitFormState>>;
  mode: "add" | "edit" | "view";
  photoFile?: File | null;
  setPhotoFile?: (f: File | null) => void;
  /** Existing photo path from the visit record (edit/view). */
  existingPhoto?: string | null;
  /** Display name for view mode when kutir cannot be changed. */
  kutirName?: string;
}

export function VisitForm({
  form,
  setForm,
  mode,
  photoFile = null,
  setPhotoFile,
  existingPhoto = null,
  kutirName,
}: VisitFormProps) {
  const readOnly = mode === "view";
  const { user } = useAuth();

  const [filterDistrict, setFilterDistrict] = useState<number | "">("");
  const [filterCluster, setFilterCluster] = useState<number | "">("");
  const [geoSeeded, setGeoSeeded] = useState(false);

  const { data: kutirs = [] } = useQuery({
    queryKey: ["kutirs"],
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

  const unscoped = hasGlobalDataScope(user?.title);
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

  const areaMap = new Map(allAreas.map((a) => [a.id, a]));

  const modalFilterClusters = scopedClusters.filter(
    (c) => filterDistrict === "" || areaMap.get(c.area_id)?.district_id === filterDistrict,
  );
  const filteredKutirs = kutirs.filter((k) => {
    if (filterCluster !== "") return k.cluster_id === filterCluster;
    if (filterDistrict !== "") {
      const cl = allClusters.find((c) => c.id === k.cluster_id);
      if (!cl) return false;
      return areaMap.get(cl.area_id)?.district_id === filterDistrict;
    }
    return true;
  });

  function set<K extends keyof KutirVisitCreate>(key: K, val: KutirVisitCreate[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  // Auto-select district/cluster when only one option (add mode).
  // Cluster effect deps include areas/clusters so first load isn’t skipped.
  useEffect(() => {
    if (mode !== "add") return;
    if (scopedDistricts.length === 1 && filterDistrict === "") {
      setFilterDistrict(scopedDistricts[0].id);
    }
  }, [mode, scopedDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode !== "add" || filterDistrict === "") return;
    if (modalFilterClusters.length === 1 && filterCluster === "") {
      setFilterCluster(modalFilterClusters[0].id);
    }
  }, [mode, filterDistrict, modalFilterClusters.length, allAreas.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Seed district/cluster from form.kutir_id (edit/view)
  useEffect(() => {
    if (mode === "add" || geoSeeded || !form.kutir_id || kutirs.length === 0 || allClusters.length === 0) {
      return;
    }
    const kutir = kutirs.find((k) => k.id === form.kutir_id);
    if (!kutir) return;
    const cluster = allClusters.find((c) => c.id === kutir.cluster_id);
    if (cluster) {
      const area = areaMap.get(cluster.area_id);
      if (area) setFilterDistrict(area.district_id);
      setFilterCluster(kutir.cluster_id);
    }
    setGeoSeeded(true);
  }, [mode, form.kutir_id, kutirs, allClusters, allAreas, geoSeeded]); // eslint-disable-line react-hooks/exhaustive-deps

  const disabledInpStyle = {
    ...grs.input,
    background: "var(--bg-input)",
    color: "var(--text-secondary)",
    cursor: "not-allowed" as const,
  };

  const allChecked =
    form.timeslot_bal_sabha &&
    form.timeslot_sports &&
    form.timeslot_yoga &&
    form.timeslot_value_ed &&
    form.timeslot_gk_map;

  const resolvedKutirName =
    kutirName ?? kutirs.find((k) => k.id === form.kutir_id)?.name ?? (form.kutir_id ? `Kutir #${form.kutir_id}` : "—");

  // ── VIEW ───────────────────────────────────────────────────────────────────
  if (readOnly) {
    return (
      <div>
        {existingPhoto && (
          <img
            src={`${MEDIA_BASE}/media/${existingPhoto}`}
            alt="Visit photo"
            style={{
              width: "100%",
              borderRadius: 8,
              marginBottom: 16,
              maxHeight: 220,
              objectFit: "cover",
            }}
          />
        )}

        {form.kutir_closed && (
          <div
            style={{
              padding: "6px 12px",
              background: "var(--danger-bg, #fef2f2)",
              border: "1px solid var(--danger-border, #fca5a5)",
              borderRadius: 6,
              color: "var(--danger, #dc2626)",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            🔒 Kutir was Closed during this visit
          </div>
        )}

        <ViewSectionHead label="Visit Info" />
        <div style={detailGrid}>
          <span style={detailLabel}>Kutir</span>
          <span style={detailValue}>{resolvedKutirName}</span>
          <span style={detailLabel}>Visit Date</span>
          <span style={detailValue}>
            {form.visit_date
              ? new Date(form.visit_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </span>
          <span style={detailLabel}>Status</span>
          <span style={detailValue}>{form.kutir_closed ? "Closed" : "Open"}</span>
        </div>

        <ViewSectionHead label="Attendance" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "110px 1fr 1fr",
            gap: "6px 10px",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div />
          <div style={{ ...detailLabel, textAlign: "center" as const }}>
            Avg Last Week Attendance
          </div>
          <div style={{ ...detailLabel, textAlign: "center" as const }}>
            Regular (&gt;8 days) Students
          </div>
          <span style={detailLabel}>Morning Shift</span>
          <span style={{ ...detailValue, textAlign: "center" as const }}>{form.avg_attendance_morning ?? "—"}</span>
          <span style={{ ...detailValue, textAlign: "center" as const }}>{form.regular_students_morning ?? "—"}</span>
          <span style={detailLabel}>Evening Shift</span>
          <span style={{ ...detailValue, textAlign: "center" as const }}>{form.avg_attendance_evening ?? "—"}</span>
          <span style={{ ...detailValue, textAlign: "center" as const }}>{form.regular_students_evening ?? "—"}</span>
        </div>
        <div style={detailGrid}>
          <span style={detailLabel}>App vs. Registered Students</span>
          <span style={detailValue}>
            <span
              style={{
                background:
                  form.physical_vs_registered === "Matched"
                    ? "var(--status-success-bg)"
                    : "var(--status-danger-bg)",
                color:
                  form.physical_vs_registered === "Matched"
                    ? "var(--status-success-fg)"
                    : "var(--status-danger-fg)",
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: "0.8rem",
              }}
            >
              {form.physical_vs_registered}
            </span>
          </span>
        </div>

        <ViewSectionHead label="Implementation" />
        <div style={detailGrid}>
          <span style={detailLabel}>Follows Timetable</span>
          <span style={detailValue}>{form.follow_timetable ? "✓ Yes" : "✗ No"}</span>
          <span style={detailLabel}>Monthly Teaching Plan</span>
          <span style={{ ...detailValue, display: "flex", gap: 10, flexWrap: "wrap" as const }}>
            {(
              [
                ["plan_hindi", "Hindi"],
                ["plan_math", "Math"],
                ["plan_english", "English"],
              ] as const
            ).map(([k, l]) => (
              <span
                key={k}
                style={{
                  color: form[k] ? "var(--status-success-fg)" : "var(--text-secondary)",
                  fontSize: 13,
                }}
              >
                {form[k] ? "✓" : "✗"} {l}
              </span>
            ))}
          </span>
          {form.timetable_plan_reason && (
            <>
              <span style={detailLabel}>Reason</span>
              <span style={detailValue}>{form.timetable_plan_reason}</span>
            </>
          )}
        </div>

        <ViewSectionHead label="Topics" />
        <div style={detailGrid}>
          {form.math_topics_pre && (
            <>
              <span style={detailLabel}>Math (Pre)</span>
              <span style={detailValue}>{form.math_topics_pre}</span>
            </>
          )}
          {form.math_topics_upper && (
            <>
              <span style={detailLabel}>Math (Upper)</span>
              <span style={detailValue}>{form.math_topics_upper}</span>
            </>
          )}
          {form.english_topics_pre && (
            <>
              <span style={detailLabel}>English (Pre)</span>
              <span style={detailValue}>{form.english_topics_pre}</span>
            </>
          )}
          {form.english_topics_upper && (
            <>
              <span style={detailLabel}>English (Upper)</span>
              <span style={detailValue}>{form.english_topics_upper}</span>
            </>
          )}
        </div>

        <ViewSectionHead label="Time Slots" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(
            [
              [form.timeslot_bal_sabha, "Bal Sabha"],
              [form.timeslot_sports, "Sports"],
              [form.timeslot_yoga, "Yoga"],
              [form.timeslot_value_ed, "Value Ed"],
              [form.timeslot_gk_map, "GK/Map"],
            ] as [boolean, string][]
          ).map(([val, name]) => (
            <span
              key={name}
              style={{
                padding: "3px 10px",
                borderRadius: 12,
                fontSize: "0.78rem",
                background: val ? "var(--status-success-bg)" : "var(--bg-input)",
                color: val ? "var(--status-success-fg)" : "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              {val ? "✓" : "✗"} {name}
            </span>
          ))}
        </div>
        {form.timeslot_reason && (
          <div style={{ marginTop: 8, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            <em>{form.timeslot_reason}</em>
          </div>
        )}

        <ViewSectionHead label="Workbook & Books" />
        <div style={detailGrid}>
          <span style={detailLabel}>Workbook %</span>
          <span style={detailValue}>{form.workbook_percentage}%</span>
          <span style={detailLabel}>Workbook Status</span>
          <span style={{ ...detailValue, color: workbookColor(form.workbook_completion) }}>
            {form.workbook_completion}
          </span>
          <span style={detailLabel}>Book Availability</span>
          <span style={detailValue}>{form.book_availability}</span>
        </div>

        <ViewSectionHead label="Registers" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(
            [
              [form.reg_admission_forms, "Admission Forms File"],
              [form.reg_attendance_students, "Student Attendance"],
              [form.reg_daily_activity, "Daily Activity"],
              [form.reg_observation, "Observation"],
              [form.reg_students_data, "Student Alive Data File"],
              [form.reg_attendance_teachers, "Teacher Attendance"],
              [form.reg_students_documents, "Student Documents File"],
            ] as [boolean, string][]
          ).map(([val, name]) => (
            <span
              key={name}
              style={{
                padding: "3px 10px",
                borderRadius: 12,
                fontSize: "0.78rem",
                background: val ? "var(--badge-blue-bg)" : "var(--bg-input)",
                color: val ? "var(--badge-blue-fg)" : "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              {val ? "✓" : "✗"} {name}
            </span>
          ))}
        </div>

        <ViewSectionHead label="Ratings (1 = Poor, 5 = Excellent)" />
        <div>
          {RATING_FIELDS.map(([key, label]) => (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "5px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span style={detailLabel}>{label}</span>
              <StarRating value={(form[key] as number) ?? 0} readOnly />
            </div>
          ))}
        </div>

        {(form.grs_prep_remarks || form.final_remarks) && (
          <>
            <ViewSectionHead label="Remarks" />
            {form.grs_prep_remarks && (
              <div style={{ marginBottom: 10 }}>
                <ViewField label="GRS Preparation">{form.grs_prep_remarks}</ViewField>
              </div>
            )}
            {form.final_remarks && (
              <ViewField label="Final Remarks">{form.final_remarks}</ViewField>
            )}
          </>
        )}
      </div>
    );
  }

  // ── ADD / EDIT ─────────────────────────────────────────────────────────────
  return (
    <div>
      <SectionHead label="Visit Info" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div>
          <label style={grs.fieldLabel}>District</label>
          <select
            value={filterDistrict}
            onChange={(e) => {
              setFilterDistrict(e.target.value === "" ? "" : Number(e.target.value));
              setFilterCluster("");
              set("kutir_id", 0);
            }}
            style={grs.select}
          >
            <option value="">— Select District —</option>
            {scopedDistricts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={grs.fieldLabel}>Cluster</label>
          <select
            value={filterCluster}
            onChange={(e) => {
              setFilterCluster(e.target.value === "" ? "" : Number(e.target.value));
              set("kutir_id", 0);
            }}
            disabled={filterDistrict === ""}
            style={filterDistrict === "" ? disabledInpStyle : grs.select}
          >
            <option value="">— Select Cluster —</option>
            {modalFilterClusters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={grs.fieldLabel}>Kutir *</label>
          <select
            value={form.kutir_id || ""}
            onChange={(e) => set("kutir_id", Number(e.target.value))}
            style={grs.select}
          >
            <option value="">Select kutir…</option>
            {filteredKutirs.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={grs.fieldLabel}>Visit Date *</label>
          <input
            type="date"
            value={form.visit_date}
            onChange={(e) => set("visit_date", e.target.value)}
            style={grs.input}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            border: "1px solid var(--border)",
            borderRadius: 6,
            overflow: "hidden",
            height: 34,
            flexShrink: 0,
          }}
        >
          {(["Open", "Closed"] as const).map((opt) => {
            const active = (opt === "Closed") === (form.kutir_closed ?? false);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => set("kutir_closed", opt === "Closed")}
                style={{
                  padding: "0 14px",
                  height: "100%",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: active ? 700 : 400,
                  fontSize: 13,
                  background: active
                    ? opt === "Closed"
                      ? "var(--danger, #dc2626)"
                      : "var(--status-success-bg, #d1fae5)"
                    : "var(--bg-input)",
                  color: active
                    ? opt === "Closed"
                      ? "#fff"
                      : "var(--status-success-fg, #065f46)"
                    : "var(--text-secondary)",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "110px 1fr 1fr",
          gap: "6px 10px",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div />
        <div style={{ ...grs.fieldLabel, textAlign: "center" as const }}>Avg Last Week Attendance</div>
        <div style={{ ...grs.fieldLabel, textAlign: "center" as const }}>
          Regular (&gt;8 days) Students
        </div>
        <div style={{ ...grs.fieldLabel, paddingTop: 2 }}>Morning Shift</div>
        <input
          type="number"
          min={0}
          value={form.avg_attendance_morning ?? ""}
          onChange={(e) =>
            set("avg_attendance_morning", e.target.value === "" ? null : Number(e.target.value))
          }
          style={grs.input}
          placeholder="0"
        />
        <input
          type="number"
          min={0}
          value={form.regular_students_morning ?? ""}
          onChange={(e) =>
            set("regular_students_morning", e.target.value === "" ? null : Number(e.target.value))
          }
          style={grs.input}
          placeholder="—"
        />
        <div style={{ ...grs.fieldLabel, paddingTop: 2 }}>Evening Shift</div>
        <input
          type="number"
          min={0}
          value={form.avg_attendance_evening ?? ""}
          onChange={(e) =>
            set("avg_attendance_evening", e.target.value === "" ? null : Number(e.target.value))
          }
          style={grs.input}
          placeholder="0"
        />
        <input
          type="number"
          min={0}
          value={form.regular_students_evening ?? ""}
          onChange={(e) =>
            set("regular_students_evening", e.target.value === "" ? null : Number(e.target.value))
          }
          style={grs.input}
          placeholder="—"
        />
      </div>

      {form.kutir_closed && (
        <div
          style={{
            padding: "10px 12px",
            background: "var(--danger-bg, #fef2f2)",
            border: "1px solid var(--danger-border, #fca5a5)",
            borderRadius: 6,
            color: "var(--danger, #dc2626)",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          🔒 Kutir is marked as Closed — other fields are disabled.
        </div>
      )}
      <fieldset
        disabled={!!form.kutir_closed}
        style={{
          border: "none",
          margin: 0,
          padding: 0,
          opacity: form.kutir_closed ? 0.45 : 1,
          pointerEvents: form.kutir_closed ? "none" : "auto",
        }}
      >
        <SectionHead label="Implementation" />
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "4px 0" }}>
          <span style={{ ...grs.fieldLabel, margin: 0, minWidth: 180 }}>Follows Timetable</span>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.follow_timetable}
              onChange={(e) => set("follow_timetable", e.target.checked)}
              style={{ accentColor: "var(--link-color)" }}
            />
            Yes
          </label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "4px 0" }}>
          <span style={{ ...grs.fieldLabel, margin: 0, minWidth: 180 }}>
            Follows Monthly Teaching Plan
          </span>
          {(
            [
              ["plan_hindi", "Hindi"],
              ["plan_math", "Math"],
              ["plan_english", "English"],
            ] as [keyof KutirVisitCreate, string][]
          ).map(([key, label]) => (
            <label
              key={key}
              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={(form[key] as boolean) ?? false}
                onChange={(e) => set(key, e.target.checked as never)}
                style={{ accentColor: "var(--link-color)" }}
              />
              {label}
            </label>
          ))}
        </div>
        {(!form.follow_timetable || !form.plan_hindi || !form.plan_math || !form.plan_english) && (
          <div style={{ marginTop: 8 }}>
            <label style={grs.fieldLabel}>Reason (if not following plan/timetable)</label>
            <textarea
              value={form.timetable_plan_reason ?? ""}
              onChange={(e) => set("timetable_plan_reason", e.target.value || null)}
              rows={2}
              style={{ ...grs.input, resize: "vertical" }}
            />
          </div>
        )}

        <SectionHead label="Topics Covered" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={grs.fieldLabel}>Math Topics (Pre)</label>
            <textarea
              value={form.math_topics_pre ?? ""}
              onChange={(e) => set("math_topics_pre", e.target.value || null)}
              rows={2}
              style={{ ...grs.input, resize: "vertical" }}
            />
          </div>
          <div>
            <label style={grs.fieldLabel}>Math Topics (Upper)</label>
            <textarea
              value={form.math_topics_upper ?? ""}
              onChange={(e) => set("math_topics_upper", e.target.value || null)}
              rows={2}
              style={{ ...grs.input, resize: "vertical" }}
            />
          </div>
          <div>
            <label style={grs.fieldLabel}>English Topics (Pre)</label>
            <textarea
              value={form.english_topics_pre ?? ""}
              onChange={(e) => set("english_topics_pre", e.target.value || null)}
              rows={2}
              style={{ ...grs.input, resize: "vertical" }}
            />
          </div>
          <div>
            <label style={grs.fieldLabel}>English Topics (Upper)</label>
            <textarea
              value={form.english_topics_upper ?? ""}
              onChange={(e) => set("english_topics_upper", e.target.value || null)}
              rows={2}
              style={{ ...grs.input, resize: "vertical" }}
            />
          </div>
        </div>

        <SectionHead label="Time Slot Utilisation" />
        <div style={{ marginBottom: 4 }}>
          <label style={{ ...grs.fieldLabel, fontWeight: 600 }}>
            Were time slots utilized effectively?
          </label>
        </div>
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: "4px 24px" }}>
          {TIMESLOT_FIELDS.map(([key, label]) => (
            <CheckRow
              key={key}
              label={label}
              checked={!!form[key]}
              onChange={(v) => set(key, v as never)}
            />
          ))}
        </div>
        {!allChecked && (
          <div style={{ marginTop: 10 }}>
            <label style={grs.fieldLabel}>
              If any of them not checked, provide a reason
            </label>
            <textarea
              value={form.timeslot_reason ?? ""}
              onChange={(e) => set("timeslot_reason", e.target.value || null)}
              rows={2}
              style={{ ...grs.input, resize: "vertical" }}
            />
          </div>
        )}

        <SectionHead label="Registers & Materials" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={grs.fieldLabel}>App vs. Registered Students</label>
            <select
              value={form.physical_vs_registered}
              onChange={(e) =>
                set("physical_vs_registered", e.target.value as KutirVisitCreate["physical_vs_registered"])
              }
              style={grs.select}
            >
              <option value="Matched">Matched</option>
              <option value="Not Matched">Not Matched</option>
            </select>
          </div>
          <div>
            <label style={grs.fieldLabel}>Workbook % Complete</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.workbook_percentage}
              onChange={(e) => set("workbook_percentage", Number(e.target.value))}
              style={grs.input}
            />
          </div>
          <div>
            <label style={grs.fieldLabel}>Workbook Completion</label>
            <select
              value={form.workbook_completion}
              onChange={(e) =>
                set("workbook_completion", e.target.value as KutirVisitCreate["workbook_completion"])
              }
              style={grs.select}
            >
              <option value="Upto Date">Upto Date</option>
              <option value="Partial Upto Date">Partial Upto Date</option>
              <option value="Not Uptodate">Not Uptodate</option>
            </select>
          </div>
          <div>
            <label style={grs.fieldLabel}>Book Availability</label>
            <select
              value={form.book_availability}
              onChange={(e) =>
                set("book_availability", e.target.value as KutirVisitCreate["book_availability"])
              }
              style={grs.select}
            >
              <option value="Sufficient">Sufficient</option>
              <option value="Lacking">Lacking</option>
              <option value="More than required">More than required</option>
            </select>
          </div>
        </div>
        <SectionHead label="Registers Checked" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 24px", marginBottom: 4 }}>
          {REGISTER_FIELDS.map(([key, label]) => (
            <CheckRow
              key={key}
              label={label}
              checked={!!form[key]}
              onChange={(v) => set(key, v as never)}
            />
          ))}
        </div>

        <SectionHead label="Ratings (1 = Poor, 5 = Excellent)" />
        <div>
          {RATING_FIELDS.map(([key, label]) => (
            <RatingRow
              key={key}
              label={label}
              value={(form[key] as number) ?? 3}
              onChange={(v) => set(key, v as never)}
            />
          ))}
        </div>

        <SectionHead label="Remarks & Photo" />
        <div>
          <label style={grs.fieldLabel}>GRS Preparation Remarks</label>
          <textarea
            value={form.grs_prep_remarks ?? ""}
            onChange={(e) => set("grs_prep_remarks", e.target.value || null)}
            rows={2}
            style={{ ...grs.input, resize: "vertical" }}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={grs.fieldLabel}>Final Remarks</label>
          <textarea
            value={form.final_remarks ?? ""}
            onChange={(e) => set("final_remarks", e.target.value || null)}
            rows={3}
            style={{ ...grs.input, resize: "vertical" }}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={grs.fieldLabel}>Visit Photo</label>
          {existingPhoto && !photoFile && (
            <div style={{ marginBottom: 8 }}>
              <img
                src={`${MEDIA_BASE}/media/${existingPhoto}`}
                alt="Current photo"
                style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 6 }}
              />
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 4 }}>
                Current photo. Upload a new one to replace it.
              </div>
            </div>
          )}
          {setPhotoFile && (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              style={{ fontSize: "0.85rem" }}
            />
          )}
          {photoFile && (
            <div style={{ marginTop: 8 }}>
              <img
                src={URL.createObjectURL(photoFile)}
                alt="Preview"
                style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 6 }}
              />
            </div>
          )}
        </div>
      </fieldset>
    </div>
  );
}
