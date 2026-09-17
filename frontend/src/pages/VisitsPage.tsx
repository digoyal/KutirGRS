import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import api from "../api/client";
import { BLANK_VISIT, listVisits, createVisit, updateVisit, deleteVisit, uploadVisitPhoto } from "../api/visits";
import type { KutirVisit, KutirVisitCreate } from "../api/visits";
import { useAuth } from "../context/AuthContext";
import { listDistricts, listAreas, listClusters } from "../api/geo";
import { grs } from "../styles/grs";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { VISITS_FIELDS } from "../constants/visitsFields";

const MEDIA_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8001/api/v1").replace("/api/v1", "");

// ── Intentional design constants (dark-navy drawer header) ───────────────────
const NAVY_BG     = "#1a365d";
const NAVY_TEXT   = "#ffffff";
const NAVY_ACCENT = "#90cdf4";

interface Kutir {
  id: number;
  name: string;
  code: string;
  cluster_id: number;
}

// ── Rating stars ──────────────────────────────────────────────────────────────
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

// ── Section header ────────────────────────────────────────────────────────────
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

// ── Checkbox row ──────────────────────────────────────────────────────────────
function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        cursor: "pointer",
        fontSize: "0.875rem",
        padding: "4px 0",
        color: "var(--text-primary)",
        textAlign: "left",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 15, height: 15, cursor: "pointer" }}
      />
      {label}
    </label>
  );
}

// ── Rating row ────────────────────────────────────────────────────────────────
function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
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
      <StarRating value={value} onChange={onChange} />
    </div>
  );
}

// ── Workbook color helper ─────────────────────────────────────────────────────
function workbookColor(wc: string | null) {
  if (wc === "Upto Date") return "var(--status-success-fg)";
  if (wc === "Partial Upto Date") return "var(--status-warn-fg)";
  return "var(--status-danger-fg)";
}

// ── Main modal ────────────────────────────────────────────────────────────────
function VisitModal({
  initial,
  kutirs,
  onClose,
  onSaved,
}: {
  initial: KutirVisitCreate & { id?: number };
  kutirs: Kutir[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<KutirVisitCreate & { id?: number }>(initial);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterDistrict, setFilterDistrict] = useState<number | "">("");
  const [filterCluster, setFilterCluster] = useState<number | "">("");

  const { data: allDistricts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { data: allAreas = [] } = useQuery({ queryKey: ["all-areas"], queryFn: () => listAreas() });
  const { data: allClusters = [] } = useQuery({ queryKey: ["all-clusters"], queryFn: () => listClusters() });

  const areaMap = new Map(allAreas.map((a: any) => [a.id, a]));
  const modalFilterClusters = allClusters.filter((c: any) =>
    filterDistrict === "" || (areaMap.get(c.area_id) as any)?.district_id === filterDistrict
  );
  const filteredKutirs = kutirs.filter((k) => {
    if (filterCluster !== "") return k.cluster_id === filterCluster;
    if (filterDistrict !== "") {
      const cl = allClusters.find((c: any) => c.id === k.cluster_id) as any;
      if (!cl) return false;
      return (areaMap.get(cl.area_id) as any)?.district_id === filterDistrict;
    }
    return true;
  });

  const isEdit = !!initial.id;

  function set<K extends keyof KutirVisitCreate>(key: K, val: KutirVisitCreate[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    if (!form.kutir_id) {
      setError("Please select a kutir.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let saved: KutirVisit;
      const { id, ...payload } = form;
      if (isEdit) {
        saved = await updateVisit(id!, payload);
      } else {
        saved = await createVisit(payload);
      }
      if (photoFile) {
        await uploadVisitPhoto(saved.id, photoFile);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const disabledInpStyle = { ...grs.input, background: "var(--bg-input)", color: "var(--text-secondary)", cursor: "not-allowed" as const };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: 540,
          maxWidth: "100vw",
          height: "100dvh",
          background: "var(--bg-card)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header — intentional dark navy design */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: NAVY_BG,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "1rem", color: NAVY_TEXT }}>
            {isEdit ? "Edit Visit" : "Log New Visit"}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: NAVY_ACCENT,
              fontSize: "1.4rem",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 24px" }}>
          {error && <div style={grs.errorBox}>{error}</div>}

          <SectionHead label="Visit Info" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ gridColumn: "1/-1", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div>
                <label style={grs.fieldLabel}>District</label>
                <select
                  value={filterDistrict}
                  onChange={(e) => { setFilterDistrict(e.target.value === "" ? "" : Number(e.target.value)); setFilterCluster(""); set("kutir_id", 0); }}
                  style={grs.select}
                >
                  <option value="">All districts</option>
                  {allDistricts.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={grs.fieldLabel}>Cluster</label>
                <select
                  value={filterCluster}
                  onChange={(e) => { setFilterCluster(e.target.value === "" ? "" : Number(e.target.value)); set("kutir_id", 0); }}
                  disabled={filterDistrict === ""}
                  style={filterDistrict === "" ? disabledInpStyle : grs.select}
                >
                  <option value="">All clusters</option>
                  {modalFilterClusters.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
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
                    <option key={k.id} value={k.id}>{k.name} ({k.code})</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={grs.fieldLabel}>Visit Date *</label>
                <input type="date" value={form.visit_date} onChange={(e) => set("visit_date", e.target.value)} style={grs.input} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 0, border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden", height: 34, flexShrink: 0 }}>
                {(["Open", "Closed"] as const).map(opt => {
                  const active = (opt === "Closed") === (form.kutir_closed ?? false);
                  return (
                    <button key={opt} type="button" onClick={() => set("kutir_closed", opt === "Closed")}
                      style={{ padding: "0 14px", height: "100%", border: "none", cursor: "pointer", fontWeight: active ? 700 : 400, fontSize: 13,
                        background: active ? (opt === "Closed" ? "var(--danger, #dc2626)" : "var(--status-success-bg, #d1fae5)") : "var(--bg-input)",
                        color: active ? (opt === "Closed" ? "#fff" : "var(--status-success-fg, #065f46)") : "var(--text-secondary)" }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              {/* 2×2 attendance grid: columns = metric, rows = session */}
              <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr", gap: "6px 10px", alignItems: "center" }}>
                {/* header row */}
                <div />
                <div style={{ ...grs.fieldLabel, textAlign: "center" as const }}>Avg Last Week Attendance</div>
                <div style={{ ...grs.fieldLabel, textAlign: "center" as const }}>Regular (&gt;8 days) Students</div>
                {/* morning row */}
                <div style={{ ...grs.fieldLabel, paddingTop: 2 }}>Morning Shift</div>
                <input type="number" min={0} value={form.avg_attendance_morning ?? ""} onChange={(e) => set("avg_attendance_morning", e.target.value === "" ? null : Number(e.target.value))} style={grs.input} placeholder="0" />
                <input type="number" min={0} value={form.regular_students_morning ?? ""} onChange={(e) => set("regular_students_morning", e.target.value === "" ? null : Number(e.target.value))} style={grs.input} placeholder="—" />
                {/* evening row */}
                <div style={{ ...grs.fieldLabel, paddingTop: 2 }}>Evening Shift</div>
                <input type="number" min={0} value={form.avg_attendance_evening ?? ""} onChange={(e) => set("avg_attendance_evening", e.target.value === "" ? null : Number(e.target.value))} style={grs.input} placeholder="0" />
                <input type="number" min={0} value={form.regular_students_evening ?? ""} onChange={(e) => set("regular_students_evening", e.target.value === "" ? null : Number(e.target.value))} style={grs.input} placeholder="—" />
              </div>
            </div>
          </div>

          {form.kutir_closed && (
            <div style={{ padding: "10px 12px", background: "var(--danger-bg, #fef2f2)", border: "1px solid var(--danger-border, #fca5a5)", borderRadius: 6, color: "var(--danger, #dc2626)", fontSize: 13, fontWeight: 600 }}>
              🔒 Kutir is marked as Closed — other fields are disabled.
            </div>
          )}
          <fieldset disabled={!!form.kutir_closed} style={{ border: "none", margin: 0, padding: 0, opacity: form.kutir_closed ? 0.45 : 1, pointerEvents: form.kutir_closed ? "none" : "auto" }}>
          <SectionHead label="Implementation" />
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "4px 0" }}>
            <span style={{ ...grs.fieldLabel, margin: 0, minWidth: 180 }}>Follows Timetable</span>
            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={form.follow_timetable} onChange={e => set("follow_timetable", e.target.checked)} style={{ accentColor: "var(--link-color)" }} />
              Yes
            </label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "4px 0" }}>
            <span style={{ ...grs.fieldLabel, margin: 0, minWidth: 180 }}>Follows Monthly Teaching Plan</span>
            {([["plan_hindi", "Hindi"], ["plan_math", "Math"], ["plan_english", "English"]] as [keyof KutirVisitCreate, string][]).map(([key, label]) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={(form[key] as boolean) ?? false} onChange={e => set(key, e.target.checked)} style={{ accentColor: "var(--link-color)" }} />
                {label}
              </label>
            ))}
          </div>
          {(!form.follow_timetable || !form.plan_hindi || !form.plan_math || !form.plan_english) && (
            <div style={{ marginTop: 8 }}>
              <label style={grs.fieldLabel}>Reason (if not following plan/timetable)</label>
              <textarea value={form.timetable_plan_reason ?? ""} onChange={(e) => set("timetable_plan_reason", e.target.value || null)} rows={2} style={{ ...grs.input, resize: "vertical" }} />
            </div>
          )}

          <SectionHead label="Topics Covered" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={grs.fieldLabel}>Math Topics (Pre)</label>
              <textarea value={form.math_topics_pre ?? ""} onChange={(e) => set("math_topics_pre", e.target.value || null)} rows={2} style={{ ...grs.input, resize: "vertical" }} />
            </div>
            <div>
              <label style={grs.fieldLabel}>Math Topics (Upper)</label>
              <textarea value={form.math_topics_upper ?? ""} onChange={(e) => set("math_topics_upper", e.target.value || null)} rows={2} style={{ ...grs.input, resize: "vertical" }} />
            </div>
            <div>
              <label style={grs.fieldLabel}>English Topics (Pre)</label>
              <textarea value={form.english_topics_pre ?? ""} onChange={(e) => set("english_topics_pre", e.target.value || null)} rows={2} style={{ ...grs.input, resize: "vertical" }} />
            </div>
            <div>
              <label style={grs.fieldLabel}>English Topics (Upper)</label>
              <textarea value={form.english_topics_upper ?? ""} onChange={(e) => set("english_topics_upper", e.target.value || null)} rows={2} style={{ ...grs.input, resize: "vertical" }} />
            </div>
          </div>

          <SectionHead label="Time Slot Utilisation" />
          <div style={{ marginBottom: 4 }}>
            <label style={{ ...grs.fieldLabel, fontWeight: 600 }}>Were time slots utilized effectively?</label>
          </div>
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: "4px 24px" }}>
            <CheckRow label="Bal Sabha" checked={form.timeslot_bal_sabha} onChange={(v) => set("timeslot_bal_sabha", v)} />
            <CheckRow label="Sports" checked={form.timeslot_sports} onChange={(v) => set("timeslot_sports", v)} />
            <CheckRow label="Yoga" checked={form.timeslot_yoga} onChange={(v) => set("timeslot_yoga", v)} />
            <CheckRow label="Value Education" checked={form.timeslot_value_ed} onChange={(v) => set("timeslot_value_ed", v)} />
            <CheckRow label="GK / Map" checked={form.timeslot_gk_map} onChange={(v) => set("timeslot_gk_map", v)} />
          </div>
          {(() => {
            const allChecked = form.timeslot_bal_sabha && form.timeslot_sports && form.timeslot_yoga && form.timeslot_value_ed && form.timeslot_gk_map;
            return (
              <div style={{ marginTop: 10 }}>
                <label style={{ ...grs.fieldLabel, color: allChecked ? "var(--text-secondary)" : undefined }}>
                  If any of them not checked, provide a reason
                </label>
                <textarea value={form.timeslot_reason ?? ""} onChange={(e) => set("timeslot_reason", e.target.value || null)} rows={2} disabled={allChecked} style={allChecked ? disabledInpStyle : { ...grs.input, resize: "vertical" }} />
              </div>
            );
          })()}

          <SectionHead label="Registers & Materials" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={grs.fieldLabel}>Physical vs Registered</label>
              <select value={form.physical_vs_registered} onChange={(e) => set("physical_vs_registered", e.target.value as KutirVisitCreate["physical_vs_registered"])} style={grs.select}>
                <option value="Matched">Matched</option>
                <option value="Not Matched">Not Matched</option>
              </select>
            </div>
            <div>
              <label style={grs.fieldLabel}>Workbook % Complete</label>
              <input type="number" min={0} max={100} value={form.workbook_percentage} onChange={(e) => set("workbook_percentage", Number(e.target.value))} style={grs.input} />
            </div>
            <div>
              <label style={grs.fieldLabel}>Workbook Completion</label>
              <select value={form.workbook_completion} onChange={(e) => set("workbook_completion", e.target.value as KutirVisitCreate["workbook_completion"])} style={grs.select}>
                <option value="Upto Date">Upto Date</option>
                <option value="Partial Upto Date">Partial Upto Date</option>
                <option value="Not Uptodate">Not Uptodate</option>
              </select>
            </div>
            <div>
              <label style={grs.fieldLabel}>Book Availability</label>
              <select value={form.book_availability} onChange={(e) => set("book_availability", e.target.value as KutirVisitCreate["book_availability"])} style={grs.select}>
                <option value="Sufficient">Sufficient</option>
                <option value="Lacking">Lacking</option>
                <option value="More than required">More than required</option>
              </select>
            </div>
          </div>
          <SectionHead label="Registers Checked" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 24px", marginBottom: 4 }}>
            {(
              [
                ["reg_admission_forms", "Admission Forms File"],
                ["reg_attendance_students", "Students Attendance Register"],
                ["reg_daily_activity", "Daily Activity Register"],
                ["reg_observation", "Observation Register"],
                ["reg_students_data", "Student Alive Data File"],
                ["reg_attendance_teachers", "Teachers Attendance Register"],
                ["reg_students_documents", "Student Documents File"],
              ] as [keyof KutirVisitCreate, string][]
            ).map(([key, label]) => (
              <CheckRow key={key} label={label} checked={!!form[key]} onChange={(v) => set(key, v as any)} />
            ))}
          </div>

          <SectionHead label="Ratings (1 = Poor, 5 = Excellent)" />
          <div>
            {(
              [
                ["cleanliness", "Cleanliness"],
                ["hindi_proficiency", "Hindi Proficiency"],
                ["english_proficiency", "English Proficiency"],
                ["maths_proficiency", "Maths Proficiency"],
                ["evs_proficiency", "EVS Proficiency"],
                ["reasoning_proficiency", "Reasoning Proficiency"],
                ["material_management", "Material Management"],
                ["staff_behavior", "Kutir Staff Behavior"],
                ["kutir_performance", "Kutir Performance"],
              ] as [keyof KutirVisitCreate, string][]
            ).map(([key, label]) => (
              <RatingRow key={key} label={label} value={(form[key] as number) ?? 3} onChange={(v) => set(key, v as any)} />
            ))}
          </div>

          <SectionHead label="Remarks & Photo" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={grs.fieldLabel}>GRS Preparation Remarks</label>
              <textarea value={form.grs_prep_remarks ?? ""} onChange={(e) => set("grs_prep_remarks", e.target.value || null)} rows={2} style={{ ...grs.input, resize: "vertical" }} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={grs.fieldLabel}>Final Remarks</label>
              <textarea value={form.final_remarks ?? ""} onChange={(e) => set("final_remarks", e.target.value || null)} rows={3} style={{ ...grs.input, resize: "vertical" }} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={grs.fieldLabel}>Visit Photo</label>
              <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} style={{ fontSize: "0.85rem" }} />
              {photoFile && (
                <div style={{ marginTop: 8 }}>
                  <img src={URL.createObjectURL(photoFile)} alt="Preview" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 6 }} />
                </div>
              )}
            </div>
          </div>
          </fieldset>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={grs.btnSecondary} disabled={saving}>Cancel</button>
          <button onClick={handleSave} style={grs.btnPrimary} disabled={saving}>{saving ? "Saving…" : isEdit ? "Save Changes" : "Log Visit"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Visit detail drawer (read-only) ──────────────────────────────────────────
function VisitDetailDrawer({
  visit,
  kutirName,
  onClose,
  onEdit,
  onDelete,
  isAdmin,
}: {
  visit: KutirVisit;
  kutirName: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isAdmin: boolean;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this visit record?")) return;
    setDeleting(true);
    try {
      await deleteVisit(visit.id);
      onDelete();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  const ratingFields: [keyof KutirVisit, string][] = [
    ["cleanliness", "Cleanliness"],
    ["hindi_proficiency", "Hindi Proficiency"],
    ["english_proficiency", "English Proficiency"],
    ["maths_proficiency", "Maths Proficiency"],
    ["evs_proficiency", "EVS Proficiency"],
    ["reasoning_proficiency", "Reasoning Proficiency"],
    ["material_management", "Material Management"],
    ["staff_behavior", "Kutir Staff Behavior"],
    ["kutir_performance", "Kutir Performance"],
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", zIndex: 1000 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: 480, maxWidth: "100vw", height: "100dvh", background: "var(--bg-card)", display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.18)" }}>
        {/* Header — intentional dark navy design */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: NAVY_BG, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, color: NAVY_TEXT, fontSize: "0.95rem" }}>
              Visit: {new Date(visit.visit_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </div>
            <div style={{ fontSize: "0.8rem", color: NAVY_ACCENT }}>{kutirName}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: NAVY_ACCENT, fontSize: "1.4rem", cursor: "pointer" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {visit.visit_photo && (
            <img src={`${MEDIA_BASE}/media/${visit.visit_photo}`} alt="Visit photo" style={{ width: "100%", borderRadius: 8, marginBottom: 16, maxHeight: 200, objectFit: "cover" }} />
          )}

          <SectionHead label="Attendance" />
          <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr", gap: "6px 10px", alignItems: "center", marginBottom: 12 }}>
            <div />
            <div style={{ ...detailLabel, textAlign: "center" as const, fontWeight: 600 }}>Avg Last Week Attendance</div>
            <div style={{ ...detailLabel, textAlign: "center" as const, fontWeight: 600 }}>Regular (&gt;8 days) Students</div>
            <span style={detailLabel}>Morning Shift</span>
            <span style={{ textAlign: "center" as const }}>{visit.avg_attendance_morning ?? "—"}</span>
            <span style={{ textAlign: "center" as const }}>{visit.regular_students_morning ?? "—"}</span>
            <span style={detailLabel}>Evening Shift</span>
            <span style={{ textAlign: "center" as const }}>{visit.avg_attendance_evening ?? "—"}</span>
            <span style={{ textAlign: "center" as const }}>{visit.regular_students_evening ?? "—"}</span>
          </div>
          <div style={detailGrid}>
            <span style={detailLabel}>Physical vs Registered</span>
            <span>
              <span style={{
                background: visit.physical_vs_registered === "Matched" ? "var(--status-success-bg)" : "var(--status-danger-bg)",
                color: visit.physical_vs_registered === "Matched" ? "var(--status-success-fg)" : "var(--status-danger-fg)",
                borderRadius: 4, padding: "2px 8px", fontSize: "0.8rem",
              }}>{visit.physical_vs_registered}</span>
            </span>
          </div>

          {visit.kutir_closed && (
            <div style={{ padding: "6px 12px", background: "var(--danger-bg, #fef2f2)", border: "1px solid var(--danger-border, #fca5a5)", borderRadius: 6, color: "var(--danger, #dc2626)", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              🔒 Kutir was Closed during this visit
            </div>
          )}
          <SectionHead label="Implementation" />
          <div style={detailGrid}>
            <span style={detailLabel}>Follows Timetable</span><span>{visit.follow_timetable ? "✓ Yes" : "✗ No"}</span>
            <span style={detailLabel}>Monthly Teaching Plan</span>
            <span style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
              {[["plan_hindi", "Hindi"], ["plan_math", "Math"], ["plan_english", "English"]].map(([k, l]) => (
                <span key={k} style={{ color: (visit as any)[k] ? "var(--status-success-fg)" : "var(--text-secondary)", fontSize: 13 }}>
                  {(visit as any)[k] ? "✓" : "✗"} {l}
                </span>
              ))}
            </span>
            {visit.timetable_plan_reason && (<><span style={detailLabel}>Reason</span><span>{visit.timetable_plan_reason}</span></>)}
          </div>

          <SectionHead label="Topics" />
          <div style={detailGrid}>
            {visit.math_topics_pre && <><span style={detailLabel}>Math (Pre)</span><span>{visit.math_topics_pre}</span></>}
            {visit.math_topics_upper && <><span style={detailLabel}>Math (Upper)</span><span>{visit.math_topics_upper}</span></>}
            {visit.english_topics_pre && <><span style={detailLabel}>English (Pre)</span><span>{visit.english_topics_pre}</span></>}
            {visit.english_topics_upper && <><span style={detailLabel}>English (Upper)</span><span>{visit.english_topics_upper}</span></>}
          </div>

          <SectionHead label="Time Slots" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[
              [visit.timeslot_bal_sabha, "Bal Sabha"],
              [visit.timeslot_sports, "Sports"],
              [visit.timeslot_yoga, "Yoga"],
              [visit.timeslot_value_ed, "Value Ed"],
              [visit.timeslot_gk_map, "GK/Map"],
            ].map(([val, name]) => (
              <span key={name as string} style={{ padding: "3px 10px", borderRadius: 12, fontSize: "0.78rem", background: val ? "var(--status-success-bg)" : "var(--bg-input)", color: val ? "var(--status-success-fg)" : "var(--text-secondary)", border: "1px solid var(--border)" }}>
                {val ? "✓" : "✗"} {name}
              </span>
            ))}
          </div>

          <SectionHead label="Workbook & Books" />
          <div style={detailGrid}>
            <span style={detailLabel}>Workbook %</span><span>{visit.workbook_percentage}%</span>
            <span style={detailLabel}>Workbook Status</span><span>{visit.workbook_completion}</span>
            <span style={detailLabel}>Book Availability</span><span>{visit.book_availability}</span>
          </div>

          <SectionHead label="Registers" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[
              [visit.reg_admission_forms, "Admission Forms File"],
              [visit.reg_attendance_students, "Student Attendance"],
              [visit.reg_daily_activity, "Daily Activity"],
              [visit.reg_observation, "Observation"],
              [visit.reg_students_data, "Student Alive Data File"],
              [visit.reg_attendance_teachers, "Teacher Attendance"],
              [visit.reg_students_documents, "Student Documents File"],
            ].map(([val, name]) => (
              <span key={name as string} style={{ padding: "3px 10px", borderRadius: 12, fontSize: "0.78rem", background: val ? "var(--badge-blue-bg)" : "var(--bg-input)", color: val ? "var(--badge-blue-fg)" : "var(--text-secondary)", border: "1px solid var(--border)" }}>
                {val ? "✓" : "✗"} {name}
              </span>
            ))}
          </div>

          <SectionHead label="Ratings (1 = Poor, 5 = Excellent)" />
          <div>
            {ratingFields.map(([key, label]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{label}</span>
                <StarRating value={visit[key] as number} readOnly />
              </div>
            ))}
          </div>

          {(visit.grs_prep_remarks || visit.final_remarks) && (
            <>
              <SectionHead label="Remarks" />
              {visit.grs_prep_remarks && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: 3 }}>GRS Preparation</div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>{visit.grs_prep_remarks}</div>
                </div>
              )}
              {visit.final_remarks && (
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: 3 }}>Final Remarks</div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>{visit.final_remarks}</div>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {isAdmin && (
            <button onClick={handleDelete} disabled={deleting} style={grs.btnDanger}>
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
          <button onClick={onEdit} style={grs.btnPrimary}>Edit</button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VisitsPage() {
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
  const qc = useQueryClient();

  const [filterKutir, setFilterKutir] = useState<number | "">("");
  const [filterDistrict, setFilterDistrict] = useState<number | "">("");
  const [filterCluster, setFilterCluster] = useState<number | "">("");
  const [showAdd, setShowAdd] = useState(false);
  const [viewVisit, setViewVisit] = useState<KutirVisit | null>(null);
  const [editVisit, setEditVisit] = useState<KutirVisit | null>(null);

  const { data: kutirs = [] } = useQuery<Kutir[]>({
    queryKey: ["kutirs"],
    queryFn: async () => (await api.get("/kutirs", { params: { limit: 500 } })).data,
  });
  const kutirMap = useMemo(() => new Map(kutirs.map((k) => [k.id, k])), [kutirs]);

  const { data: allDistricts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { data: allAreas = [] } = useQuery({ queryKey: ["all-areas"], queryFn: () => listAreas() });
  const { data: allClusters = [] } = useQuery({ queryKey: ["all-clusters"], queryFn: () => listClusters() });

  const areaMap    = useMemo(() => new Map(allAreas.map(a => [a.id, a])),    [allAreas]);
  const clusterMap = useMemo(() => new Map(allClusters.map(c => [c.id, c])), [allClusters]);
  const filterClusters = useMemo(
    () => allClusters.filter(c => filterDistrict === "" || areaMap.get(c.area_id)?.district_id === filterDistrict),
    [allClusters, filterDistrict, areaMap]
  );

  const { data: visits = [], isLoading } = useQuery<KutirVisit[]>({
    queryKey: ["visits", filterKutir],
    queryFn: () => listVisits(filterKutir ? { kutir_id: Number(filterKutir) } : {}),
  });

  function refresh() { qc.invalidateQueries({ queryKey: ["visits"] }); }

  const deleteMut = useMutation({
    mutationFn: deleteVisit,
    onSuccess: refresh,
  });

  // Geo filter — kutir-name search is handled by GrsTable's searchFn
  const filtered = useMemo(() => visits.filter(v => {
    const kutir = kutirMap.get(v.kutir_id);
    if (filterCluster !== "") {
      if (!kutir || kutir.cluster_id !== filterCluster) return false;
    } else if (filterDistrict !== "") {
      if (!kutir) return false;
      const cl = clusterMap.get(kutir.cluster_id);
      if (!cl) return false;
      const ar = areaMap.get((cl as any).area_id);
      if (!ar || (ar as any).district_id !== filterDistrict) return false;
    }
    return true;
  }), [visits, filterKutir, filterCluster, filterDistrict, kutirMap, clusterMap, areaMap]);

  // Pre-sort by date desc so default view is most-recent-first
  const data = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()),
    [filtered]
  );

  const allColumns = useMemo<Col<KutirVisit>[]>(() => [
    {
      key: "visit_date",
      label: "Date",
      sortable: true,
      render: v => new Date(v.visit_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    },
    {
      key: "kutir_id",
      label: "Kutir",
      sortable: true,
      sortValue: v => kutirMap.get(v.kutir_id)?.name ?? "",
      csvValue: v => kutirMap.get(v.kutir_id)?.name ?? String(v.kutir_id),
      render: v => {
        const kutir = kutirMap.get(v.kutir_id);
        return (
          <>
            <span style={{ fontWeight: 600, color: "var(--badge-blue-fg)" }}>{kutir?.name ?? `#${v.kutir_id}`}</span>
            {kutir && <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginLeft: 6 }}>{kutir.code}</span>}
          </>
        );
      },
    },
    {
      key: "avg_attendance_morning" as keyof KutirVisit,
      label: "Attendance M/E",
      sortable: false,
      render: (v: KutirVisit) => {
        const m = v.avg_attendance_morning ?? "—";
        const e = v.avg_attendance_evening ?? "—";
        return <span>{m} / {e}</span>;
      },
      csvValue: v => `${v.avg_attendance_morning ?? ""}/${v.avg_attendance_evening ?? ""}`,
    },
    {
      key: "regular_students_morning" as keyof KutirVisit,
      label: "Regular Students M/E",
      sortable: false,
      render: (v: KutirVisit) => {
        const m = v.regular_students_morning ?? "—";
        const e = v.regular_students_evening ?? "—";
        return <span>{m} / {e}</span>;
      },
      csvValue: v => `${v.regular_students_morning ?? ""}/${v.regular_students_evening ?? ""}`,
    },
    {
      key: "physical_vs_registered",
      label: "Physical vs Registered",
      sortable: true,
      render: v => (
        <span style={{
          background: v.physical_vs_registered === "Matched" ? "var(--status-success-bg)" : "var(--status-danger-bg)",
          color: v.physical_vs_registered === "Matched" ? "var(--status-success-fg)" : "var(--status-danger-fg)",
          borderRadius: 4, padding: "2px 8px", fontSize: "0.78rem",
        }}>{v.physical_vs_registered}</span>
      ),
    },
    {
      key: "follow_timetable",
      label: "Follows Timetable",
      sortable: true,
      render: v => <span style={{ color: v.follow_timetable ? "var(--status-success-fg)" : "var(--status-danger-fg)" }}>{v.follow_timetable ? "✓ Yes" : "✗ No"}</span>,
      csvValue: v => v.follow_timetable ? "Yes" : "No",
    },
    {
      key: "follow_monthly_plan",
      label: "Follows Monthly Teaching Plan",
      sortable: true,
      render: v => <span style={{ color: v.follow_monthly_plan ? "var(--status-success-fg)" : "var(--status-danger-fg)" }}>{v.follow_monthly_plan ? "✓ Yes" : "✗ No"}</span>,
      csvValue: v => v.follow_monthly_plan ? "Yes" : "No",
    },
    {
      key: "timeslot_utilization",
      label: "Timeslots",
      sortable: true,
      render: v => (
        <span style={{
          background: v.timeslot_utilization ? "var(--status-success-bg)" : "var(--status-danger-bg)",
          color: v.timeslot_utilization ? "var(--status-success-fg)" : "var(--status-danger-fg)",
          borderRadius: 4, padding: "2px 8px", fontSize: "0.78rem",
        }}>
          {v.timeslot_utilization ? "On Track" : "Missed"}
        </span>
      ),
      csvValue: v => v.timeslot_utilization ? "On Track" : "Missed",
    },
    {
      key: "workbook_percentage",
      label: "Workbook %",
      sortable: true,
      render: v => (
        <>
          <span style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>{v.workbook_percentage}%</span>
          <span style={{ marginLeft: 6, fontSize: "0.75rem", color: workbookColor(v.workbook_completion) }}>
            {v.workbook_completion === "Upto Date" ? "✓" : v.workbook_completion === "Partial Upto Date" ? "~" : "✗"}
          </span>
        </>
      ),
      csvValue: v => `${v.workbook_percentage}% (${v.workbook_completion ?? ""})`,
    },
    {
      key: "workbook_completion",
      label: "Workbook Completion",
      sortable: true,
    },
    {
      key: "book_availability",
      label: "Book Availability",
      sortable: true,
    },
    {
      key: "kutir_performance",
      label: "Performance",
      sortable: true,
      render: v => <StarRating value={v.kutir_performance} readOnly />,
    },
    {
      key: "staff_behavior",
      label: "Staff Behavior",
      sortable: true,
      render: v => <StarRating value={v.staff_behavior ?? 0} readOnly />,
    },
    {
      key: "cleanliness",
      label: "Cleanliness",
      sortable: true,
      render: v => <StarRating value={v.cleanliness} readOnly />,
    },
    {
      key: "hindi_proficiency",
      label: "Hindi",
      sortable: true,
      render: v => <StarRating value={v.hindi_proficiency} readOnly />,
    },
    {
      key: "english_proficiency",
      label: "English",
      sortable: true,
      render: v => <StarRating value={v.english_proficiency} readOnly />,
    },
    {
      key: "maths_proficiency",
      label: "Maths",
      sortable: true,
      render: v => <StarRating value={v.maths_proficiency} readOnly />,
    },
    {
      key: "evs_proficiency",
      label: "EVS",
      sortable: true,
      render: v => <StarRating value={v.evs_proficiency} readOnly />,
    },
    {
      key: "reasoning_proficiency",
      label: "Reasoning",
      sortable: true,
      render: v => <StarRating value={v.reasoning_proficiency} readOnly />,
    },
    {
      key: "material_management",
      label: "Material Mgmt",
      sortable: true,
      render: v => <StarRating value={v.material_management} readOnly />,
    },
    {
      key: "grs_prep_remarks",
      label: "GRS Prep Remarks",
      sortable: false,
      render: v => <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{v.grs_prep_remarks ?? "—"}</span>,
    },
    {
      key: "final_remarks",
      label: "Final Remarks",
      sortable: false,
      render: v => <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{v.final_remarks ?? "—"}</span>,
    },
    {
      key: "visit_photo",
      label: "Photo",
      csvValue: v => v.visit_photo ? `${MEDIA_BASE}/media/${v.visit_photo}` : "",
      render: v => v.visit_photo ? (
        <img src={`${MEDIA_BASE}/media/${v.visit_photo}`} alt="Visit photo" style={{ width: 56, height: 42, objectFit: "cover", borderRadius: 4, display: "block" }} />
      ) : (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>—</span>
      ),
    },
  ], [kutirMap]);

  const { isVisible, orderedMetas } = useFieldConfig("visits", VISITS_FIELDS);
  const columns = useMemo(() => {
    const colByKey = new Map(allColumns.map(c => [c.key, c]));
    return orderedMetas
      .filter(m => isVisible(m.key))
      .map(m => colByKey.get(m.key))
      .filter((c): c is NonNullable<typeof c> => c != null);
  }, [allColumns, orderedMetas, isVisible]);

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      <GrsTable<KutirVisit>
        title="Kutir Visits"
        subtitle="Field visit records and observations"
        columns={columns}
        data={data}
        rowKey={v => v.id}
        isLoading={isLoading}
        emptyMessage="No visits recorded yet."
        searchable
        searchPlaceholder="Search by kutir name…"
        searchFn={(v, q) => (kutirMap.get(v.kutir_id)?.name ?? "").toLowerCase().includes(q)}
        filters={<>
          <select value={filterKutir} onChange={e => setFilterKutir(e.target.value === "" ? "" : Number(e.target.value))} style={grs.filterSelect}>
            <option value="">All Kutirs</option>
            {kutirs.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
          <select value={filterDistrict} onChange={e => { setFilterDistrict(e.target.value === "" ? "" : Number(e.target.value)); setFilterCluster(""); }} style={grs.filterSelect}>
            <option value="">All Districts</option>
            {allDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={filterCluster} onChange={e => setFilterCluster(e.target.value === "" ? "" : Number(e.target.value))} disabled={filterDistrict === ""} style={grs.filterSelect}>
            <option value="">All Clusters</option>
            {filterClusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </>}
        headerExtra={isAdmin ? (
          <a href="/admin/field-config?table=visits" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8125rem", color: "var(--text-secondary)", textDecoration: "none", padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <span>Columns</span>
          </a>
        ) : undefined}
        exportFilename="visits"
        printTitle="Kutir Visits"
        onAdd={() => setShowAdd(true)}
        addLabel="+ Log Visit"
        actions={v => ({
          onView: () => setViewVisit(v),
          onEdit: () => setEditVisit(v),
          onDelete: () => {
            if (confirm(`Delete visit for ${kutirMap.get(v.kutir_id)?.name ?? "this kutir"} on ${v.visit_date}?`))
              deleteMut.mutate(v.id);
          },
        })}
      />

      {showAdd && (
        <VisitModal initial={{ ...BLANK_VISIT }} kutirs={kutirs} onClose={() => setShowAdd(false)} onSaved={refresh} />
      )}

      {viewVisit && !editVisit && (
        <VisitDetailDrawer
          visit={viewVisit}
          kutirName={kutirMap.get(viewVisit.kutir_id)?.name ?? `Kutir #${viewVisit.kutir_id}`}
          onClose={() => setViewVisit(null)}
          onEdit={() => setEditVisit(viewVisit)}
          onDelete={refresh}
          isAdmin={isAdmin}
        />
      )}

      {editVisit && (
        <VisitModal
          initial={{ ...editVisit }}
          kutirs={kutirs}
          onClose={() => { setEditVisit(null); setViewVisit(null); }}
          onSaved={() => { refresh(); setViewVisit(null); }}
        />
      )}
    </div>
  );
}

// ── Layout constants (used by VisitDetailDrawer) ──────────────────────────────
const detailGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "140px 1fr",
  gap: "6px 12px",
  fontSize: "0.875rem",
  color: "var(--text-primary)",
};

const detailLabel: React.CSSProperties = {
  color: "var(--text-secondary)",
  fontWeight: 600,
};
