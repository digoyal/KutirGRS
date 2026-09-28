import React from "react";
import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listProgressPaged,
  deleteProgress,
  type StudentProgress,
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

// ── Filter state persistence ──────────────────────────────────────────────────
const STORAGE_KEY = "progress_filter_state";
const _savedFilters = (() => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    return JSON.parse(raw) as {
      district?: number | "";
      cluster?: number | "";
      kutir?: number | "";
      year?: number;
      page?: number;
    };
  } catch { return null; }
})();

export default function StudentProgressPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const [filterDistrict, setFilterDistrict] = useState<number | "">(_savedFilters?.district ?? defaultDistrict);
  const [filterCluster, setFilterCluster] = useState<number | "">(_savedFilters?.cluster ?? defaultCluster);
  const [filterKutir, setFilterKutir] = useState<number | "">(_savedFilters?.kutir ?? defaultKutir);
  const [filterYear, setFilterYear] = useState(_savedFilters?.year ?? CURRENT_YEAR);

  const PAGE_SIZE = 25;
  const [page, setPage] = useState(_savedFilters?.page ?? 1);
  const hasFilter = filterDistrict !== "" || filterCluster !== "" || filterKutir !== "";

  const { isVisible, orderedMetas } = useFieldConfig("progress", PROGRESS_FIELDS);

  function saveFilters() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        district: filterDistrict,
        cluster: filterCluster,
        kutir: filterKutir,
        year: filterYear,
        page,
      }));
    } catch { /* ignore */ }
  }

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

  // Stable map references so columns useMemo deps stay clean
  const studentMap2  = useMemo(() => new Map(allStudents.map((s: any) => [s.id, s])),  [allStudents]);
  const areaMap      = useMemo(() => new Map(allAreas.map((a: any) => [a.id, a])),     [allAreas]);
  const schoolMap    = useMemo(() => new Map(schools.map((s: any) => [s.id, s])),      [schools]);

  const scopedDistricts = isAdmin || !user
    ? allDistricts
    : allDistricts.filter((d: any) => user.district_ids.includes(d.id));
  const scopedClusters = isAdmin || !user
    ? allClusters
    : user.cluster_ids.length > 0
      ? allClusters.filter((c: any) => user.cluster_ids.includes(c.id))
      : allClusters;
  const scopedKutirs = isAdmin || !user
    ? allKutirs
    : user.kutir_ids.length > 0
      ? allKutirs.filter((k: any) => user.kutir_ids.includes(k.id))
      : allKutirs;

  // Auto-select when scoped to a single district / cluster
  useEffect(() => {
    if (scopedDistricts.length === 1 && filterDistrict === "") {
      setFilterDistrict(scopedDistricts[0].id);
    }
  }, [scopedDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scopedClusters.length === 1 && filterCluster === "" && !isAdmin) {
      setFilterCluster(scopedClusters[0].id);
    }
  }, [scopedClusters.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const filterClusters = useMemo(
    () => scopedClusters.filter((c: any) => filterDistrict === "" || areaMap.get(c.area_id)?.district_id === filterDistrict),
    [scopedClusters, filterDistrict, areaMap],
  );
  const filterKutirs = useMemo(
    () => scopedKutirs.filter((k: any) => filterCluster !== "" ? k.cluster_id === filterCluster : filterKutir !== "" ? k.id === filterKutir : false),
    [scopedKutirs, filterCluster, filterKutir],
  );

  const deleteMut = useMutation({
    mutationFn: deleteProgress,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress"] }),
  });

  // Columns: built from useFieldConfig order/visibility, with sort + csv + render per key
  const columns = useMemo<Col<StudentProgress>[]>(() =>
    orderedMetas
      .filter(m => isVisible(m.key))
      .map((meta): Col<StudentProgress> => {
        const sortValue = (p: StudentProgress): string | number => {
          switch (meta.key) {
            case "student": { const s = studentMap2.get(p.student_id); return s ? `${(s as any).first_name} ${(s as any).last_name}`.toLowerCase() : ""; }
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
            case "student": { const s = studentMap2.get(p.student_id); return s ? `${(s as any).first_name} ${(s as any).last_name}` : String(p.student_id); }
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
                  {s ? `${(s as any).first_name} ${(s as any).last_name}` : `#${p.student_id}`}
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

  const statusPalette: Record<ProgressStatus, { bg: string; border: string; fg: string }> = {
    enrolled:    { bg: "var(--status-success-bg)", border: "var(--status-success-fg)", fg: "var(--status-success-fg)" },
    transferred: { bg: "var(--badge-blue-bg)",     border: "var(--badge-blue-fg)",     fg: "var(--badge-blue-fg)" },
    dropped_out: { bg: "var(--status-danger-bg)",  border: "var(--badge-red-fg)",      fg: "var(--status-danger-fg)" },
    graduated:   { bg: "var(--badge-green-bg, #d1fae5)", border: "var(--badge-green-fg, #065f46)", fg: "var(--badge-green-fg, #065f46)" },
  };

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      {/* Status summary tiles */}
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
          return !!s && `${(s as any).first_name} ${(s as any).last_name}`.toLowerCase().includes(q);
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
              {scopedDistricts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select style={grs.filterSelect} value={filterCluster} onChange={e => { setFilterCluster(e.target.value === "" ? "" : Number(e.target.value)); setFilterKutir(""); setPage(1); }} disabled={filterDistrict === "" && filterKutir === ""}>
              <option value="">All Clusters</option>
              {filterClusters.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {filterCluster !== "" && (
              <select style={grs.filterSelect} value={filterKutir} onChange={e => { setFilterKutir(e.target.value === "" ? "" : Number(e.target.value)); setPage(1); }}>
                <option value="">All Kutirs</option>
                {filterKutirs.map((k: any) => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            )}
          </>
        }
        exportFilename="progress"
        printTitle="Student Progress"
        onAdd={() => { saveFilters(); navigate(`/progress/new?year=${filterYear}`); }}
        actions={(p) => ({
          onView:   () => { saveFilters(); navigate(`/progress/${p.id}`); },
          onEdit:   () => { saveFilters(); navigate(`/progress/${p.id}?edit=1`); },
          onDelete: () => { if (confirm("Delete this record?")) deleteMut.mutate(p.id); },
        })}
      />
    </div>
  );
}
