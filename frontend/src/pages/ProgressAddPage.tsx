import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import {
  createProgress,
  listExams,
  type StudentExam,
  type StudentProgressCreate,
  type ProgressStatus,
} from "../api/admissions";
import { listSchools, type School } from "../api/schools";
import { listKutirs } from "../api/kutirs";
import { listDistricts, listAreas, listClusters } from "../api/geo";
import { useAuth } from "../context/AuthContext";
import { grs } from "../styles/grs";

const CURRENT_YEAR = new Date().getFullYear();

interface StudentMin {
  id: number;
  first_name: string;
  last_name: string;
  kutir_id: number | null;
}

export default function ProgressAddPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.title === "Admin";

  const initialYear = Number(searchParams.get("year") || CURRENT_YEAR);

  const [form, setForm] = useState<StudentProgressCreate>({
    student_id: 0,
    school_id: 0,
    academic_year: initialYear,
    class_in_year: null,
    status: "enrolled",
    transfer_school: null,
    exit_reason: null,
    previous_year_percentage: null,
    remarks: null,
  });
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalDistrict, setModalDistrict] = useState<number | "">("");
  const [modalCluster, setModalCluster] = useState<number | "">("");

  const { data: schools = [] } = useQuery<School[]>({ queryKey: ["schools"], queryFn: () => listSchools() });
  const { data: allKutirs = [] } = useQuery({ queryKey: ["all-kutirs"], queryFn: () => listKutirs() });
  const { data: allDistricts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { data: allAreas = [] } = useQuery({ queryKey: ["all-areas"], queryFn: () => listAreas() });
  const { data: allClusters = [] } = useQuery({ queryKey: ["all-clusters"], queryFn: () => listClusters() });
  const { data: allExams = [] } = useQuery<StudentExam[]>({
    queryKey: ["all-exams-admitted"],
    queryFn: () => listExams({ admitted: true }),
  });

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

  const kutirMap = useMemo(() => new Map(scopedKutirs.map((k: any) => [k.id, k.cluster_id])), [scopedKutirs]);
  const clusterAreaMap = useMemo(() => new Map(allClusters.map((c: any) => [c.id, c.area_id])), [allClusters]);
  const areaDistrictMap = useMemo(() => new Map(allAreas.map((a: any) => [a.id, a.district_id])), [allAreas]);

  const modalClusters = useMemo(
    () => scopedClusters.filter((c: any) => modalDistrict === "" || areaDistrictMap.get(clusterAreaMap.get(c.id) ?? -1) === modalDistrict),
    [scopedClusters, modalDistrict, areaDistrictMap, clusterAreaMap],
  );

  const admittedSchoolMap = useMemo<Record<number, number>>(() => {
    const m: Record<number, number> = {};
    for (const e of allExams) {
      if (e.admitted && e.admitted_school_id && !(e.student_id in m)) {
        m[e.student_id] = e.admitted_school_id;
      }
    }
    return m;
  }, [allExams]);

  // Auto-select district/cluster when scoped to single option
  useEffect(() => {
    if (scopedDistricts.length === 1 && modalDistrict === "") {
      const d = scopedDistricts[0].id;
      setModalDistrict(d);
      const cls = scopedClusters.filter((c: any) => areaDistrictMap.get(clusterAreaMap.get(c.id) ?? -1) === d);
      if (cls.length === 1) setModalCluster(cls[0].id);
    }
  }, [scopedDistricts.length, scopedClusters.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (modalDistrict === "") return;
    const cls = scopedClusters.filter((c: any) => areaDistrictMap.get(clusterAreaMap.get(c.id) ?? -1) === modalDistrict);
    if (cls.length === 1 && modalCluster === "") setModalCluster(cls[0].id);
  }, [modalDistrict]); // eslint-disable-line react-deps

  const { data: rawStudents = [] } = useQuery<StudentMin[]>({
    queryKey: ["students-search", search],
    queryFn: async () =>
      (await api.get("/students", { params: { search, name_only: true, limit: 100 } })).data,
    enabled: search.length >= 2,
  });

  const students = useMemo(() => {
    if (modalCluster !== "") {
      return rawStudents.filter(s => s.kutir_id != null && kutirMap.get(s.kutir_id!) === modalCluster);
    }
    if (modalDistrict !== "") {
      return rawStudents.filter(s => {
        if (s.kutir_id == null) return false;
        const cid = kutirMap.get(s.kutir_id);
        if (cid == null) return false;
        const aid = clusterAreaMap.get(cid);
        if (aid == null) return false;
        return areaDistrictMap.get(aid) === modalDistrict;
      });
    }
    return rawStudents.slice(0, 20);
  }, [rawStudents, modalDistrict, modalCluster, kutirMap, clusterAreaMap, areaDistrictMap]);

  function set<K extends keyof StudentProgressCreate>(key: K, val: StudentProgressCreate[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.student_id) { setError("Select a student."); return; }
    if (!form.school_id) { setError("Select a school."); return; }
    setSaving(true);
    setError(null);
    try {
      await createProgress(form);
      navigate(-1);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Save failed.");
      setSaving(false);
    }
  }

  const currentStatus = (form.status || "enrolled") as ProgressStatus;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 560 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "1.1rem", padding: 0 }}
        >←</button>
        <h2 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>Add Progress Record</h2>
      </div>

      {error && (
        <div style={{ background: "var(--status-danger-bg)", border: "1px solid var(--badge-red-fg)", color: "var(--status-danger-fg)", borderRadius: 6, padding: "8px 12px", fontSize: "0.85rem", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Geo filter for student search */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>District</label>
          <select style={inp} value={modalDistrict}
            onChange={e => { setModalDistrict(e.target.value === "" ? "" : Number(e.target.value)); setModalCluster(""); }}>
            <option value="">— Select District —</option>
            {scopedDistricts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Cluster</label>
          <select style={inp} value={modalCluster}
            onChange={e => setModalCluster(e.target.value === "" ? "" : Number(e.target.value))}
            disabled={modalDistrict === ""}>
            <option value="">— Select Cluster —</option>
            {modalClusters.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Student search */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Student *</label>
        <input style={inp} placeholder="Type name to search…" value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {students.length > 0 && (
          <div style={{ border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 6px 6px", maxHeight: 160, overflowY: "auto" }}>
            {students.map(s => (
              <div key={s.id}
                onClick={() => {
                  set("student_id", s.id);
                  setSearch(`${s.first_name} ${s.last_name}`);
                  const school = admittedSchoolMap[s.id];
                  if (school) set("school_id", school);
                }}
                style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.875rem", background: form.student_id === s.id ? "var(--badge-blue-bg)" : "var(--bg-card)" }}
              >
                {s.first_name} {s.last_name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Year + Class */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Year</label>
          <select style={inp} value={form.academic_year} onChange={e => set("academic_year", Number(e.target.value))}>
            {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map(y => (
              <option key={y} value={y}>{y}-{String(y + 1).slice(2)}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Class *</label>
          <select style={inp} value={form.class_in_year ?? ""} onChange={e => set("class_in_year", e.target.value === "" ? null : Number(e.target.value))}>
            <option value="">— select —</option>
            {[6,7,8,9,10,11,12].map(c => <option key={c} value={c}>Class {c}</option>)}
          </select>
        </div>
      </div>

      {/* School + Marks% */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>School *</label>
          <select style={inp} value={form.school_id || ""} onChange={e => set("school_id", Number(e.target.value))}>
            <option value="">— select —</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name} ({s.school_type})</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Marks %</label>
          <input type="number" min={0} max={100} step={0.1} style={inp}
            value={form.previous_year_percentage ?? ""}
            onChange={e => set("previous_year_percentage", e.target.value === "" ? null : Number(e.target.value))}
          />
        </div>
      </div>

      {/* Status */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Status</label>
        <select style={inp} value={currentStatus} onChange={e => set("status", e.target.value as ProgressStatus)}>
          <option value="enrolled">Enrolled</option>
          <option value="transferred">Transferred to a different school</option>
          <option value="dropped_out">Dropped out</option>
          <option value="graduated">Graduated</option>
        </select>
      </div>

      {currentStatus === "transferred" && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>School Name</label>
          <input style={inp} placeholder="Name of school transferred to"
            value={form.transfer_school ?? ""}
            onChange={e => set("transfer_school", e.target.value || null)}
          />
        </div>
      )}

      {currentStatus === "dropped_out" && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Reason</label>
          <input style={inp} placeholder="Reason for dropping out"
            value={form.exit_reason ?? ""}
            onChange={e => set("exit_reason", e.target.value || null)}
          />
        </div>
      )}

      {/* Remarks */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Remarks</label>
        <textarea style={{ ...inp, resize: "vertical" }} rows={2}
          value={form.remarks ?? ""}
          onChange={e => set("remarks", e.target.value || null)}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button onClick={handleSave} style={grs.btnPrimary} disabled={saving}>
          {saving ? "Saving…" : "Add Record"}
        </button>
        <button onClick={() => navigate(-1)} style={grs.btnSecondary} disabled={saving}>Cancel</button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.75rem", fontWeight: 600,
  color: "var(--text-secondary)", marginBottom: 3,
};

const inp: React.CSSProperties = {
  width: "100%", border: "1px solid var(--border)", borderRadius: 6,
  padding: "7px 10px", fontSize: "0.875rem", boxSizing: "border-box",
  background: "var(--bg-input)", color: "var(--text-primary)",
};
