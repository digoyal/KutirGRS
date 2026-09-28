import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listExamCenters, listDistricts, deleteExamCenter } from "../api/geo";
import type { ExamCenter } from "../api/geo";
import { useAuth } from "../context/AuthContext";
import { grs } from "../styles/grs";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { EXAM_CENTERS_FIELDS } from "../constants/examCentersFields";

const _savedFilters = (() => {
  try {
    const s = sessionStorage.getItem("exam_centers_filter_state");
    if (s) { sessionStorage.removeItem("exam_centers_filter_state"); return JSON.parse(s); }
  } catch {}
  return null;
})();

export default function ExamCentersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.title === "Admin";
  const canManage = user?.title !== "Teacher";

  const [filterDistrict, setFilterDistrict] = useState<number | "">(_savedFilters?.district ?? "");

  const { data: centers = [], isLoading } = useQuery({ queryKey: ["exam-centers"], queryFn: () => listExamCenters() });
  const { data: districts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });

  const districtMap = Object.fromEntries(districts.map(d => [d.id, d.name]));

  const scopedDistricts = isAdmin || !user
    ? districts
    : districts.filter(d => user.district_ids.includes(d.id));

  useEffect(() => {
    if (scopedDistricts.length === 1 && filterDistrict === "") setFilterDistrict(scopedDistricts[0].id);
  }, [scopedDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteMut = useMutation({
    mutationFn: deleteExamCenter,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exam-centers"] }),
  });

  function saveFilters() {
    sessionStorage.setItem("exam_centers_filter_state", JSON.stringify({ district: filterDistrict }));
  }

  const enriched = centers
    .filter(c => filterDistrict === "" || c.district_id === filterDistrict)
    .map(c => ({ ...c, districtName: districtMap[c.district_id ?? 0] ?? "" }));

  const allColumns: Col<typeof enriched[0]>[] = [
    { key: "name",         label: "Name",     sortable: true },
    { key: "street",       label: "Street",   sortable: true, render: r => r.street || "—" },
    { key: "city",         label: "City",     sortable: true, render: r => r.city || "—" },
    { key: "districtName", label: "District", sortable: true, render: r => r.districtName || "—" },
    { key: "state",        label: "State",    sortable: true, render: r => r.state || "—" },
    { key: "pincode",      label: "Pincode",  sortable: true, render: r => r.pincode || "—", tdStyle: { fontVariantNumeric: "tabular-nums" } },
  ];

  const { isVisible, orderedMetas } = useFieldConfig("examcenters", EXAM_CENTERS_FIELDS);
  const columns = useMemo(() => {
    const colByKey = new Map(allColumns.map(c => [c.key, c]));
    return orderedMetas.filter(m => isVisible(m.key)).map(m => colByKey.get(m.key)).filter((c): c is NonNullable<typeof c> => c != null);
  }, [allColumns, orderedMetas, isVisible]);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }}>
      <GrsTable
        title="Exam Centers"
        subtitle="Venues where entrance exams are held"
        columns={columns}
        data={enriched}
        rowKey={r => r.id}
        isLoading={isLoading}
        emptyMessage="No exam centers found."
        actions={r => ({
          onView: () => { saveFilters(); navigate(`/exam-centers/${r.id}`); },
          ...(canManage ? {
            onEdit: () => { saveFilters(); navigate(`/exam-centers/${r.id}?edit=1`); },
            onDelete: () => { if (confirm("Delete this exam center?")) deleteMut.mutate(r.id); },
          } : {}),
        })}
        searchable
        searchPlaceholder="Search centers…"
        filters={
          <select value={filterDistrict}
            onChange={e => setFilterDistrict(e.target.value === "" ? "" : Number(e.target.value))}
            style={grs.filterSelect}>
            <option value="">All Districts</option>
            {scopedDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        }
        exportFilename="exam-centers"
        printTitle="Exam Centers"
        onAdd={canManage ? () => navigate("/exam-centers/new") : undefined}
      />
    </div>
  );
}
