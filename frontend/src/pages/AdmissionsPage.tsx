import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { listExamsPaged, deleteExam } from "../api/admissions";
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
import { listDistricts, listAreas, listClusters, listExamCenters, listExamCategories } from "../api/geo";
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

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 2 + i);
const STORAGE_KEY = "admissions_filter_state";

export default function AdmissionsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const unscoped = hasGlobalDataScope(user?.title);

  useBfcacheReload();

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
  const [pendingDelete, setPendingDelete] = useState<{ id: number } | null>(null);

  const PAGE_SIZE = 25;
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setDebouncedSearch(q); setPage(1); }, 300);
  };
  const hasFilter =
    filterDistrict !== "" || filterCluster !== "" || filterKutir !== "" || debouncedSearch !== "";

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
    enabled: hasFilter,
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

  const studentMap      = Object.fromEntries(students.map(s => [s.id, s]));
  const schoolMap       = Object.fromEntries(schools.map(sc => [sc.id, sc]));
  const kutirMap2       = new Map(allKutirs.map(k => [k.id, k]));
  const examCategoryMap = new Map(examCategories.map(c => [c.id, c.name]));
  const examCenterMap   = new Map(examCenters.map(c => [c.id, c.name]));
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
      key: "stage", label: "", sortable: true,
      sortValue: (exam) => pipelineStage(exam),
      render: (exam) => <StageBadge exam={exam} />,
      csvValue: (exam) => {
        const idx = pipelineStage(exam);
        return idx >= 0 ? STAGES[idx].label : "Registered";
      },
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
      tdStyle: { fontSize: 12, color: "var(--text-secondary)" },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [studentMap, schoolMap, kutirMap2, clusterMap, areaMap, districtMap, examCategoryMap, examCenterMap]);

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
    return orderedMetas
      .filter(m => isVisible(m.key))
      .map(m => {
        const col = colByKey.get(m.key);
        return col ? { ...col, label: m.label } : undefined;
      })
      .filter((c): c is NonNullable<typeof c> => c != null);
  }, [allColumns, orderedMetas, isVisible]);

  const filterSelectStyle: React.CSSProperties = {
    padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)",
    background: "var(--bg-input)", color: "var(--text-primary)", fontSize: 14, flexShrink: 0,
  };

  return (
    <div className="grs-page" style={{ padding: "24px 28px", maxWidth: 1200 }}>
      <GrsTable<StudentExam>
        title="Admissions"
        subtitle="School entrance exam pipeline tracking"
        columns={columns}
        data={exams}
        pagination={hasFilter ? { page, pageSize: PAGE_SIZE, total: examTotal, onPageChange: setPage } : undefined}
        rowKey={exam => exam.id}
        isLoading={isLoading}
        emptyMessage={hasFilter ? `No admissions for ${formatAcademicYear(year)}.` : "Select a district or search by student name to view admissions."}
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
        actions={(exam) => ({
          onView: () => { saveFilters(); navigate(String(exam.id)); },
          onEdit: () => { saveFilters(); navigate(`${exam.id}?edit=1`); },
          onDelete: () => setPendingDelete({ id: exam.id }),
        })}
      />
      {pendingDelete && (
        <ConfirmDialog
          message="Delete this admission?"
          onConfirm={() => { deleteMut.mutate(pendingDelete.id); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
