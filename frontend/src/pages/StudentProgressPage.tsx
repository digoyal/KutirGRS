import React from "react";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import {
  listProgressPaged,
  createProgress,
  updateProgress,
  deleteProgress,
  listExams,
  type StudentExam,
  type StudentProgress,
  type StudentProgressCreate,
  type ProgressStatus,
} from "../api/admissions";
import { listSchools, type School } from "../api/schools";
import { listKutirs } from "../api/kutirs";
import { listStudents } from "../api/students";
import { listDistricts, listAreas, listClusters } from "../api/geo";
import { useAuth } from "../context/AuthContext";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";
import { grs } from "../styles/grs";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { PROGRESS_FIELDS } from "../constants/progressFields";

const CURRENT_YEAR = new Date().getFullYear();

const STATUS_LABELS: Record<ProgressStatus, string> = {
  enrolled:    "Enrolled",
  transferred: "Transferred",
  dropped_out: "Dropped out",
  graduated:   "Graduated",
};


const STATUS_BADGES: Record<ProgressStatus, { bg: string; fg: string; prefix: string }> = {
  enrolled:    { bg: "var(--status-success-bg)", fg: "var(--status-success-fg)", prefix: "✓ " },
  transferred: { bg: "var(--badge-blue-bg)",     fg: "var(--badge-blue-fg)",     prefix: "→ " },
  dropped_out: { bg: "var(--status-danger-bg)",  fg: "var(--status-danger-fg)",  prefix: "" },
  graduated:   { bg: "var(--badge-green-bg, #d1fae5)", fg: "var(--badge-green-fg, #065f46)", prefix: "🎓 " },
};
interface StudentMin {
  id: number;
  first_name: string;
  last_name: string;
  kutir_id: number | null;
  father_name?: string | null;
}

function ProgressModal({
  initial,
  schools,
  latestSchoolMap = {},
  admittedSchoolMap = {},
  allDistricts = [],
  allAreas = [],
  allClusters = [],
  allKutirs = [],
  onClose,
  onSaved,
  readOnly = false,
  onEdit,
}: {
  initial: StudentProgressCreate & { id?: number };
  schools: School[];
  latestSchoolMap?: Record<number, number>;
  admittedSchoolMap?: Record<number, number>;
  allDistricts?: Array<{ id: number; name: string }>;
  allAreas?: Array<{ id: number; name: string; district_id: number }>;
  allClusters?: Array<{ id: number; name: string; area_id: number }>;
  allKutirs?: Array<{ id: number; cluster_id: number }>;
  onClose: () => void;
  onSaved: () => void;
  readOnly?: boolean;
  onEdit?: () => void;
}) {
  const isEdit = !!initial.id;
  const [form, setForm] = useState<StudentProgressCreate & { id?: number }>(initial);
  const [search, setSearch] = useState((initial as any)._studentName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalDistrict, setModalDistrict] = useState<number | "">("");
  const [modalCluster, setModalCluster] = useState<number | "">("");

  const kutirMap2 = useMemo(() => new Map(allKutirs.map(k => [k.id, k.cluster_id])), [allKutirs]);
  const clusterAreaMap = useMemo(() => new Map(allClusters.map(c => [c.id, c.area_id])), [allClusters]);
  const areaDistrictMap = useMemo(() => new Map(allAreas.map(a => [a.id, a.district_id])), [allAreas]);
  const modalClusters = useMemo(
    () => allClusters.filter(c => modalDistrict === "" || areaDistrictMap.get(clusterAreaMap.get(c.id) ?? -1) === modalDistrict),
    [allClusters, modalDistrict, areaDistrictMap, clusterAreaMap],
  );

  const { data: rawStudents = [] } = useQuery<StudentMin[]>({
    queryKey: ["students-search", search],
    queryFn: async () =>
      (await api.get("/students", { params: { search, name_only: true, limit: 100 } })).data,
    enabled: !isEdit && search.length >= 2,
  });
  const students = useMemo(() => {
    if (modalCluster !== "") {
      return rawStudents.filter(s => s.kutir_id != null && kutirMap2.get(s.kutir_id) === modalCluster);
    }
    if (modalDistrict !== "") {
      return rawStudents.filter(s => {
        if (s.kutir_id == null) return false;
        const cid = kutirMap2.get(s.kutir_id);
        if (cid == null) return false;
        const aid = clusterAreaMap.get(cid);
        if (aid == null) return false;
        return areaDistrictMap.get(aid) === modalDistrict;
      });
    }
    return rawStudents.slice(0, 20);
  }, [rawStudents, modalDistrict, modalCluster, kutirMap2, clusterAreaMap, areaDistrictMap]);

  function set<K extends keyof StudentProgressCreate>(key: K, val: StudentProgressCreate[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.student_id) { setError("Select a student."); return; }
    if (!form.school_id) { setError("Select a school."); return; }
    setSaving(true);
    setError(null);
    try {
      const { id, ...payload } = form;
      if (isEdit) {
        await updateProgress(id!, payload);
      } else {
        await createProgress(payload);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const currentStatus = (form.status || "enrolled") as ProgressStatus;

  const fieldNodes: { key: string; node: React.ReactNode }[] = [
    ...(!readOnly && !isEdit ? [{
      key: "geo_filter",
      node: (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 3 }}>District</label>
            <select style={inp} value={modalDistrict} onChange={e => { setModalDistrict(e.target.value === "" ? "" : Number(e.target.value)); setModalCluster(""); }}>
              <option value="">All Districts</option>
              {allDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 3 }}>Cluster</label>
            <select style={inp} value={modalCluster} onChange={e => setModalCluster(e.target.value === "" ? "" : Number(e.target.value))} disabled={modalDistrict === ""}>
              <option value="">All Clusters</option>
              {modalClusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      ),
    }] : []),
    {
      key: "student",
      node: (readOnly || isEdit) ? (
        <Row label="Student">
          <div style={{ ...inp, background: "var(--bg-input)", color: readOnly ? "var(--text-primary)" : "var(--text-secondary)", opacity: readOnly ? 1 : 0.7 }}>
            {search || "—"}
          </div>
        </Row>
      ) : (
        <Row label="Student *">
          <input
            style={inp}
            placeholder="Type name to search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {students.length > 0 && (
            <div style={{ border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 6px 6px", maxHeight: 160, overflowY: "auto" }}>
              {students.map((s) => (
                <div
                  key={s.id}
                  onClick={() => { set("student_id", s.id); setSearch(`${s.first_name} ${s.last_name}`); const school = admittedSchoolMap[s.id] ?? latestSchoolMap[s.id]; if (school) set("school_id", school); }}
                  style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.875rem", background: form.student_id === s.id ? "var(--badge-blue-bg)" : "var(--bg-card)" }}
                >
                  <span>{s.first_name} {s.last_name}</span>
                </div>
              ))}
            </div>
          )}
        </Row>
      ),
    },
    {
      key: "class_in_year",
      node: (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 3 }}>Year</label>
            {readOnly ? (
              <div style={inp}>{form.academic_year}-{String(form.academic_year + 1).slice(2)}</div>
            ) : (
              <select style={inp} value={form.academic_year} onChange={(e) => set("academic_year", Number(e.target.value))}>
                {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map(y => (
                  <option key={y} value={y}>{y}-{String(y + 1).slice(2)}</option>
                ))}
              </select>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 3 }}>Class *</label>
            {readOnly ? (
              <div style={inp}>{form.class_in_year != null ? `Class ${form.class_in_year}` : "—"}</div>
            ) : (
              <select style={inp} value={form.class_in_year ?? ""} onChange={(e) => set("class_in_year", e.target.value === "" ? null : Number(e.target.value))}>
                <option value="">— select —</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "school_id",
      node: (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 3 }}>School</label>
            {readOnly ? (
              <div style={inp}>{schools.find(s => s.id === form.school_id)?.name ?? "—"}</div>
            ) : (
              <select style={inp} value={form.school_id || ""} onChange={(e) => set("school_id", Number(e.target.value))}>
                <option value="">— select —</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.school_type})</option>
                ))}
              </select>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 3 }}>Marks %</label>
            {readOnly ? (
              <div style={inp}>{form.previous_year_percentage != null ? `${parseFloat(String(form.previous_year_percentage)).toFixed(1)}%` : "—"}</div>
            ) : (
              <input type="number" min={0} max={100} step={0.1} style={inp}
                value={form.previous_year_percentage ?? ""}
                onChange={(e) => set("previous_year_percentage", e.target.value === "" ? null : Number(e.target.value))}
              />
            )}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      node: (
        <>
          <Row label="Status">
            {readOnly ? (
              <div style={inp}>{STATUS_LABELS[currentStatus]}</div>
            ) : (
              <select style={inp} value={currentStatus} onChange={(e) => set("status", e.target.value as ProgressStatus)}>
                <option value="enrolled">Enrolled</option>
                <option value="transferred">Transferred to a different school</option>
                <option value="dropped_out">Dropped out</option>
                <option value="graduated">Graduated</option>
              </select>
            )}
          </Row>
          {currentStatus === "transferred" && (
            <Row label="School Name">
              {readOnly ? (
                <div style={inp}>{form.transfer_school ?? "—"}</div>
              ) : (
                <input style={inp} placeholder="Name of school transferred to"
                  value={form.transfer_school ?? ""}
                  onChange={(e) => set("transfer_school", e.target.value || null)}
                />
              )}
            </Row>
          )}
          {currentStatus === "dropped_out" && (
            <Row label="Reason">
              {readOnly ? (
                <div style={inp}>{form.exit_reason ?? "—"}</div>
              ) : (
                <input style={inp} placeholder="Reason for dropping out"
                  value={form.exit_reason ?? ""}
                  onChange={(e) => set("exit_reason", e.target.value || null)}
                />
              )}
            </Row>
          )}
        </>
      ),
    },
    {
      key: "remarks",
      node: (
        <Row label="Remarks">
          {readOnly ? (
            <div style={{ ...inp, minHeight: 48, whiteSpace: "pre-wrap" }}>{form.remarks ?? "—"}</div>
          ) : (
            <textarea style={{ ...inp, resize: "vertical" }} rows={2}
              value={form.remarks ?? ""}
              onChange={(e) => set("remarks", e.target.value || null)}
            />
          )}
        </Row>
      ),
    },
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "var(--bg-card)", borderRadius: 10, padding: 24, width: 440, maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <h3 style={{ margin: "0 0 16px", color: "var(--text-primary)" }}>
          {readOnly ? "Progress Record" : isEdit ? "Edit Progress Record" : "Add Progress Record"}
        </h3>
        {error && <div style={{ background: "var(--status-danger-bg)", border: "1px solid var(--badge-red-fg)", color: "var(--status-danger-fg)", borderRadius: 6, padding: "8px 12px", fontSize: "0.85rem", marginBottom: 12 }}>{error}</div>}
        {fieldNodes.filter(f => f.node != null).map(f => (
          <React.Fragment key={f.key}>{f.node}</React.Fragment>
        ))}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          {readOnly ? (
            <>
              <button onClick={onClose} style={btnSecondary}>Close</button>
              <button onClick={onEdit} style={btnPrimary}>Edit</button>
            </>
          ) : (
            <>
              <button onClick={onClose} style={btnSecondary} disabled={saving}>Cancel</button>
              <button onClick={handleSave} style={btnPrimary} disabled={saving}>
                {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Record"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentProgressPage() {
  const { user } = useAuth();
  const isAdmin = user?.title === "Admin";
  const qc = useQueryClient();

  // Handle bfcache restoration when user navigates back from Columns page
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

  const defaultDistrict: number | "" = (() => {
    if (!user) return "";
    if (user.title === "District Anchor" && user.district_ids.length > 0) return user.district_ids[0];
    return "";
  })();
  const defaultCluster: number | "" = (() => {
    if (!user) return "";
    if (user.title === "Cluster Coordinator" && user.cluster_ids.length > 0) return user.cluster_ids[0];
    return "";
  })();
  const defaultKutir: number | "" = (() => {
    if (!user) return "";
    if (user.title === "Teacher" && user.kutir_ids.length > 0) return user.kutir_ids[0];
    return "";
  })();

  const [filterDistrict, setFilterDistrict] = useState<number | "">(defaultDistrict);
  const [filterCluster, setFilterCluster] = useState<number | "">(defaultCluster);
  const [filterKutir, setFilterKutir] = useState<number | "">(defaultKutir);
  const [filterYear, setFilterYear] = useState(CURRENT_YEAR);
  const [modal, setModal] = useState<(StudentProgressCreate & { id?: number }) | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState<(StudentProgressCreate & { id?: number }) | null>(null);

  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);
  const hasFilter = filterDistrict !== "" || filterCluster !== "" || filterKutir !== "";

  const { isVisible, orderedMetas } = useFieldConfig("progress", PROGRESS_FIELDS);

  const { data: progressPage = { items: [], total: 0 }, isLoading } = useQuery({
    queryKey: ["progress", filterYear, filterDistrict, filterCluster, filterKutir, page],
    queryFn: () => listProgressPaged({
      academic_year: filterYear,
      district_id: filterDistrict !== "" ? filterDistrict : undefined,
      cluster_id: filterCluster !== "" ? filterCluster : undefined,
      kutir_id: filterKutir !== "" ? filterKutir : undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    enabled: hasFilter,
  });
  const progressList = progressPage.items;
  const progressTotal = progressPage.total;

  const { data: schools = [] } = useQuery<School[]>({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
  });
  const { data: allStudents = [] } = useQuery({ queryKey: ["students-names"], queryFn: () => listStudents({ name_only: true }) });
  const { data: allKutirs = [] }   = useQuery({ queryKey: ["all-kutirs"],   queryFn: () => listKutirs() });
  const { data: allDistricts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { data: allAreas = [] }    = useQuery({ queryKey: ["all-areas"],    queryFn: () => listAreas() });
  const { data: allClusters = [] } = useQuery({ queryKey: ["all-clusters"], queryFn: () => listClusters() });
  const { data: allExams = [] } = useQuery<StudentExam[]>({ queryKey: ["all-exams-admitted"], queryFn: () => listExams({ admitted: true }) });

  // Stable map references so columns useMemo deps stay clean
  const studentMap2  = useMemo(() => new Map(allStudents.map(s => [s.id, s])),  [allStudents]);
  const areaMap      = useMemo(() => new Map(allAreas.map(a => [a.id, a])),     [allAreas]);
  const schoolMap    = useMemo(() => new Map(schools.map(s => [s.id, s])),      [schools]);
  const filterClusters = useMemo(
    () => allClusters.filter(c => filterDistrict === "" || areaMap.get(c.area_id)?.district_id === filterDistrict),
    [allClusters, filterDistrict, areaMap],
  );
  const filterKutirs = useMemo(
    () => allKutirs.filter(k => filterCluster !== "" ? k.cluster_id === filterCluster : filterKutir !== "" ? k.id === filterKutir : false),
    [allKutirs, filterCluster, filterKutir],
  );

  // Build latestSchoolMap: for each student, the school from their most recent record
  const latestSchoolMap = useMemo<Record<number, number>>(() => {
    const m: Record<number, number> = {};
    for (const p of [...progressList].sort((a, b) => b.academic_year - a.academic_year)) {
      if (p.student_id && p.school_id && !(p.student_id in m)) {
        m[p.student_id] = p.school_id;
      }
    }
    return m;
  }, [progressList]);
  // Build admittedSchoolMap: for each student, the school from their admitted exam record
  const admittedSchoolMap = useMemo<Record<number, number>>(() => {
    const m: Record<number, number> = {};
    for (const e of allExams) {
      if (e.admitted && e.admitted_school_id && !(e.student_id in m)) {
        m[e.student_id] = e.admitted_school_id;
      }
    }
    return m;
  }, [allExams]);


  const deleteMut = useMutation({
    mutationFn: deleteProgress,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress"] }),
  });
  function refresh() { qc.invalidateQueries({ queryKey: ["progress"] }); }

  // Progress is now filtered server-side; progressList = current page items

  // Columns: built from useFieldConfig order/visibility, with sort + csv + render per key
  const columns = useMemo<Col<StudentProgress>[]>(() =>
    orderedMetas
      .filter(m => isVisible(m.key))
      .map((meta): Col<StudentProgress> => {
        const sortValue = (p: StudentProgress): string | number => {
          switch (meta.key) {
            case "student": { const s = studentMap2.get(p.student_id); return s ? `${s.first_name} ${s.last_name}`.toLowerCase() : ""; }
            case "class_in_year": return p.class_in_year ?? -1;
            case "school_id": return (schoolMap.get(p.school_id)?.name ?? "").toLowerCase();
            case "previous_year_percentage": return p.previous_year_percentage ?? -1;
            case "status": return p.status ?? "";
            case "remarks": return (p.remarks ?? "").toLowerCase();
            default: return "";
          }
        };
        const csvValue = (p: StudentProgress): string => {
          switch (meta.key) {
            case "student": { const s = studentMap2.get(p.student_id); return s ? `${s.first_name} ${s.last_name}` : String(p.student_id); }
            case "class_in_year": return p.class_in_year != null ? `Class ${p.class_in_year}` : "";
            case "school_id": return (p.school ?? schoolMap.get(p.school_id))?.name ?? "";
            case "status": return STATUS_LABELS[p.status as ProgressStatus] ?? p.status;
            case "previous_year_percentage": return p.previous_year_percentage != null ? `${parseFloat(String(p.previous_year_percentage)).toFixed(1)}%` : "";
            case "remarks": return p.remarks ?? "";
            default: return "";
          }
        };
        const render = (p: StudentProgress): React.ReactNode => {
          switch (meta.key) {
            case "student": {
              const s = studentMap2.get(p.student_id);
              return (
                <Link to={`/students/${p.student_id}`} style={{ color: "var(--badge-purple-fg)", textDecoration: "none", fontWeight: 600 }}>
                  {s ? `${s.first_name} ${s.last_name}` : `#${p.student_id}`}
                </Link>
              );
            }
            case "class_in_year":
              return (
                <span style={{ background: "var(--badge-purple-bg)", color: "var(--badge-purple-fg)", borderRadius: 4, padding: "2px 8px", fontSize: "0.8rem", fontWeight: 700 }}>
                  {p.class_in_year != null ? `Class ${p.class_in_year}` : "—"}
                </span>
              );
            case "school_id": {
              const school = p.school ?? schoolMap.get(p.school_id);
              return (
                <div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>{school?.name ?? `School #${p.school_id}`}</div>
                  {school?.school_type && <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{school.school_type}</div>}
                </div>
              );
            }
            case "status": {
              const st = p.status as ProgressStatus;
              const b = STATUS_BADGES[st] ?? STATUS_BADGES.enrolled;
              return (
                <div>
                  <span style={{ background: b.bg, color: b.fg, borderRadius: 4, padding: "2px 8px", fontSize: "0.78rem", fontWeight: 600 }}>
                    {b.prefix}{STATUS_LABELS[st]}
                  </span>
                  {st === "transferred" && p.transfer_school && (
                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2 }}>{p.transfer_school}</div>
                  )}
                  {st === "dropped_out" && p.exit_reason && (
                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2 }}>{p.exit_reason}</div>
                  )}
                </div>
              );
            }
            case "previous_year_percentage":
              return p.previous_year_percentage != null ? (
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {parseFloat(String(p.previous_year_percentage)).toFixed(1)}%
                </span>
              ) : "—";
            case "remarks":
              return <span>{p.remarks ?? "—"}</span>;
            default:
              return null;
          }
        };
        const tdStyle: React.CSSProperties | undefined =
          meta.key === "remarks" ? { maxWidth: 180, fontSize: "0.8rem", color: "var(--text-secondary)" } : undefined;
        return { key: meta.key, label: meta.label, sortable: true, sortValue, csvValue, render, tdStyle };
      }),
  [orderedMetas, isVisible, studentMap2, schoolMap]);

  function openAdd() {
    setModal({
      student_id: 0, school_id: 0, academic_year: filterYear, class_in_year: null,
      status: "enrolled", transfer_school: null, exit_reason: null,
      previous_year_percentage: null, remarks: null,
    });
    setShowModal(true);
  }

  function openEdit(p: StudentProgress) {
    const s = studentMap2.get(p.student_id);
    const name = s ? `${s.first_name} ${s.last_name}` : "";
    setModal({
      id: p.id, student_id: p.student_id, school_id: p.school_id,
      academic_year: p.academic_year, status: p.status ?? "enrolled",
      transfer_school: p.transfer_school ?? null, exit_reason: p.exit_reason ?? null,
      previous_year_percentage: p.previous_year_percentage, remarks: p.remarks,
      class_in_year: p.class_in_year, _studentName: name,
    } as any);
    setShowModal(true);
  }

  function openView(p: StudentProgress) {
    const s = studentMap2.get(p.student_id);
    const name = s ? `${s.first_name} ${s.last_name}` : "";
    setViewModal({
      id: p.id, student_id: p.student_id, school_id: p.school_id,
      academic_year: p.academic_year, status: p.status ?? "enrolled",
      transfer_school: p.transfer_school ?? null, exit_reason: p.exit_reason ?? null,
      previous_year_percentage: p.previous_year_percentage, remarks: p.remarks,
      _studentName: name, class_in_year: p.class_in_year,
    } as any);
  }

  const statusPalette: Record<ProgressStatus, { bg: string; border: string; fg: string }> = {
    enrolled:    { bg: "var(--status-success-bg)", border: "var(--status-success-fg)", fg: "var(--status-success-fg)" },
    transferred: { bg: "var(--badge-blue-bg)",     border: "var(--badge-blue-fg)",     fg: "var(--badge-blue-fg)" },
    dropped_out: { bg: "var(--status-danger-bg)",  border: "var(--badge-red-fg)",      fg: "var(--status-danger-fg)" },
    graduated:   { bg: "var(--badge-green-bg, #d1fae5)", border: "var(--badge-green-fg, #065f46)", fg: "var(--badge-green-fg, #065f46)" },
  };

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      {/* Status summary tiles — counts based on geo/year filter, before search */}
      {progressList.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {(["enrolled", "transferred", "dropped_out", "graduated"] as ProgressStatus[]).map((st) => {
            const count = progressList.filter(p => p.status === st).length;
            if (count === 0) return null;
            const pal = statusPalette[st];
            return (
              <div key={st} style={{ background: pal.bg, border: `1px solid ${pal.border}`, borderRadius: 8, padding: "10px 18px", fontSize: "0.85rem" }}>
                <span style={{ fontWeight: 700, color: pal.fg, fontSize: "1.2rem" }}>{count}</span>
                <span style={{ color: pal.fg, marginLeft: 6 }}>{STATUS_LABELS[st]}</span>
              </div>
            );
          })}
        </div>
      )}

      <GrsTable<StudentProgress>
        title="Student Progress"
        columns={columns}
        data={progressList}
        rowKey={(p) => p.id}
        isLoading={isLoading}
        pagination={hasFilter ? { page, pageSize: PAGE_SIZE, total: progressTotal, onPageChange: setPage } : undefined}
        searchable
        searchPlaceholder="Search by student name…"
        searchFn={(p, q) => {
          const s = studentMap2.get(p.student_id);
          return !!s && `${s.first_name} ${s.last_name}`.toLowerCase().includes(q);
        }}
        emptyMessage={hasFilter ? `No progress records for ${filterYear}-${String(filterYear + 1).slice(2)}.` : "Select a district, cluster, or kutir to view progress."}
        filters={
          <>
            <select style={grs.filterSelect} value={filterYear} onChange={e => { setFilterYear(Number(e.target.value)); setPage(1); }}>
              {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map(y => (
                <option key={y} value={y}>{y}-{String(y + 1).slice(2)}</option>
              ))}
            </select>
            <select style={grs.filterSelect} value={filterDistrict} onChange={e => { setFilterDistrict(e.target.value === "" ? "" : Number(e.target.value)); setFilterCluster(""); setFilterKutir(""); setPage(1); }}>
              <option value="">All Districts</option>
              {allDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select style={grs.filterSelect} value={filterCluster} onChange={e => { setFilterCluster(e.target.value === "" ? "" : Number(e.target.value)); setFilterKutir(""); setPage(1); }} disabled={filterDistrict === "" && filterKutir === ""}>
              <option value="">All Clusters</option>
              {filterClusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {filterCluster !== "" && (
              <select style={grs.filterSelect} value={filterKutir} onChange={e => { setFilterKutir(e.target.value === "" ? "" : Number(e.target.value)); setPage(1); }}>
                <option value="">All Kutirs</option>
                {filterKutirs.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            )}
          </>
        }
        exportFilename="progress"
        printTitle="Student Progress"
        headerExtra={isAdmin ? (
          <a
            href="/admin/field-config?table=progress"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-input)", cursor: "pointer", fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500, textDecoration: "none" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
              <circle cx="4" cy="6" r="2" fill="currentColor"/><circle cx="20" cy="12" r="2" fill="currentColor"/><circle cx="4" cy="18" r="2" fill="currentColor"/>
            </svg>
            <span>Columns</span>
          </a>
        ) : undefined}
        onAdd={openAdd}
        addLabel="+ Add Record"

        actions={(p) => ({
          onView:   () => openView(p),
          onEdit:   () => openEdit(p),
          onDelete: () => { if (confirm("Delete this record?")) deleteMut.mutate(p.id); },
        })}
      />

      {showModal && modal && (
        <ProgressModal
          initial={modal}
          schools={schools}
          latestSchoolMap={latestSchoolMap}
          admittedSchoolMap={admittedSchoolMap}
          allDistricts={allDistricts}
          allAreas={allAreas}
          allClusters={allClusters}
          allKutirs={allKutirs}
          onClose={() => setShowModal(false)}
          onSaved={refresh}
        />
      )}

      {viewModal && (
        <ProgressModal
          initial={viewModal}
          schools={schools}
          onClose={() => setViewModal(null)}
          onSaved={refresh}
          readOnly
          onEdit={() => {
            const v = viewModal;
            setViewModal(null);
            setModal(v);
            setShowModal(true);
          }}
        />
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 3 }}>{label}</label>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", border: "1px solid var(--border)", borderRadius: 6,
  padding: "7px 10px", fontSize: "0.875rem", boxSizing: "border-box",
};
const btnPrimary: React.CSSProperties = {
  background: "var(--badge-purple-fg)", color: "white", border: "none", borderRadius: 6,
  padding: "8px 18px", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600,
};
const btnSecondary: React.CSSProperties = {
  background: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border)",
  borderRadius: 6, padding: "8px 18px", cursor: "pointer", fontSize: "0.875rem",
};
