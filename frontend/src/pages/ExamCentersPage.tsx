import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listExamCenters, listDistricts, deleteExamCenter } from "../api/geo";
import { useAuth } from "../context/AuthContext";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";
import { GeoFilterBar } from "../components/GeoFilterBar";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { useBfcacheReload } from "../hooks/useBfcacheReload";
import { persistFilters, usePersistedFilterRestore } from "../hooks/usePersistedFilters";
import { EXAM_CENTERS_FIELDS } from "../constants/examCentersFields";
import { canManageExamCenters } from "../constants/roles";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { FilterId } from "../utils/geoFilters";

const STORAGE_KEY = "exam_centers_filter_state";

export default function ExamCentersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = canManageExamCenters(user?.title);

  useBfcacheReload();

  const saved = usePersistedFilterRestore<{ district?: FilterId }>(STORAGE_KEY);
  const [filterDistrict, setFilterDistrict] = useState<FilterId>(saved?.district ?? "");
  const [pendingDelete, setPendingDelete] = useState<{ id: number } | null>(null);

  const { data: centers = [], isLoading } = useQuery({ queryKey: ["exam-centers"], queryFn: () => listExamCenters() });
  const { data: districts = [] } = useQuery({
    queryKey: ["districts", { parivaar_presence: true }],
    queryFn: () => listDistricts(undefined, { parivaar_presence: true }),
  });

  const districtMap = Object.fromEntries(districts.map(d => [d.id, d.name]));
  // Data sheet: Exam Centers are global — filter dropdown shows all districts

  const deleteMut = useMutation({
    mutationFn: deleteExamCenter,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exam-centers"] }),
  });

  function saveFilters() {
    persistFilters(STORAGE_KEY, { district: filterDistrict });
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
            onDelete: () => setPendingDelete({ id: r.id }),
          } : {}),
        })}
        searchable
        searchPlaceholder="Search centers…"
        filters={
          <GeoFilterBar
            district={filterDistrict}
            onChange={({ district }) => setFilterDistrict(district)}
            districts={districts}
            showCluster={false}
            showKutir={false}
          />
        }
        exportFilename="exam-centers"
        printTitle="Exam Centers"
        onAdd={canManage ? () => navigate("/exam-centers/new") : undefined}
      />
      {pendingDelete && (
        <ConfirmDialog
          message="Delete this exam center?"
          onConfirm={() => { deleteMut.mutate(pendingDelete.id); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
