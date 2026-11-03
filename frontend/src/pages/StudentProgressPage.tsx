import React from "react";
import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listProgressPaged,
  deleteProgress,
  type StudentProgress,
  type ProgressStatus,
} from "../api/admissions";
import { listSchools, type School } from "../api/schools";
import { listKutirs, type Kutir } from "../api/kutirs";
import { listStudents } from "../api/students";
import { listDistricts, listAreas, listClusters, type Area, type Cluster } from "../api/geo";
import { useAuth } from "../context/AuthContext";
import { hasGlobalDataScope } from "../constants/roles";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";
import { GeoFilterBar } from "../components/GeoFilterBar";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { useBfcacheReload } from "../hooks/useBfcacheReload";
import { useGeoFilterAutoSelect } from "../hooks/useGeoFilterAutoSelect";
import { persistFilters, usePersistedFilterRestore } from "../hooks/usePersistedFilters";
import { PROGRESS_FIELDS, PROGRESS_FIELD_KEYS } from "../constants/progressFields";
import { studentLabel } from "../utils/studentLabel";
import {
  PROGRESS_STATUSES,
  STATUS_LABELS,
  STATUS_BADGES,
  STATUS_TILES,
} from "../constants/progressStatus";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  countActiveFilters,
  defaultsFromUser,
  scopeClusters,
  scopeDistricts,
  scopeKutirs,
  type FilterId,
} from "../utils/geoFilters";
import { formatAcademicYear } from "../utils/academicYear";
import { useEntityOfflineList, useEntityOfflinePendingCount } from "../hooks/useEntityOfflineList";
import {
  countPendingProgress,
  listPendingProgress,
  listProgressDrafts,
  purgeExpiredProgressDrafts,
  removePendingProgress,
  removeProgressDraft,
  PROGRESS_OFFLINE_CHANGED,
} from "../offline/progressOfflineDb";
import {
  isOfflineProgressDraft,
  isOfflineProgressPending,
  isOfflineLocalProgress,
  offlineProgressDraftRowKey,
  offlineProgressPendingRowKey,
  pendingProgressToListItem,
  type OfflineProgressDraftListItem,
  type OfflineProgressPendingListItem,
  type ProgressTableRow,
} from "../offline/progressDraftTypes";
import { offlineStudentNameCell, wrapColumnsForOffline } from "../offline/offlineColumnWrap";

const CURRENT_YEAR = new Date().getFullYear();
const STORAGE_KEY = "progress_filter_state";

export default function StudentProgressPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const unscoped = hasGlobalDataScope(user?.title);
  const qc = useQueryClient();
  const pendingOfflineCount = useEntityOfflinePendingCount(countPendingProgress, PROGRESS_OFFLINE_CHANGED);
  const offlinePending = useEntityOfflineList(listPendingProgress, PROGRESS_OFFLINE_CHANGED);
  const offlineDrafts = useEntityOfflineList(listProgressDrafts, PROGRESS_OFFLINE_CHANGED);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "progress"; id: number }
    | { kind: "draft"; localId: string; label: string }
    | { kind: "pending"; localId: string; label: string }
    | null
  >(null);

  useBfcacheReload();

  useEffect(() => {
    void purgeExpiredProgressDrafts();
  }, []);

  useEffect(() => {
    const st = location.state as { offlineQueued?: boolean; offlineMessage?: string } | null;
    if (st?.offlineQueued && st.offlineMessage) {
      setOfflineNotice(st.offlineMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

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
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setDebouncedSearch(q); setPage(1); }, 300);
  };
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
  });
  const progressList = progressPage.items;
  const progressTotal = progressPage.total;

  const { data: schools = [] } = useQuery<School[]>({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
  });
  const { data: allStudents = [] } = useQuery({ queryKey: ["students-names"], queryFn: () => listStudents({ name_only: true }) });
  const { data: allKutirs = [] }   = useQuery<Kutir[]>({ queryKey: ["all-kutirs"],   queryFn: () => listKutirs() });
  const { data: allDistricts = [] } = useQuery({
    queryKey: ["districts", { parivaar_presence: true }],
    queryFn: () => listDistricts(undefined, { parivaar_presence: true }),
  });
  const { data: allAreas = [] }    = useQuery<Area[]>({ queryKey: ["all-areas"],    queryFn: () => listAreas() });
  const { data: allClusters = [] } = useQuery<Cluster[]>({ queryKey: ["all-clusters"], queryFn: () => listClusters() });

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

  const kutirMap = useMemo(() => new Map(allKutirs.map((k) => [k.id, k])), [allKutirs]);
  const areaMap = useMemo(() => new Map(allAreas.map((a) => [a.id, a])), [allAreas]);
  const clusterMap = useMemo(() => new Map(allClusters.map((c) => [c.id, c])), [allClusters]);

  const scopedKutirIds = useMemo(() => {
    if (unscoped) return null;
    return new Set(scopedKutirs.map((k) => k.id));
  }, [unscoped, scopedKutirs]);

  function passesProgressGeo(kutirId: number | null): boolean {
    if (kutirId == null) return filterKutir === "";
    if (filterKutir !== "" && kutirId !== Number(filterKutir)) return false;
    if (scopedKutirIds !== null && !scopedKutirIds.has(kutirId)) return false;
    const kutir = kutirMap.get(kutirId);
    if (filterCluster !== "") {
      if (!kutir || kutir.cluster_id !== filterCluster) return false;
    } else if (filterDistrict !== "") {
      if (!kutir) return false;
      const cl = clusterMap.get(kutir.cluster_id);
      if (!cl) return false;
      const ar = areaMap.get(cl.area_id);
      if (!ar || ar.district_id !== filterDistrict) return false;
    }
    return true;
  }

  const draftListItems = useMemo((): OfflineProgressDraftListItem[] => {
    return offlineDrafts
      .filter((d) => d.academic_year === filterYear && passesProgressGeo(d.kutir_id))
      .map((d) => ({ ...d, kind: "offline-draft" as const }));
  }, [offlineDrafts, filterYear, filterKutir, filterCluster, filterDistrict, scopedKutirIds]);

  const pendingListItems = useMemo((): OfflineProgressPendingListItem[] => {
    return offlinePending
      .filter((p) => p.payload.academic_year === filterYear && passesProgressGeo(p.kutir_id ?? null))
      .map(pendingProgressToListItem);
  }, [offlinePending, filterYear, filterKutir, filterCluster, filterDistrict, scopedKutirIds]);

  const tableRows: ProgressTableRow[] = useMemo(
    () => [...progressList, ...draftListItems, ...pendingListItems],
    [progressList, draftListItems, pendingListItems],
  );

  // List columns, labels, visibility, order, and CSV headers all come from PROGRESS_FIELDS.
  const baseColumns = useMemo<Col<StudentProgress>[]>(() => {
    if (import.meta.env.DEV) {
      for (const key of PROGRESS_FIELD_KEYS) {
        if (!orderedMetas.some((m) => m.key === key)) {
          throw new Error(`StudentProgressPage missing PROGRESS_FIELDS key in orderedMetas: ${key}`);
        }
      }
    }
    return orderedMetas
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
      });
  }, [orderedMetas, isVisible, studentMap2, schoolMap]);

  const columns = useMemo(
    () =>
      wrapColumnsForOffline<
        OfflineProgressDraftListItem | OfflineProgressPendingListItem,
        StudentProgress
      >(baseColumns, (row): row is OfflineProgressDraftListItem | OfflineProgressPendingListItem => isOfflineLocalProgress(row), (row, key) => {
        if (key === "student") {
          const label = isOfflineProgressDraft(row)
            ? row.student_label
            : row.student_label ?? `Student #${row.payload.student_id}`;
          return offlineStudentNameCell(label, isOfflineProgressPending(row) ? "pending" : "draft");
        }
        if (key === "school_id") {
          const name = isOfflineProgressDraft(row)
            ? row.school_name
            : row.school_name ?? `School #${row.payload.school_id}`;
          return <span style={{ fontSize: "0.8125rem" }}>{name}</span>;
        }
        return undefined;
      }),
    [baseColumns],
  );

  const filterSelectStyle: React.CSSProperties = {
    padding: "7px 10px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    fontSize: 14,
    flexShrink: 0,
  };

  const tableSubtitle =
    pendingOfflineCount > 0
      ? `${pendingOfflineCount} record${pendingOfflineCount === 1 ? "" : "s"} waiting to upload`
      : undefined;

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      {offlineNotice && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            borderRadius: 8,
            background: "var(--status-success-bg)",
            color: "var(--status-success-fg)",
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span>{offlineNotice}</span>
          <button type="button" onClick={() => setOfflineNotice(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
            ✕
          </button>
        </div>
      )}
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

      <GrsTable<ProgressTableRow>
        title="Student Progress"
        subtitle={tableSubtitle}
        columns={columns}
        data={tableRows}
        rowKey={(p) => {
          if (isOfflineProgressDraft(p)) return offlineProgressDraftRowKey(p);
          if (isOfflineProgressPending(p)) return offlineProgressPendingRowKey(p);
          return String(p.id);
        }}
        isLoading={isLoading}
        pagination={{ page, pageSize: PAGE_SIZE, total: progressTotal, onPageChange: setPage }}
        searchable
        searchPlaceholder="Search by student name…"
        externalSearch={searchQuery}
        onExternalSearch={handleSearch}
        emptyMessage={`No progress records for ${formatAcademicYear(filterYear)}.`}
        activeFilterCount={countActiveFilters(
          filterYear !== CURRENT_YEAR ? filterYear : "",
          filterDistrict,
          filterCluster,
          filterKutir,
        )}
        filters={
          <GeoFilterBar
            leading={
              <select
                style={{ ...filterSelectStyle, width: 110 }}
                value={filterYear}
                onChange={e => { setFilterYear(Number(e.target.value)); setPage(1); }}
              >
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
            selectStyle={filterSelectStyle}
            districtStyle={{ width: 140 }}
            clusterStyle={{ width: 140 }}
            kutirStyle={{ width: 130 }}
          />
        }
        exportFilename="progress"
        printTitle="Student Progress"
        onAdd={() => { saveFilters(); navigate(`/progress/new?year=${filterYear}`); }}
        actions={(p) => {
          if (isOfflineProgressDraft(p)) {
            const label = `${p.student_label} · ${p.school_name}`;
            return {
              onView: () => { saveFilters(); navigate(`draft/${p.localId}`); },
              onEdit: () => { saveFilters(); navigate(`draft/${p.localId}`); },
              onDelete: () => setPendingDelete({ kind: "draft", localId: p.localId, label }),
            };
          }
          if (isOfflineProgressPending(p)) {
            const label = p.student_label ?? `Student #${p.payload.student_id}`;
            return {
              onDelete: () => setPendingDelete({ kind: "pending", localId: p.localId, label }),
            };
          }
          return {
            onView: () => { saveFilters(); navigate(`/progress/${p.id}`); },
            onEdit: () => { saveFilters(); navigate(`/progress/${p.id}?edit=1`); },
            onDelete: () => setPendingDelete({ kind: "progress", id: p.id }),
          };
        }}
      />
      {pendingDelete && (
        <ConfirmDialog
          message={
            pendingDelete.kind === "draft"
              ? <>Remove saved offline progress for <strong>{pendingDelete.label}</strong>?</>
              : pendingDelete.kind === "pending"
                ? <>Remove progress waiting to sync for <strong>{pendingDelete.label}</strong>?</>
                : "Delete this record?"
          }
          onConfirm={() => {
            if (pendingDelete.kind === "draft") {
              void removeProgressDraft(pendingDelete.localId);
            } else if (pendingDelete.kind === "pending") {
              void removePendingProgress(pendingDelete.localId);
            } else {
              deleteMut.mutate(pendingDelete.id);
            }
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
