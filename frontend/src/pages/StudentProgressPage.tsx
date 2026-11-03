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
import {
  PROGRESS_FIELDS,
  PROGRESS_FIELD_KEYS,
  isProgressMarksKey,
} from "../constants/progressFields";
import { studentLabel } from "../utils/studentLabel";
import {
  PROGRESS_STATUSES,
  STATUS_LABELS,
  STATUS_BADGES,
  STATUS_TILES,
  progressStatusShowsRemarks,
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
import {
  defaultProgressListYearFilter,
  formatAcademicYear,
  progressFilterYearOptions,
  type ProgressListYearFilter,
} from "../utils/academicYear";
import { classesForTrack, getMark } from "../utils/progressTrack";

function markClassFromFieldKey(key: string): number | null {
  if (!key.startsWith("marks_")) return null;
  const n = Number(key.slice(6));
  return Number.isInteger(n) && n >= 6 && n <= 12 ? n : null;
}

function markAppliesToTrack(p: StudentProgress, classNum: number): boolean {
  return classesForTrack(p.track).includes(classNum);
}

function formatMarkPctText(m: number): string {
  const n = parseFloat(String(m));
  if (!Number.isFinite(n)) return "";
  const rounded = Math.round(n * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}%`;
}

const CURRENT_YEAR = new Date().getFullYear();
const STORAGE_KEY = "progress_filter_state";

/** Narrow marks block (6th–12th): tight padding, tabular % values, list-hub ellipsis. */
const PROGRESS_MARKS_COL_MIN_PX = 48;
const PROGRESS_MARKS_TD: React.CSSProperties = {
  padding: "6px 2px",
  fontSize: "0.8125rem",
  whiteSpace: "nowrap",
  verticalAlign: "middle",
  fontVariantNumeric: "tabular-nums",
  maxWidth: PROGRESS_MARKS_COL_MIN_PX + 6,
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const PROGRESS_LIST_TD: React.CSSProperties = {
  padding: "6px 8px",
  fontSize: "0.8125rem",
  whiteSpace: "nowrap",
  verticalAlign: "middle",
};

/** Cap Year / Class / School so list-hub width:100% does not stretch them toward DATA_COL_MAX. */
const PROGRESS_YEAR_COL_MIN_PX = 52;
const PROGRESS_CLASS_COL_MIN_PX = 40;
const PROGRESS_SCHOOL_COL_MIN_PX = 96;
const PROGRESS_SCHOOL_COL_MAX_PX = 148;

export default function StudentProgressPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const unscoped = hasGlobalDataScope(user?.title);
  const qc = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  useBfcacheReload();

  const saved = usePersistedFilterRestore<{
    district?: FilterId;
    cluster?: FilterId;
    kutir?: FilterId;
    year?: ProgressListYearFilter;
    search?: string;
    page?: number;
  }>(STORAGE_KEY);

  const defaults = defaultsFromUser(user);

  const [filterDistrict, setFilterDistrict] = useState<FilterId>(saved?.district ?? defaults.district);
  const [filterCluster, setFilterCluster] = useState<FilterId>(saved?.cluster ?? defaults.cluster);
  const [filterKutir, setFilterKutir] = useState<FilterId>(saved?.kutir ?? defaults.kutir);
  const [filterYear, setFilterYear] = useState<ProgressListYearFilter>(
    saved?.year ?? defaultProgressListYearFilter(),
  );
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
      academic_year: filterYear !== "" ? filterYear : undefined,
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
            case "academic_year": return p.academic_year ?? -1;
            case "class_in_year": return p.class_in_year ?? -1;
            case "school_id": return (schoolMap.get(p.school_id)?.name ?? "").toLowerCase();
            case "status": return p.status ?? "";
            case "remarks":
              return progressStatusShowsRemarks(p.status) ? (p.remarks ?? "").toLowerCase() : "";
            case "marks_6":
            case "marks_7":
            case "marks_8":
            case "marks_9":
            case "marks_10":
            case "marks_11":
            case "marks_12": {
              const markClass = markClassFromFieldKey(meta.key)!;
              if (!markAppliesToTrack(p, markClass)) return -2;
              const m = getMark(p, markClass);
              return m ?? -1;
            }
            default:
              return "";
          }
        };
        const csvValue = (p: StudentProgress): string => {
          switch (meta.key) {
            case "student": { const s = studentMap2.get(p.student_id); return studentLabel(s as any, String(p.student_id)); }
            case "academic_year": return p.academic_year != null ? formatAcademicYear(p.academic_year) : "";
            case "class_in_year": return p.class_in_year != null ? String(p.class_in_year) : "";
            case "school_id": return (p.school ?? schoolMap.get(p.school_id))?.name ?? "";
            case "status": return STATUS_LABELS[p.status as ProgressStatus] ?? p.status;
            case "remarks":
              return progressStatusShowsRemarks(p.status) ? (p.remarks ?? "") : "";
            case "marks_6":
            case "marks_7":
            case "marks_8":
            case "marks_9":
            case "marks_10":
            case "marks_11":
            case "marks_12": {
              const markClass = markClassFromFieldKey(meta.key)!;
              if (!markAppliesToTrack(p, markClass)) return "";
              const m = getMark(p, markClass);
              return m != null ? formatMarkPctText(m) : "";
            }
            default:
              return "";
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
            case "academic_year":
              return (
                <span style={{ fontSize: "0.8125rem", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                  {p.academic_year != null ? formatAcademicYear(p.academic_year) : "—"}
                </span>
              );
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
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "block",
                    minWidth: 0,
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
                st === "transferred" && p.transfer_school ? p.transfer_school : undefined;
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
            case "remarks": {
              const text = progressStatusShowsRemarks(p.status) ? p.remarks : null;
              return <span style={{ whiteSpace: "nowrap" }}>{text ?? "—"}</span>;
            }
            case "marks_6":
            case "marks_7":
            case "marks_8":
            case "marks_9":
            case "marks_10":
            case "marks_11":
            case "marks_12": {
              const markClass = markClassFromFieldKey(meta.key)!;
              if (!markAppliesToTrack(p, markClass)) {
                return <span style={{ whiteSpace: "nowrap" }}>—</span>;
              }
              const m = getMark(p, markClass);
              return m != null ? (
                <span style={{ fontVariantNumeric: "tabular-nums", fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                  {formatMarkPctText(m)}
                </span>
              ) : (
                <span style={{ whiteSpace: "nowrap" }}>—</span>
              );
            }
            default:
              return null;
          }
        };
        const isMarks = isProgressMarksKey(meta.key);
        const tdStyle: React.CSSProperties = isMarks
          ? PROGRESS_MARKS_TD
          : meta.key === "remarks"
            ? {
                ...PROGRESS_LIST_TD,
                maxWidth: 180,
                color: "var(--text-secondary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }
            : meta.key === "academic_year"
              ? {
                  ...PROGRESS_LIST_TD,
                  padding: "6px 4px",
                  maxWidth: PROGRESS_YEAR_COL_MIN_PX + 4,
                }
              : meta.key === "class_in_year"
                ? {
                    ...PROGRESS_LIST_TD,
                    padding: "6px 3px",
                    maxWidth: PROGRESS_CLASS_COL_MIN_PX + 8,
                  }
                : meta.key === "school_id"
                  ? {
                      ...PROGRESS_LIST_TD,
                      padding: "6px 4px 6px 2px",
                      minWidth: PROGRESS_SCHOOL_COL_MIN_PX,
                      maxWidth: PROGRESS_SCHOOL_COL_MAX_PX,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }
                  : meta.key === "status"
                    ? { ...PROGRESS_LIST_TD, padding: "6px 4px", maxWidth: 118 }
                    : PROGRESS_LIST_TD;
        const minWidth =
          isMarks
            ? PROGRESS_MARKS_COL_MIN_PX
            : meta.key === "student"
              ? 148
              : meta.key === "academic_year"
                ? PROGRESS_YEAR_COL_MIN_PX
                : meta.key === "class_in_year"
                  ? PROGRESS_CLASS_COL_MIN_PX
                  : meta.key === "school_id"
                    ? PROGRESS_SCHOOL_COL_MIN_PX
                    : undefined;
        return {
          key: meta.key,
          label: meta.label,
          sortable: true,
          sortValue,
          csvValue,
          render,
          tdStyle,
          ...(minWidth != null ? { minWidth, nowrap: true } : {}),
        };
      });
  }, [orderedMetas, isVisible, studentMap2, schoolMap]);

  const columns = baseColumns;

  const filterSelectStyle: React.CSSProperties = {
    padding: "7px 10px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    fontSize: 14,
    flexShrink: 0,
  };

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
        rowKey={(p) => String(p.id)}
        isLoading={isLoading}
        pagination={{ page, pageSize: PAGE_SIZE, total: progressTotal, onPageChange: setPage }}
        searchable
        searchPlaceholder="Search by student name…"
        externalSearch={searchQuery}
        onExternalSearch={handleSearch}
        emptyMessage={
          filterYear === ""
            ? "No progress records match your filters. Try another year or clear geo filters."
            : `No progress records for ${formatAcademicYear(filterYear)}. Rows move to the next year after marks are saved — try All years or ${formatAcademicYear(filterYear + 1)}.`
        }
        activeFilterCount={countActiveFilters(
          filterYear,
          filterDistrict,
          filterCluster,
          filterKutir,
        )}
        filters={
          <GeoFilterBar
            leading={
              <select
                style={{ ...filterSelectStyle, width: 110 }}
                value={filterYear === "" ? "" : String(filterYear)}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilterYear(v === "" ? "" : Number(v));
                  setPage(1);
                }}
              >
                <option value="">All years</option>
                {progressFilterYearOptions(CURRENT_YEAR).map(y => (
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
        actions={(p) => ({
          onView: () => { saveFilters(); navigate(`/progress/${p.id}`); },
          onEdit: () => { saveFilters(); navigate(`/progress/${p.id}?edit=1`); },
          onDelete: () => setPendingDelete(p.id),
        })}
      />
      {pendingDelete != null && (
        <ConfirmDialog
          message="Delete this record?"
          onConfirm={() => {
            deleteMut.mutate(pendingDelete);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
