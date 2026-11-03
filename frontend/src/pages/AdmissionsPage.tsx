import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { listExamsPaged, deleteExam, listExamTypes } from "../api/admissions";
import type { StudentExam } from "../api/admissions";
import { listStudents } from "../api/students";
import { listSchools } from "../api/schools";
import { useAuth } from "../context/AuthContext";
import { hasGlobalDataScope } from "../constants/roles";
import { listKutirs } from "../api/kutirs";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";
import { GeoFilterBar } from "../components/GeoFilterBar";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { useBfcacheReload } from "../hooks/useBfcacheReload";
import { useGeoFilterAutoSelect } from "../hooks/useGeoFilterAutoSelect";
import { persistFilters, usePersistedFilterRestore } from "../hooks/usePersistedFilters";
import { ADMISSIONS_FIELDS, ADMISSIONS_FIELD_KEYS } from "../constants/admissionsFields";
import {
  listDistricts,
  listAreas,
  listClusters,
  listExamCenters,
  listExamCategories,
  listNoExamReasons,
  listNoAdmitReasons,
} from "../api/geo";
import { STAGES, StageBadge, pipelineStage } from "../components/admissions-pipeline";
import { studentLabel } from "../utils/studentLabel";
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
import { ADMISSIONS_FILTER_STORAGE_KEY } from "../constants/admissionsList";
import { useEntityOfflineList, useEntityOfflinePendingCount } from "../hooks/useEntityOfflineList";
import {
  countPendingAdmissions,
  listAdmissionDrafts,
  listPendingAdmissions,
  purgeExpiredAdmissionDrafts,
  removeAdmissionDraft,
  removePendingAdmission,
  ADMISSION_OFFLINE_CHANGED,
} from "../offline/admissionOfflineDb";
import {
  isOfflineAdmissionDraft,
  isOfflineAdmissionPending,
  isOfflineLocalAdmission,
  offlineAdmissionDraftRowKey,
  offlineAdmissionPendingRowKey,
  pendingAdmissionToListItem,
  type AdmissionTableRow,
  type OfflineAdmissionDraftListItem,
  type OfflineAdmissionPendingListItem,
} from "../offline/admissionDraftTypes";
import { offlineStudentNameCell, wrapColumnsForOffline } from "../offline/offlineColumnWrap";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 2 + i);
const STORAGE_KEY = ADMISSIONS_FILTER_STORAGE_KEY;

export default function AdmissionsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const unscoped = hasGlobalDataScope(user?.title);
  const pendingOfflineCount = useEntityOfflinePendingCount(countPendingAdmissions, ADMISSION_OFFLINE_CHANGED);
  const offlinePending = useEntityOfflineList(listPendingAdmissions, ADMISSION_OFFLINE_CHANGED);
  const offlineDrafts = useEntityOfflineList(listAdmissionDrafts, ADMISSION_OFFLINE_CHANGED);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "exam"; id: number }
    | { kind: "draft"; localId: string; label: string }
    | { kind: "pending"; localId: string; label: string }
    | null
  >(null);

  useBfcacheReload();

  useEffect(() => {
    void purgeExpiredAdmissionDrafts();
  }, []);

  useEffect(() => {
    const st = location.state as { offlineQueued?: boolean; offlineMessage?: string } | null;
    if (st?.offlineQueued && st.offlineMessage) {
      setOfflineNotice(st.offlineMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const saved = usePersistedFilterRestore<{
    year?: number;
    district?: FilterId;
    cluster?: FilterId;
    kutir?: FilterId;
    search?: string;
    page?: number;
  }>(STORAGE_KEY);

  const [year, setYear] = useState<number>(saved?.year ?? CURRENT_YEAR);

  const defaults = defaultsFromUser(user);

  const [filterDistrict, setFilterDistrict] = useState<FilterId>(saved?.district ?? defaults.district);
  const [filterCluster, setFilterCluster]   = useState<FilterId>(saved?.cluster  ?? defaults.cluster);
  const [filterKutir, setFilterKutir]       = useState<FilterId>(saved?.kutir    ?? defaults.kutir);
  const [searchQuery, setSearchQuery] = useState(saved?.search ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(saved?.search ?? "");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [page, setPage] = useState<number>(saved?.page ?? 1);
  const PAGE_SIZE = 25;
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setDebouncedSearch(q); setPage(1); }, 300);
  };
  const { data: examPage = { items: [], total: 0 }, isLoading } = useQuery({
    queryKey: ["student-exams", year, filterDistrict, filterCluster, filterKutir, debouncedSearch, page],
    queryFn: () => listExamsPaged({
      school_start_year: year,
      district_id: filterDistrict !== "" ? filterDistrict : undefined,
      cluster_id:  filterCluster  !== "" ? filterCluster  : undefined,
      kutir_id:    filterKutir    !== "" ? filterKutir    : undefined,
      search: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  });
  const exams     = examPage.items;
  const examTotal = examPage.total;

  const { data: students = [] } = useQuery({
    queryKey: ["students-names"],
    queryFn: () => listStudents({ name_only: true }),
  });
  const { data: schools = [] } = useQuery({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
  });

  const { data: allKutirs   = [] } = useQuery({ queryKey: ["all-kutirs"],    queryFn: () => listKutirs() });
  const { data: allDistricts= [] } = useQuery({
    queryKey: ["districts", { parivaar_presence: true }],
    queryFn: () => listDistricts(undefined, { parivaar_presence: true }),
  });
  const { data: allAreas    = [] } = useQuery({ queryKey: ["all-areas"],     queryFn: () => listAreas() });
  const { data: allClusters = [] } = useQuery({ queryKey: ["all-clusters"],  queryFn: () => listClusters() });
  const { data: examCategories=[] }= useQuery({ queryKey: ["exam-categories"],queryFn: () => listExamCategories() });
  const { data: examCenters = [] } = useQuery({ queryKey: ["exam-centers"],  queryFn: () => listExamCenters() });
  const { data: examTypes = [] } = useQuery({ queryKey: ["exam-types"], queryFn: () => listExamTypes() });
  const { data: noExamReasons = [] } = useQuery({ queryKey: ["no-exam-reasons"], queryFn: () => listNoExamReasons() });
  const { data: noAdmitReasons = [] } = useQuery({ queryKey: ["no-admit-reasons"], queryFn: () => listNoAdmitReasons() });

  const studentMap      = Object.fromEntries(students.map(s => [s.id, s]));
  const schoolMap       = Object.fromEntries(schools.map(sc => [sc.id, sc]));
  const kutirMap2       = new Map(allKutirs.map(k => [k.id, k]));
  const examCategoryMap = new Map(examCategories.map(c => [c.id, c.name]));
  const examCenterMap   = new Map(examCenters.map(c => [c.id, c.name]));
  const examTypeMap     = new Map(examTypes.map(t => [t.id, t.name]));
  const noExamReasonMap = new Map(noExamReasons.map(r => [r.id, r.reason]));
  const noAdmitReasonMap = new Map(noAdmitReasons.map(r => [r.id, r.reason]));
  const districtMap     = new Map(allDistricts.map(d => [d.id, d.name]));
  const areaMap         = new Map(allAreas.map(a => [a.id, a]));
  const clusterMap      = new Map(allClusters.map(c => [c.id, c]));

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
    mutationFn: deleteExam,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student-exams"] }),
  });

  function saveFilters() {
    persistFilters(STORAGE_KEY, {
      year, district: filterDistrict, cluster: filterCluster, kutir: filterKutir,
      search: searchQuery, page,
    });
  }

  const scopedKutirIds = useMemo(() => {
    if (unscoped) return null;
    return new Set(scopedKutirs.map((k) => k.id));
  }, [unscoped, scopedKutirs]);

  function passesAdmissionGeo(kutirId: number | null): boolean {
    if (kutirId == null) return filterKutir === "";
    if (filterKutir !== "" && kutirId !== Number(filterKutir)) return false;
    if (scopedKutirIds !== null && !scopedKutirIds.has(kutirId)) return false;
    const kutir = kutirMap2.get(kutirId);
    if (filterCluster !== "") {
      if (!kutir || kutir.cluster_id !== filterCluster) return false;
    } else if (filterDistrict !== "") {
      if (!kutir) return false;
      const cl = clusterMap.get(kutir.cluster_id);
      if (!cl) return false;
      const ar = areaMap.get((cl as { area_id: number }).area_id);
      if (!ar || (ar as { district_id: number }).district_id !== filterDistrict) return false;
    }
    return true;
  }

  const draftListItems = useMemo((): OfflineAdmissionDraftListItem[] => {
    return offlineDrafts
      .filter((d) => d.school_start_year === year && passesAdmissionGeo(d.kutir_id))
      .map((d) => ({ ...d, kind: "offline-draft" as const }));
  }, [offlineDrafts, year, filterKutir, filterCluster, filterDistrict, scopedKutirIds]);

  const pendingListItems = useMemo((): OfflineAdmissionPendingListItem[] => {
    return offlinePending
      .filter((p) => p.payload.school_start_year === year && passesAdmissionGeo(p.kutir_id ?? null))
      .map(pendingAdmissionToListItem);
  }, [offlinePending, year, filterKutir, filterCluster, filterDistrict, scopedKutirIds]);

  const tableRows: AdmissionTableRow[] = useMemo(
    () => [...exams, ...draftListItems, ...pendingListItems],
    [exams, draftListItems, pendingListItems],
  );

  // Labels come from ADMISSIONS_FIELDS via orderedMetas; renderers are keyed only.
  const allColumns = useMemo((): Col<StudentExam>[] => [
    {
      key: "district", label: "", sortable: true,
      sortValue: (exam) => {
        const s = studentMap[exam.student_id];
        const kutir = s?.kutir_id != null ? kutirMap2.get(s.kutir_id) : null;
        const cluster = kutir ? clusterMap.get(kutir.cluster_id) : null;
        const area = cluster ? areaMap.get(cluster.area_id) : null;
        return area ? (districtMap.get(area.district_id) ?? "") : "";
      },
      render: (exam) => {
        const s = studentMap[exam.student_id];
        const kutir = s?.kutir_id != null ? kutirMap2.get(s.kutir_id) : null;
        const cluster = kutir ? clusterMap.get(kutir.cluster_id) : null;
        const area = cluster ? areaMap.get(cluster.area_id) : null;
        return area ? (districtMap.get(area.district_id) ?? "—") : "—";
      },
      csvValue: (exam) => {
        const s = studentMap[exam.student_id];
        const kutir = s?.kutir_id != null ? kutirMap2.get(s.kutir_id) : null;
        const cluster = kutir ? clusterMap.get(kutir.cluster_id) : null;
        const area = cluster ? areaMap.get(cluster.area_id) : null;
        return area ? (districtMap.get(area.district_id) ?? "") : "";
      },
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" },
    },
    {
      key: "kutir", label: "", sortable: true,
      sortValue: (exam) => {
        const s = studentMap[exam.student_id];
        return s?.kutir_id != null ? (kutirMap2.get(s.kutir_id)?.name ?? "") : "";
      },
      render: (exam) => {
        const s = studentMap[exam.student_id];
        return s?.kutir_id != null ? (kutirMap2.get(s.kutir_id)?.name ?? "—") : "—";
      },
      csvValue: (exam) => {
        const s = studentMap[exam.student_id];
        return s?.kutir_id != null ? (kutirMap2.get(s.kutir_id)?.name ?? "") : "";
      },
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" },
    },
    {
      key: "student", label: "", sortable: true,
      sortValue: (exam) => {
        const s = studentMap[exam.student_id];
        return studentLabel(s).toLowerCase();
      },
      render: (exam) => {
        const s = studentMap[exam.student_id];
        const label = studentLabel(s, `#${exam.student_id}`);
        return s ? (
          <Link to={`/students/${s.id}`} style={{ color: "var(--text-primary)", textDecoration: "none", fontWeight: 500, fontSize: 13 }}>
            {label}
          </Link>
        ) : label;
      },
      csvValue: (exam) => {
        const s = studentMap[exam.student_id];
        return studentLabel(s, String(exam.student_id));
      },
      tdStyle: { whiteSpace: "nowrap" },
    },
    {
      key: "admission_class", label: "", sortable: true,
      sortValue: (exam) => exam.admission_class ?? -1,
      render: (exam) => exam.admission_class != null ? String(exam.admission_class) : "—",
      csvValue: (exam) => exam.admission_class != null ? String(exam.admission_class) : "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" },
    },
    {
      key: "gender", label: "", sortable: true,
      sortValue: (exam) => studentMap[exam.student_id]?.gender ?? "",
      render: (exam) => studentMap[exam.student_id]?.gender ?? "—",
      csvValue: (exam) => studentMap[exam.student_id]?.gender ?? "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)" },
    },
    {
      key: "school_start_year", label: "", sortable: true,
      sortValue: (exam) => exam.school_start_year,
      render: (exam) => formatAcademicYear(exam.school_start_year),
      csvValue: (exam) => formatAcademicYear(exam.school_start_year),
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
    },
    {
      key: "school", label: "", sortable: true,
      sortValue: (exam) => {
        const grsId = exam.admitted_school_id ?? exam.school_id;
        const sc = grsId != null ? schoolMap[grsId] : null;
        return sc?.name ?? exam.school_type ?? "";
      },
      render: (exam) => {
        const grsId = exam.admitted_school_id ?? exam.school_id;
        const sc = grsId != null ? schoolMap[grsId] : null;
        if (sc) return (
          <span>
            {sc.name}
            <span style={{ marginLeft: 5, fontSize: 10, background: "var(--bg-badge)", padding: "1px 5px", borderRadius: 8, color: "var(--text-secondary)" }}>{sc.school_type}</span>
          </span>
        );
        return exam.school_type ?? "—";
      },
      csvValue: (exam) => {
        const grsId = exam.admitted_school_id ?? exam.school_id;
        const sc = grsId != null ? schoolMap[grsId] : null;
        return sc?.name ?? exam.school_type ?? "";
      },
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" },
    },
    {
      key: "school_type", label: "", sortable: true,
      sortValue: (exam) => exam.school_type ?? "",
      render: (exam) => exam.school_type ?? "—",
      csvValue: (exam) => exam.school_type ?? "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" },
    },
    {
      key: "stage", label: "", sortable: true,
      sortValue: (exam) => pipelineStage(exam),
      render: (exam) => <StageBadge exam={exam} />,
      csvValue: (exam) => {
        const idx = pipelineStage(exam);
        return idx >= 0 ? STAGES[idx].label : "Registered";
      },
      nowrap: true,
      minWidth: 180,
    },
    ...(["eligible", "applied", "admit_card", "appeared", "selected", "admitted"] as const).map((stageKey): Col<StudentExam> => ({
      key: stageKey,
      label: "",
      sortable: true,
      sortValue: (exam) => (exam[stageKey] ? 1 : 0),
      render: (exam) => (exam[stageKey] ? "Yes" : "—"),
      csvValue: (exam) => (exam[stageKey] ? "Yes" : "No"),
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" },
    })),
    {
      key: "exam_type_id", label: "", sortable: true,
      sortValue: (exam) => exam.exam_type_id ? (examTypeMap.get(exam.exam_type_id) ?? "") : "",
      render: (exam) => exam.exam_type_id ? (examTypeMap.get(exam.exam_type_id) ?? "—") : "—",
      csvValue: (exam) => exam.exam_type_id ? (examTypeMap.get(exam.exam_type_id) ?? "") : "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" },
    },
    {
      key: "exam_category_id", label: "", sortable: true,
      sortValue: (exam) => exam.exam_category_id ? (examCategoryMap.get(exam.exam_category_id) ?? "") : "",
      render: (exam) => exam.exam_category_id ? (examCategoryMap.get(exam.exam_category_id) ?? "—") : "—",
      csvValue: (exam) => exam.exam_category_id ? (examCategoryMap.get(exam.exam_category_id) ?? "") : "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" },
    },
    {
      key: "exam_center_id", label: "", sortable: true,
      sortValue: (exam) => exam.exam_center_id ? (examCenterMap.get(exam.exam_center_id) ?? "") : "",
      render: (exam) => exam.exam_center_id ? (examCenterMap.get(exam.exam_center_id) ?? "—") : "—",
      csvValue: (exam) => exam.exam_center_id ? (examCenterMap.get(exam.exam_center_id) ?? "") : "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" },
    },
    {
      key: "application_number", label: "", sortable: true,
      render: (exam) => exam.application_number ?? "—",
      csvValue: (exam) => exam.application_number ?? "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" },
    },
    {
      key: "roll_number", label: "", sortable: true,
      render: (exam) => exam.roll_number ?? "—",
      csvValue: (exam) => exam.roll_number ?? "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" },
    },
    {
      key: "no_exam_reason_id", label: "", sortable: true,
      sortValue: (exam) => exam.no_exam_reason_id ? (noExamReasonMap.get(exam.no_exam_reason_id) ?? "") : "",
      render: (exam) => exam.no_exam_reason_id ? (noExamReasonMap.get(exam.no_exam_reason_id) ?? "—") : "—",
      csvValue: (exam) => exam.no_exam_reason_id ? (noExamReasonMap.get(exam.no_exam_reason_id) ?? "") : "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" },
    },
    {
      key: "no_admit_reason_id", label: "", sortable: true,
      sortValue: (exam) => exam.no_admit_reason_id ? (noAdmitReasonMap.get(exam.no_admit_reason_id) ?? "") : "",
      render: (exam) => exam.no_admit_reason_id ? (noAdmitReasonMap.get(exam.no_admit_reason_id) ?? "—") : "—",
      csvValue: (exam) => exam.no_admit_reason_id ? (noAdmitReasonMap.get(exam.no_admit_reason_id) ?? "") : "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" },
    },
    {
      key: "scores", label: "", sortable: true,
      sortValue: (exam) => exam.scores.reduce<number>((sum, s) => sum + (s.score != null ? Number(s.score) : 0), 0),
      render: (exam) => {
        const total   = exam.scores.reduce<number>((sum, s) => sum + (s.score != null ? Number(s.score) : 0), 0);
        const hasScr  = exam.scores.length > 0 && exam.scores.some(s => s.score != null);
        return hasScr ? (
          <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {exam.scores.filter(s => s.score != null).map(s => `${s.subject?.name ?? "S" + s.subject_id}:${s.score}`).join(" ")}
            {" "}<strong style={{ color: "var(--text-primary)" }}>={total}</strong>
          </span>
        ) : "—";
      },
      csvValue: (exam) => {
        const total = exam.scores.reduce<number>((sum, s) => sum + (s.score != null ? Number(s.score) : 0), 0);
        return exam.scores.some(s => s.score != null) ? String(total) : "";
      },
      tdStyle: {
        fontSize: 12,
        color: "var(--text-secondary)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: 360,
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [studentMap, schoolMap, kutirMap2, clusterMap, areaMap, districtMap, examCategoryMap, examCenterMap, examTypeMap, noExamReasonMap, noAdmitReasonMap]);

  const { isVisible, orderedMetas } = useFieldConfig("admissions", ADMISSIONS_FIELDS);
  const columns = useMemo(() => {
    if (import.meta.env.DEV) {
      for (const key of ADMISSIONS_FIELD_KEYS) {
        if (!allColumns.some((c) => c.key === key)) {
          throw new Error(`AdmissionsPage missing renderer for ADMISSIONS_FIELDS key: ${key}`);
        }
      }
    }
    const colByKey = new Map(allColumns.map(c => [c.key, c]));
    const base = orderedMetas
      .filter(m => isVisible(m.key))
      .map(m => {
        const col = colByKey.get(m.key);
        return col ? { ...col, label: m.label } : undefined;
      })
      .filter((c): c is NonNullable<typeof c> => c != null);
    return wrapColumnsForOffline<
      OfflineAdmissionDraftListItem | OfflineAdmissionPendingListItem,
      StudentExam
    >(base, (row): row is OfflineAdmissionDraftListItem | OfflineAdmissionPendingListItem => isOfflineLocalAdmission(row), (row, key) => {
      if (key === "student") {
        const label = isOfflineAdmissionDraft(row)
          ? row.student_label
          : row.student_label ?? `Student #${row.payload.student_id}`;
        return offlineStudentNameCell(label, isOfflineAdmissionPending(row) ? "pending" : "draft");
      }
      if (key === "school_start_year") {
        const y = isOfflineAdmissionDraft(row) ? row.school_start_year : row.payload.school_start_year;
        return formatAcademicYear(y);
      }
      return undefined;
    });
  }, [allColumns, orderedMetas, isVisible]);

  const filterSelectStyle: React.CSSProperties = {
    padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)",
    background: "var(--bg-input)", color: "var(--text-primary)", fontSize: 14, flexShrink: 0,
  };

  const subtitle =
    pendingOfflineCount > 0
      ? `School entrance exam pipeline · ${pendingOfflineCount} admission${pendingOfflineCount === 1 ? "" : "s"} waiting to upload`
      : "School entrance exam pipeline tracking";

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
      <GrsTable<AdmissionTableRow>
        title="Admissions"
        subtitle={subtitle}
        columns={columns}
        data={tableRows}
        pagination={{ page, pageSize: PAGE_SIZE, total: examTotal, onPageChange: setPage }}
        rowKey={(exam) => {
          if (isOfflineAdmissionDraft(exam)) return offlineAdmissionDraftRowKey(exam);
          if (isOfflineAdmissionPending(exam)) return offlineAdmissionPendingRowKey(exam);
          return String(exam.id);
        }}
        isLoading={isLoading}
        emptyMessage={`No admissions for ${formatAcademicYear(year)}.`}
        searchable
        searchPlaceholder="Search student..."
        externalSearch={searchQuery}
        onExternalSearch={handleSearch}
        activeFilterCount={countActiveFilters(
          year !== CURRENT_YEAR ? year : "",
          filterDistrict,
          filterCluster,
          filterKutir,
        )}
        filters={
          <GeoFilterBar
            leading={
              <select
                value={year}
                onChange={e => { setYear(Number(e.target.value)); setPage(1); }}
                style={{ ...filterSelectStyle, width: 110 }}
              >
                {YEARS.map(y => <option key={y} value={y}>{formatAcademicYear(y)}</option>)}
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
            kutirEmptyLabel="-- Select Kutir --"
          />
        }
        exportFilename="admissions"
        printTitle="Admissions"
        onAdd={() => { saveFilters(); navigate(`new?year=${year}`); }}
        actions={(exam) => {
          if (isOfflineAdmissionDraft(exam)) {
            const label = exam.student_label;
            return {
              onView: () => { saveFilters(); navigate(`draft/${exam.localId}`); },
              onEdit: () => { saveFilters(); navigate(`draft/${exam.localId}`); },
              onDelete: () => setPendingDelete({ kind: "draft", localId: exam.localId, label }),
            };
          }
          if (isOfflineAdmissionPending(exam)) {
            const label = exam.student_label ?? `Student #${exam.payload.student_id}`;
            return {
              onDelete: () => setPendingDelete({ kind: "pending", localId: exam.localId, label }),
            };
          }
          return {
            onView: () => { saveFilters(); navigate(String(exam.id)); },
            onEdit: () => { saveFilters(); navigate(`${exam.id}?edit=1`); },
            onDelete: () => setPendingDelete({ kind: "exam", id: exam.id }),
          };
        }}
      />
      {pendingDelete && (
        <ConfirmDialog
          message={
            pendingDelete.kind === "draft"
              ? <>Remove saved offline admission for <strong>{pendingDelete.label}</strong>?</>
              : pendingDelete.kind === "pending"
                ? <>Remove admission waiting to sync for <strong>{pendingDelete.label}</strong>?</>
                : "Delete this admission?"
          }
          onConfirm={() => {
            if (pendingDelete.kind === "draft") {
              void removeAdmissionDraft(pendingDelete.localId);
            } else if (pendingDelete.kind === "pending") {
              void removePendingAdmission(pendingDelete.localId);
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
