import React from "react";
import { useState, useMemo, useRef } from "react";
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
import { hasGlobalDataScope } from "../constants/roles";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";
import { GeoFilterBar } from "../components/GeoFilterBar";
import { grs } from "../styles/grs";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { useBfcacheReload } from "../hooks/useBfcacheReload";
import { useGeoFilterAutoSelect } from "../hooks/useGeoFilterAutoSelect";
import { persistFilters, usePersistedFilterRestore } from "../hooks/usePersistedFilters";
import { PROGRESS_FIELDS } from "../constants/progressFields";
import { studentLabel } from "../utils/studentLabel";
import {
  PROGRESS_STATUSES,
  STATUS_LABELS,
  STATUS_BADGES,
  STATUS_TILES,
} from "../constants/progressStatus";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  defaultsFromUser,
  scopeClusters,
  scopeDistricts,
  scopeKutirs,
  type FilterId,
} from "../utils/geoFilters";
import { formatAcademicYear } from "../utils/academicYear";

const CURRENT_YEAR = new Date().getFullYear();
const STORAGE_KEY = "progress_filter_state";

export default function StudentProgressPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const unscoped = hasGlobalDataScope(user?.title);
  const qc = useQueryClient();

  useBfcacheReload();

  const saved = usePersistedFilterRestore<{
    district?: FilterId;
    cluster?: FilterId;
    kutir?: FilterId;
    year?: number;
    search?: string;
    page?: number;
  }>(STORAGE_KEY);

  const defaults = defaultsFromUser(user);

  const [filterDistrict, setFilterDistrict] = useState<FilterId>(saved?.district ?? defaults.district);
  const [filterCluster, setFilterCluster] = useState<FilterId>(saved?.cluster ?? defaults.cluster);
  const [filterKutir, setFilterKutir] = useState<FilterId>(saved?.kutir ?? defaults.kutir);
  const [filterYear, setFilterYear] = useState(saved?.year ?? CURRENT_YEAR);
  const [searchQuery, setSearchQuery] = useState(saved?.search ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(saved?.search ?? "");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const PAGE_SIZE = 25;
  const [page, setPage] = useState(saved?.page ?? 1);
  const [pendingDelete, setPendingDelete] = useState<{ id: number } | null>(null);
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setDebouncedSearch(q); setPage(1); }, 300);
  };
  const hasFilter =
    filterDistrict !== "" || filterCluster !== "" || filterKutir !== "" || debouncedSearch !== "";

  const { isVisible, orderedMetas } = useFieldConfig("progress", PROGRESS_FIELDS);

  function saveFilters() {
    persistFilters(STORAGE_KEY, {
      district: filterDistrict,
      cluster: filterCluster,
      kutir: filterKutir,
      year: filterYear,
      search: searchQuery,
      page,
    });
  }

  const { data: progressPage = { items: [], total: 0 }, isLoading } = useQuery({
    queryKey: ["progress", filterYear, filterDistrict, filterCluster, filterKutir, debouncedSearch, page],
    queryFn: () => listProgressPaged({
      academic_year: filterYear,
      district_id: filterDistrict !== "" ? filterDistrict : undefined,
      cluster_id: filterCluster !== "" ? filterCluster : undefined,
      kutir_id: filterKutir !== "" ? filterKutir : undefined,
      search: debouncedSearch || undefined,
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
  const { data: allDistricts = [] } = useQuery({
    queryKey: ["districts", { parivaar_presence: true }],
    queryFn: () => listDistricts(undefined, { parivaar_presence: true }),
  });
  const { data: allAreas = [] }    = useQuery({ queryKey: ["all-areas"],    queryFn: () => listAreas() });
  const { data: allClusters = [] } = useQuery({ queryKey: ["all-clusters"], queryFn: () => listClusters() });

  // Stable map references so columns useMemo deps stay clean
  const studentMap2  = useMemo(() => new Map(allStudents.map((s: any) => [s.id, s])),  [allStudents]);
  const schoolMap    = useMemo(() => new Map(schools.map((s: any) => [s.id, s])),      [schools]);

  const scopedDistricts = scopeDistricts(allDistricts, user, unscoped);
  const scopedClusters = scopeClusters(allClusters, user, unscoped);
  const scopedKutirs = scopeKutirs(allKutirs, user, unscoped);

  useGeoFilterAutoSelect({
    scopedDistricts,
    scopedClusters,
    filterDistrict,
    filterCluster,
    setFilterDistrict,
    setFilterCluster,
    unscoped,
    clusterMode: "scoped-non-admin",
  });

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
            case "student": { const s = studentMap2.get(p.student_id); return studentLabel(s as any).toLowerCase(); }
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
            case "student": { const s = studentMap2.get(p.student_id); return studentLabel(s as any, String(p.student_id)); }
            case "class_in_year": return p.class_in_year != null ? String(p.class_in_year) : "";
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
              const name = studentLabel(s as any, `#${p.student_id}`);
              return (
                <Link
                  to={`/students/${p.student_id}`}
                  title={name}
                  style={{
                    color: "var(--badge-purple-fg)",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {name}
                </Link>
              );
            }
            case "class_in_year":
              return (
                <span
                  style={{
                    background: "var(--badge-purple-bg)",
                    color: "var(--badge-purple-fg)",
                    borderRadius: 4,
                    padding: "1px 6px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.class_in_year != null ? p.class_in_year : "—"}
                </span>
              );
            case "school_id": {
              const school = p.school ?? schoolMap.get(p.school_id);
              const name = school?.name ?? `School #${p.school_id}`;
              return (
                <span
                  title={school?.school_type ? `${name} (${school.school_type})` : name}
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {name}
                </span>
              );
            }
            case "status": {
              const st = p.status as ProgressStatus;
              const b = STATUS_BADGES[st] ?? STATUS_BADGES.enrolled;
              const detail =
                st === "transferred" && p.transfer_school
                  ? p.transfer_school
                  : st === "dropped_out" && p.exit_reason
                    ? p.exit_reason
                    : undefined;
              return (
                <span
                  title={detail}
                  style={{
                    background: b.bg,
                    color: b.fg,
                    borderRadius: 4,
                    padding: "1px 6px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {b.prefix}{STATUS_LABELS[st]}
                </span>
              );
            }
            case "previous_year_percentage":
              return p.previous_year_percentage != null ? (
                <span style={{ fontVariantNumeric: "tabular-nums", fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                  {parseFloat(String(p.previous_year_percentage)).toFixed(1)}%
                </span>
              ) : "—";
            case "remarks":
              return <span style={{ whiteSpace: "nowrap" }}>{p.remarks ?? "—"}</span>;
            default:
              return null;
          }
        };
        const compactTd: React.CSSProperties = {
          padding: "6px 10px",
          fontSize: "0.8125rem",
          whiteSpace: "nowrap",
          verticalAlign: "middle",
        };
        const tdStyle: React.CSSProperties =
          meta.key === "remarks"
            ? { ...compactTd, maxWidth: 180, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis" }
            : compactTd;
        return { key: meta.key, label: meta.label, sortable: true, sortValue, csvValue, render, tdStyle };
      }),
  [orderedMetas, isVisible, studentMap2, schoolMap]);

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      {/* Status summary tiles */}
      {progressList.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {PROGRESS_STATUSES.map((st) => {
            const count = progressList.filter(p => p.status === st).length;
            if (count === 0) return null;
            const pal = STATUS_TILES[st];
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
        externalSearch={searchQuery}
        onExternalSearch={handleSearch}
        emptyMessage={hasFilter ? `No progress records for ${formatAcademicYear(filterYear)}.` : "Select a District or search by Student name to view Progress"}
        filters={
          <GeoFilterBar
            leading={
              <select style={grs.filterSelect} value={filterYear} onChange={e => { setFilterYear(Number(e.target.value)); setPage(1); }}>
                {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map(y => (
                  <option key={y} value={y}>{formatAcademicYear(y)}</option>
                ))}
              </select>
            }
            district={filterDistrict}
            cluster={filterCluster}
            kutir={filterKutir}
            onChange={({ district, cluster, kutir }) => {
              setFilterDistrict(district);
              setFilterCluster(cluster);
              setFilterKutir(kutir);
              setPage(1);
            }}
            districts={scopedDistricts}
            clusters={scopedClusters}
            areas={allAreas}
            kutirs={scopedKutirs}
            kutirMode="by-cluster-or-selected"
            clusterDisable="no-district-unless-kutir"
            kutirDisable="never"
            kutirVisibility="when-cluster"
          />
        }
        exportFilename="progress"
        printTitle="Student Progress"
        onAdd={() => { saveFilters(); navigate(`/progress/new?year=${filterYear}`); }}
        actions={(p) => ({
          onView:   () => { saveFilters(); navigate(`/progress/${p.id}`); },
          onEdit:   () => { saveFilters(); navigate(`/progress/${p.id}?edit=1`); },
          onDelete: () => setPendingDelete({ id: p.id }),
        })}
      />
      {pendingDelete && (
        <ConfirmDialog
          message="Delete this record?"
          onConfirm={() => { deleteMut.mutate(pendingDelete.id); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
