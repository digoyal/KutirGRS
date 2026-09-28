import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import { BLANK_VISIT, createVisit, uploadVisitPhoto } from "../api/visits";
import type { KutirVisitCreate } from "../api/visits";
import { useAuth } from "../context/AuthContext";
import { listDistricts, listAreas, listClusters } from "../api/geo";
import { grs } from "../styles/grs";

interface Kutir { id: number; name: string; code: string; cluster_id: number; }

// ── Helpers ───────────────────────────────────────────────────────────────────
function SectionHead({ label }: { label: string }) {
  return (
    <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--link-color)", borderBottom: "2px solid var(--badge-blue-bg)", paddingBottom: 5, marginBottom: 12, marginTop: 22, textAlign: "left" }}>
      {label}
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void; }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: "0.875rem", padding: "4px 0", color: "var(--text-primary)", textAlign: "left" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 15, height: 15, cursor: "pointer" }} />
      {label}
    </label>
  );
}

function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void; }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>{label}</span>
      <span style={{ display: "inline-flex", gap: 2 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} onClick={() => onChange(n)} style={{ fontSize: "1.2rem", cursor: "pointer", color: n <= value ? "var(--star-active)" : "var(--star-inactive)" }}>★</span>
        ))}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VisitAddPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState<KutirVisitCreate>({ ...BLANK_VISIT });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterDistrict, setFilterDistrict] = useState<number | "">("");
  const [filterCluster, setFilterCluster] = useState<number | "">("");

  const { data: kutirs = [] } = useQuery<Kutir[]>({
    queryKey: ["kutirs"],
    queryFn: async () => (await api.get("/kutirs", { params: { limit: 500 } })).data,
  });
  const { data: allDistricts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { data: allAreas = [] } = useQuery({ queryKey: ["all-areas"], queryFn: () => listAreas() });
  const { data: allClusters = [] } = useQuery({ queryKey: ["all-clusters"], queryFn: () => listClusters() });

  const isModalAdmin = user?.title === "Admin";
  const scopedModalDistricts = isModalAdmin || !user ? allDistricts : allDistricts.filter((d: any) => user.district_ids.includes(d.id));
  const scopedModalClusters = isModalAdmin || !user ? allClusters : user.cluster_ids.length > 0 ? allClusters.filter((c: any) => user.cluster_ids.includes(c.id)) : allClusters;

  const areaMap = new Map(allAreas.map((a: any) => [a.id, a]));

  const modalFilterClusters = scopedModalClusters.filter((c: any) =>
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

  // Auto-select district/cluster when only one option
  useEffect(() => {
    if (scopedModalDistricts.length === 1 && filterDistrict === "") {
      const d = scopedModalDistricts[0].id;
      setFilterDistrict(d);
      const cls = scopedModalClusters.filter((c: any) => (areaMap.get(c.area_id) as any)?.district_id === d);
      if (cls.length === 1) setFilterCluster(cls[0].id);
    }
  }, [scopedModalDistricts.length, scopedModalClusters.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (filterDistrict === "") return;
    const cls = modalFilterClusters;
    if (cls.length === 1 && filterCluster === "") setFilterCluster(cls[0].id);
  }, [filterDistrict]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof KutirVisitCreate>(key: K, val: KutirVisitCreate[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    if (!form.kutir_id) { setError("Please select a kutir."); return; }
    setSaving(true);
    setError(null);
    try {
      const saved = await createVisit(form);
      if (photoFile) await uploadVisitPhoto(saved.id, photoFile);
      navigate(-1);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const disabledInpStyle = { ...grs.input, background: "var(--bg-input)", color: "var(--text-secondary)", cursor: "not-allowed" as const };
  const allChecked = form.timeslot_bal_sabha && form.timeslot_sports && form.timeslot_yoga && form.timeslot_value_ed && form.timeslot_gk_map;

  return (
    <div className="grs-page" style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "1.1rem", padding: 0 }}>←</button>
        <h2 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>Log New Visit</h2>
      </div>

      <div style={{ background: "var(--bg-card)", borderRadius: 8, padding: "16px 20px", border: "1px solid var(--border)" }}>
        {error && <div style={grs.errorBox}>{error}</div>}

        <SectionHead label="Visit Info" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div>
            <label style={grs.fieldLabel}>District</label>
            <select value={filterDistrict} onChange={(e) => { setFilterDistrict(e.target.value === "" ? "" : Number(e.target.value)); setFilterCluster(""); set("kutir_id", 0); }} style={grs.select}>
              <option value="">— Select District —</option>
              {scopedModalDistricts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label style={grs.fieldLabel}>Cluster</label>
            <select value={filterCluster} onChange={(e) => { setFilterCluster(e.target.value === "" ? "" : Number(e.target.value)); set("kutir_id", 0); }} disabled={filterDistrict === ""} style={filterDistrict === "" ? disabledInpStyle : grs.select}>
              <option value="">— Select Cluster —</option>
              {modalFilterClusters.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={grs.fieldLabel}>Kutir *</label>
            <select value={form.kutir_id || ""} onChange={(e) => set("kutir_id", Number(e.target.value))} style={grs.select}>
              <option value="">Select kutir…</option>
              {filteredKutirs.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 10 }}>
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

        {/* 2×2 attendance grid */}
        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr", gap: "6px 10px", alignItems: "center", marginBottom: 10 }}>
          <div />
          <div style={{ ...grs.fieldLabel, textAlign: "center" as const }}>Avg Last Week Attendance</div>
          <div style={{ ...grs.fieldLabel, textAlign: "center" as const }}>Regular (&gt;8 days) Students</div>
          <div style={{ ...grs.fieldLabel, paddingTop: 2 }}>Morning Shift</div>
          <input type="number" min={0} value={form.avg_attendance_morning ?? ""} onChange={(e) => set("avg_attendance_morning", e.target.value === "" ? null : Number(e.target.value))} style={grs.input} placeholder="0" />
          <input type="number" min={0} value={form.regular_students_morning ?? ""} onChange={(e) => set("regular_students_morning", e.target.value === "" ? null : Number(e.target.value))} style={grs.input} placeholder="—" />
          <div style={{ ...grs.fieldLabel, paddingTop: 2 }}>Evening Shift</div>
          <input type="number" min={0} value={form.avg_attendance_evening ?? ""} onChange={(e) => set("avg_attendance_evening", e.target.value === "" ? null : Number(e.target.value))} style={grs.input} placeholder="0" />
          <input type="number" min={0} value={form.regular_students_evening ?? ""} onChange={(e) => set("regular_students_evening", e.target.value === "" ? null : Number(e.target.value))} style={grs.input} placeholder="—" />
        </div>

        {form.kutir_closed && (
          <div style={{ padding: "10px 12px", background: "var(--danger-bg, #fef2f2)", border: "1px solid var(--danger-border, #fca5a5)", borderRadius: 6, color: "var(--danger, #dc2626)", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
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
            <div><label style={grs.fieldLabel}>Math Topics (Pre)</label><textarea value={form.math_topics_pre ?? ""} onChange={(e) => set("math_topics_pre", e.target.value || null)} rows={2} style={{ ...grs.input, resize: "vertical" }} /></div>
            <div><label style={grs.fieldLabel}>Math Topics (Upper)</label><textarea value={form.math_topics_upper ?? ""} onChange={(e) => set("math_topics_upper", e.target.value || null)} rows={2} style={{ ...grs.input, resize: "vertical" }} /></div>
            <div><label style={grs.fieldLabel}>English Topics (Pre)</label><textarea value={form.english_topics_pre ?? ""} onChange={(e) => set("english_topics_pre", e.target.value || null)} rows={2} style={{ ...grs.input, resize: "vertical" }} /></div>
            <div><label style={grs.fieldLabel}>English Topics (Upper)</label><textarea value={form.english_topics_upper ?? ""} onChange={(e) => set("english_topics_upper", e.target.value || null)} rows={2} style={{ ...grs.input, resize: "vertical" }} /></div>
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
          <div style={{ marginTop: 10 }}>
            <label style={{ ...grs.fieldLabel, color: allChecked ? "var(--text-secondary)" : undefined }}>If any of them not checked, provide a reason</label>
            <textarea value={form.timeslot_reason ?? ""} onChange={(e) => set("timeslot_reason", e.target.value || null)} rows={2} disabled={allChecked} style={allChecked ? disabledInpStyle : { ...grs.input, resize: "vertical" }} />
          </div>

          <SectionHead label="Registers & Materials" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={grs.fieldLabel}>App vs. Registered Students</label>
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
            {([
              ["reg_admission_forms", "Admission Forms File"],
              ["reg_attendance_students", "Students Attendance Register"],
              ["reg_daily_activity", "Daily Activity Register"],
              ["reg_observation", "Observation Register"],
              ["reg_students_data", "Student Alive Data File"],
              ["reg_attendance_teachers", "Teachers Attendance Register"],
              ["reg_students_documents", "Student Documents File"],
            ] as [keyof KutirVisitCreate, string][]).map(([key, label]) => (
              <CheckRow key={key} label={label} checked={!!form[key]} onChange={(v) => set(key, v as any)} />
            ))}
          </div>

          <SectionHead label="Ratings (1 = Poor, 5 = Excellent)" />
          <div>
            {([
              ["cleanliness", "Cleanliness"],
              ["hindi_proficiency", "Hindi Proficiency"],
              ["english_proficiency", "English Proficiency"],
              ["maths_proficiency", "Math Proficiency"],
              ["evs_proficiency", "EVS Proficiency (class 5 only)"],
              ["reasoning_proficiency", "Reasoning Proficiency (class 5 only)"],
              ["material_management", "Material Management"],
              ["staff_behavior", "Kutir Staff Behavior"],
              ["kutir_performance", "Kutir Performance"],
            ] as [keyof KutirVisitCreate, string][]).map(([key, label]) => (
              <RatingRow key={key} label={label} value={(form[key] as number) ?? 3} onChange={(v) => set(key, v as any)} />
            ))}
          </div>

          <SectionHead label="Remarks & Photo" />
          <div>
            <label style={grs.fieldLabel}>GRS Preparation Remarks</label>
            <textarea value={form.grs_prep_remarks ?? ""} onChange={(e) => set("grs_prep_remarks", e.target.value || null)} rows={2} style={{ ...grs.input, resize: "vertical" }} />
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={grs.fieldLabel}>Final Remarks</label>
            <textarea value={form.final_remarks ?? ""} onChange={(e) => set("final_remarks", e.target.value || null)} rows={3} style={{ ...grs.input, resize: "vertical" }} />
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={grs.fieldLabel}>Visit Photo</label>
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} style={{ fontSize: "0.85rem" }} />
            {photoFile && (
              <div style={{ marginTop: 8 }}>
                <img src={URL.createObjectURL(photoFile)} alt="Preview" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 6 }} />
              </div>
            )}
          </div>
        </fieldset>

        <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => navigate(-1)} style={grs.btnSecondary} disabled={saving}>Cancel</button>
          <button onClick={handleSave} style={grs.btnPrimary} disabled={saving}>{saving ? "Saving…" : "Log Visit"}</button>
        </div>
      </div>
    </div>
  );
}
