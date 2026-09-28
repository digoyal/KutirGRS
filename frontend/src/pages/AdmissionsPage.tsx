import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { listExamsPaged, deleteExam } from "../api/admissions";
import type { StudentExam } from "../api/admissions";
import { listStudents } from "../api/students";
import { listSchools } from "../api/schools";
import { useAuth } from "../context/AuthContext";
import { listKutirs } from "../api/kutirs";
import { grs } from "../styles/grs";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { ADMISSIONS_FIELDS } from "../constants/admissionsFields";
import { listDistricts, listAreas, listClusters, listExamCenters, listExamCategories } from "../api/geo";
import { STAGES, StageBadge, pipelineStage } from "../components/admissions-pipeline";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 2 + i);

export default function AdmissionsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.title === "Admin";

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

  // Restore filter state saved before navigating to a detail/add page
  const _savedFilters = (() => {
    try {
      const s = sessionStorage.getItem("admissions_filter_state");
      if (s) { sessionStorage.removeItem("admissions_filter_state"); return JSON.parse(s); }
    } catch {}
    return null;
  })();

  const [year, setYear] = useState<number>(_savedFilters?.year ?? CURRENT_YEAR);

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
  const [filterCluster, setFilterCluster]   = useState<number | "">(_savedFilters?.cluster  ?? defaultCluster);
  const [filterKutir, setFilterKutir]       = useState<number | "">(_savedFilters?.kutir    ?? defaultKutir);
  const [page, setPage] = useState<number>(_savedFilters?.page ?? 1);

  const PAGE_SIZE = 25;
  const hasFilter = filterDistrict !== "" || filterCluster !== "" || filterKutir !== "";

  const { data: examPage = { items: [], total: 0 }, isLoading } = useQuery({
    queryKey: ["student-exams", year, filterDistrict, filterCluster, filterKutir, page],
    queryFn: () => listExamsPaged({
      school_start_year: year,
      district_id: filterDistrict !== "" ? filterDistrict : undefined,
      cluster_id:  filterCluster  !== "" ? filterCluster  : undefined,
      kutir_id:    filterKutir    !== "" ? filterKutir    : undefined,
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
  const { data: allDistricts= [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });
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

  const filterClusters = scopedClusters.filter(c =>
    filterDistrict === "" || areaMap.get(c.area_id)?.district_id === filterDistrict
  );
  const filterKutirs = scopedKutirs.filter(k =>
    filterCluster !== "" ? k.cluster_id === filterCluster : filterKutir !== "" ? k.id === filterKutir : false
  );

  const deleteMut = useMutation({
    mutationFn: deleteExam,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student-exams"] }),
  });

  function saveFilters() {
    sessionStorage.setItem("admissions_filter_state", JSON.stringify({
      year, district: filterDistrict, cluster: filterCluster, kutir: filterKutir, page,
    }));
  }

  const allColumns = useMemo((): Col<StudentExam>[] => [
    {
      key: "district", label: "District", sortable: true,
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
      key: "kutir", label: "Kutir", sortable: true,
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
      key: "student", label: "Student", sortable: true,
      sortValue: (exam) => {
        const s = studentMap[exam.student_id];
        return s ? `${s.first_name} ${s.last_name}`.toLowerCase() : "";
      },
      render: (exam) => {
        const s = studentMap[exam.student_id];
        return s ? (
          <Link to={`/students/${s.id}`} style={{ color: "var(--text-primary)", textDecoration: "none", fontWeight: 500, fontSize: 13 }}>
            {s.first_name} {s.last_name}
          </Link>
        ) : `#${exam.student_id}`;
      },
      csvValue: (exam) => {
        const s = studentMap[exam.student_id];
        return s ? `${s.first_name} ${s.last_name}` : String(exam.student_id);
      },
      tdStyle: { whiteSpace: "nowrap" },
    },
    {
      key: "gender", label: "Gender", sortable: true,
      sortValue: (exam) => studentMap[exam.student_id]?.gender ?? "",
      render: (exam) => studentMap[exam.student_id]?.gender ?? "—",
      csvValue: (exam) => studentMap[exam.student_id]?.gender ?? "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)" },
    },
    {
      key: "school", label: "School", sortable: true,
      sortValue: (exam) => {
        const sc = exam.school_id != null ? schoolMap[exam.school_id] : null;
        return sc?.name ?? exam.school_type ?? "";
      },
      render: (exam) => {
        const sc = exam.school_id != null ? schoolMap[exam.school_id] : null;
        if (sc) return (
          <span>
            {sc.name}
            <span style={{ marginLeft: 5, fontSize: 10, background: "var(--bg-badge)", padding: "1px 5px", borderRadius: 8, color: "var(--text-secondary)" }}>{sc.school_type}</span>
          </span>
        );
        return exam.school_type ?? "—";
      },
      csvValue: (exam) => {
        const sc = exam.school_id != null ? schoolMap[exam.school_id] : null;
        return sc?.name ?? exam.school_type ?? "";
      },
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" },
    },
    {
      key: "stage", label: "Stage", sortable: true,
      sortValue: (exam) => pipelineStage(exam),
      render: (exam) => <StageBadge exam={exam} />,
      csvValue: (exam) => {
        const idx = pipelineStage(exam);
        return idx >= 0 ? STAGES[idx].label : "Registered";
      },
    },
    {
      key: "exam_category_id", label: "Exam Cat.", sortable: true,
      sortValue: (exam) => exam.exam_category_id ? (examCategoryMap.get(exam.exam_category_id) ?? "") : "",
      render: (exam) => exam.exam_category_id ? (examCategoryMap.get(exam.exam_category_id) ?? "—") : "—",
      csvValue: (exam) => exam.exam_category_id ? (examCategoryMap.get(exam.exam_category_id) ?? "") : "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" },
    },
    {
      key: "exam_center_id", label: "Center", sortable: true,
      sortValue: (exam) => exam.exam_center_id ? (examCenterMap.get(exam.exam_center_id) ?? "") : "",
      render: (exam) => exam.exam_center_id ? (examCenterMap.get(exam.exam_center_id) ?? "—") : "—",
      csvValue: (exam) => exam.exam_center_id ? (examCenterMap.get(exam.exam_center_id) ?? "") : "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" },
    },
    {
      key: "application_number", label: "App #", sortable: true,
      render: (exam) => exam.application_number ?? "—",
      csvValue: (exam) => exam.application_number ?? "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" },
    },
    {
      key: "roll_number", label: "Roll #", sortable: true,
      render: (exam) => exam.roll_number ?? "—",
      csvValue: (exam) => exam.roll_number ?? "",
      tdStyle: { fontSize: 12, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" },
    },
    {
      key: "scores", label: "Scores", sortable: true,
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
    const colByKey = new Map(allColumns.map(c => [c.key, c]));
    return orderedMetas
      .filter(m => isVisible(m.key))
      .map(m => colByKey.get(m.key))
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
        emptyMessage={hasFilter ? `No admissions for ${year}.` : "Select a district, cluster, or kutir to view admissions."}
        searchable
        searchPlaceholder="Search student..."
        searchFn={(exam, q) => {
          const s = studentMap[exam.student_id];
          return s ? `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) : false;
        }}
        filters={<>
          <select
            value={year}
            onChange={e => { setYear(Number(e.target.value)); setPage(1); }}
            style={{ ...filterSelectStyle, width: 90 }}
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={filterDistrict}
            onChange={e => { setFilterDistrict(e.target.value === "" ? "" : Number(e.target.value)); setFilterCluster(""); setFilterKutir(""); setPage(1); }}
            style={{ ...filterSelectStyle, width: 140 }}
          >
            <option value="">All Districts</option>
            {scopedDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select
            value={filterCluster}
            onChange={e => { setFilterCluster(e.target.value === "" ? "" : Number(e.target.value)); setFilterKutir(""); setPage(1); }}
            disabled={filterDistrict === "" && filterKutir === ""}
            style={{ ...filterSelectStyle, width: 140 }}
          >
            <option value="">All Clusters</option>
            {filterClusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {filterCluster !== "" && (
            <select
              value={filterKutir}
              onChange={e => { setFilterKutir(e.target.value === "" ? "" : Number(e.target.value)); setPage(1); }}
              style={{ ...filterSelectStyle, width: 130 }}
            >
              <option value="">-- Select Kutir --</option>
              {filterKutirs.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          )}
        </>}
        exportFilename="admissions"
        printTitle="Admissions"
        onAdd={() => { saveFilters(); navigate(`new?year=${year}`); }}
        actions={(exam) => ({
          onView: () => { saveFilters(); navigate(String(exam.id)); },
          onEdit: () => { saveFilters(); navigate(`${exam.id}?edit=1`); },
          onDelete: () => { if (confirm("Delete this admission?")) deleteMut.mutate(exam.id); },
        })}
      />
    </div>
  );
}
