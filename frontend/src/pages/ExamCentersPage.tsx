import { useState, useMemo, type ReactNode, type CSSProperties } from "react";
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
import { EXAM_CENTERS_FIELDS, EXAM_CENTERS_FIELD_KEYS } from "../constants/examCentersFields";
import { canManageExamCenters } from "../constants/roles";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { countActiveFilters, type FilterId } from "../utils/geoFilters";

const STORAGE_KEY = "exam_centers_filter_state";

type EnrichedCenter = Awaited<ReturnType<typeof listExamCenters>>[number] & { districtName: string };

type CenterColRenderer = {
  render?: (r: EnrichedCenter) => ReactNode;
  csvValue?: (r: EnrichedCenter) => string;
  sortValue?: (r: EnrichedCenter) => string | number;
  tdStyle?: CSSProperties;
  sortable?: boolean;
};

function examCenterColRenderers(): Record<string, CenterColRenderer> {
  const renderers: Record<string, CenterColRenderer> = {
    name: { sortable: true },
    street: {
      sortable: true,
      render: (r) => r.street || "—",
      csvValue: (r) => r.street || "",
    },
    city: {
      sortable: true,
      render: (r) => r.city || "—",
      csvValue: (r) => r.city || "",
    },
    districtName: {
      sortable: true,
      render: (r) => r.districtName || "—",
      csvValue: (r) => r.districtName || "",
    },
    state: {
      sortable: true,
      render: (r) => r.state || "—",
      csvValue: (r) => r.state || "",
    },
    pincode: {
      sortable: true,
      render: (r) => r.pincode || "—",
      csvValue: (r) => r.pincode || "",
      tdStyle: { fontVariantNumeric: "tabular-nums" },
    },
  };
  if (import.meta.env.DEV) {
    for (const key of EXAM_CENTERS_FIELD_KEYS) {
      if (!(key in renderers)) {
        throw new Error(`ExamCentersPage missing renderer for EXAM_CENTERS_FIELDS key: ${key}`);
      }
    }
  }
  return renderers;
}

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

  const enriched: EnrichedCenter[] = centers
    .filter(c => filterDistrict === "" || c.district_id === filterDistrict)
    .map(c => ({ ...c, districtName: districtMap[c.district_id ?? 0] ?? "" }));

  // List columns, labels, visibility, order, and CSV headers all come from EXAM_CENTERS_FIELDS.
  const { isVisible, orderedMetas } = useFieldConfig("examcenters", EXAM_CENTERS_FIELDS);
  const columns = useMemo<Col<EnrichedCenter>[]>(() => {
    const renderers = examCenterColRenderers();
    return orderedMetas
      .filter((m) => isVisible(m.key))
      .map((meta): Col<EnrichedCenter> => {
        const r = renderers[meta.key] ?? {};
        return {
          key: meta.key,
          label: meta.label,
          sortable: r.sortable ?? true,
          render: r.render,
          csvValue: r.csvValue,
          sortValue: r.sortValue,
          tdStyle: r.tdStyle,
        };
      });
  }, [orderedMetas, isVisible]);

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
        activeFilterCount={countActiveFilters(filterDistrict)}
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
