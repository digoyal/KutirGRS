import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import api from "../api/client";
import { listVisits, deleteVisit } from "../api/visits";
import type { KutirVisit } from "../api/visits";
import { useAuth } from "../context/AuthContext";
import { listDistricts, listAreas, listClusters } from "../api/geo";
import { grs } from "../styles/grs";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { VISITS_FIELDS } from "../constants/visitsFields";

const MEDIA_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8001/api/v1").replace("/api/v1", "");

interface Kutir { id: number; name: string; code: string; cluster_id: number; }

function StarRating({ value, readOnly }: { value: number; readOnly?: boolean; }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ fontSize: "1.2rem", cursor: readOnly ? "default" : "pointer", color: n <= value ? "var(--star-active)" : "var(--star-inactive)" }}>★</span>
      ))}
    </span>
  );
}

function workbookColor(wc: string | null) {
  if (wc === "Upto Date") return "var(--status-success-fg)";
  if (wc === "Partial Upto Date") return "var(--status-warn-fg)";
  return "var(--status-danger-fg)";
}

// ── sessionStorage filter persistence ─────────────────────────────────────────
const STORAGE_KEY = "visits_filter_state";
const _savedFilters = (() => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    return JSON.parse(raw) as { district?: number | ""; cluster?: number | ""; kutir?: number | ""; };
  } catch { return null; }
})();

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VisitsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.title === "Admin";
  const MANAGER_ROLES_V = ["Admin", "Regional Head", "District Anchor", "Education Coordinator", "Cluster Coordinator"];
  const canManageVisits = MANAGER_ROLES_V.includes(user?.title ?? "");

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

  const [filterKutir, setFilterKutir]   = useState<number | "">(_savedFilters?.kutir ?? "");
  const [filterDistrict, setFilterDistrict] = useState<number | "">(_savedFilters?.district ?? "");
  const [filterCluster, setFilterCluster]   = useState<number | "">(_savedFilters?.cluster ?? "");

  function saveFilters() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ district: filterDistrict, cluster: filterCluster, kutir: filterKutir }));
    } catch { /* ignore */ }
  }

  const { data: kutirs = [] } = useQuery<Kutir[]>({
    queryKey: ["kutirs"],
    queryFn: async () => (await api.get("/kutirs", { params: { limit: 500 } })).data,
  });
  const kutirMap = useMemo(() => new Map(kutirs.map((k) => [k.id, k])), [kutirs]);

  const { data: allDistricts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
  const { data: allAreas = [] }     = useQuery({ queryKey: ["all-areas"],    queryFn: () => listAreas() });
  const { data: allClusters = [] }  = useQuery({ queryKey: ["all-clusters"], queryFn: () => listClusters() });

  const areaMap    = useMemo(() => new Map(allAreas.map(a => [a.id, a])),    [allAreas]);
  const clusterMap = useMemo(() => new Map(allClusters.map(c => [c.id, c])), [allClusters]);

  // For Teachers, restrict visible kutirs to their assigned ones
  const isTeacher = user?.title === "Teacher";
  const scopedKutirIds = useMemo(() => {
    if (!isTeacher || !user) return null;
    return new Set(user.kutir_ids ?? []);
  }, [isTeacher, user]);

  const scopedDistricts = isAdmin || !user ? allDistricts : allDistricts.filter(d => user.district_ids.includes(d.id));
  const scopedClusters  = isAdmin || !user ? allClusters  : user.cluster_ids.length > 0 ? allClusters.filter(c => user.cluster_ids.includes(c.id)) : allClusters;

  // Auto-select when scoped to a single district / cluster (only when not restored from storage)
  useEffect(() => {
    if (_savedFilters?.district != null) return;
    if (scopedDistricts.length === 1 && filterDistrict === "") {
      setFilterDistrict(scopedDistricts[0].id);
    }
  }, [scopedDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (_savedFilters?.cluster != null) return;
    if (scopedClusters.length === 1 && filterCluster === "" && !isAdmin) {
      setFilterCluster(scopedClusters[0].id);
    }
  }, [scopedClusters.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const filterClusters = useMemo(
    () => scopedClusters.filter(c => filterDistrict === "" || areaMap.get(c.area_id)?.district_id === filterDistrict),
    [scopedClusters, filterDistrict, areaMap]
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

  const filtered = useMemo(() => visits.filter(v => {
    if (scopedKutirIds !== null && !scopedKutirIds.has(v.kutir_id)) return false;
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
      render: (v: KutirVisit) => <span>{v.avg_attendance_morning ?? "—"} / {v.avg_attendance_evening ?? "—"}</span>,
      csvValue: v => `${v.avg_attendance_morning ?? ""}/${v.avg_attendance_evening ?? ""}`,
    },
    {
      key: "regular_students_morning" as keyof KutirVisit,
      label: "Regular Students M/E",
      sortable: false,
      render: (v: KutirVisit) => <span>{v.regular_students_morning ?? "—"} / {v.regular_students_evening ?? "—"}</span>,
      csvValue: v => `${v.regular_students_morning ?? ""}/${v.regular_students_evening ?? ""}`,
    },
    {
      key: "physical_vs_registered",
      label: "App vs. Registered Students",
      sortable: true,
      render: v => (
        <span style={{ background: v.physical_vs_registered === "Matched" ? "var(--status-success-bg)" : "var(--status-danger-bg)", color: v.physical_vs_registered === "Matched" ? "var(--status-success-fg)" : "var(--status-danger-fg)", borderRadius: 4, padding: "2px 8px", fontSize: "0.78rem" }}>
          {v.physical_vs_registered}
        </span>
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
    { key: "workbook_completion", label: "Workbook Completion", sortable: true },
    { key: "book_availability", label: "Book Availability", sortable: true },
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
          <select value={filterDistrict} onChange={e => { setFilterDistrict(e.target.value === "" ? "" : Number(e.target.value)); setFilterCluster(""); setFilterKutir(""); }} style={grs.filterSelect}>
            <option value="">All Districts</option>
            {scopedDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={filterCluster} onChange={e => { setFilterCluster(e.target.value === "" ? "" : Number(e.target.value)); setFilterKutir(""); }} disabled={filterDistrict === ""} style={grs.filterSelect}>
            <option value="">All Clusters</option>
            {filterClusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterKutir} onChange={e => setFilterKutir(e.target.value === "" ? "" : Number(e.target.value))} disabled={filterCluster === ""} style={filterCluster === "" ? { ...grs.filterSelect, opacity: 0.5 } : grs.filterSelect}>
            <option value="">All Kutirs</option>
            {kutirs.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
        </>}
        exportFilename="visits"
        printTitle="Kutir Visits"
        onAdd={canManageVisits ? () => { saveFilters(); navigate("new"); } : undefined}
        actions={canManageVisits
          ? (v => ({
              onView: () => { saveFilters(); navigate(String(v.id)); },
              onEdit: () => { saveFilters(); navigate(`${v.id}?edit=1`); },
              onDelete: () => {
                if (confirm(`Delete visit for ${kutirMap.get(v.kutir_id)?.name ?? "this kutir"} on ${v.visit_date}?`))
                  deleteMut.mutate(v.id);
              },
            }))
          : (v => ({ onView: () => { saveFilters(); navigate(String(v.id)); } }))
        }
      />
    </div>
  );
}
