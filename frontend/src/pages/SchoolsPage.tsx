import { useState, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { listSchools, deleteSchool, type School } from "../api/schools";
import { GrsTable, type Col } from "../components/GrsTable";
import { useFieldConfig } from "../hooks/useFieldConfig";
import { useBfcacheReload } from "../hooks/useBfcacheReload";
import { SCHOOLS_FIELDS, SCHOOLS_FIELD_KEYS } from "../constants/schoolsFields";
import { canManageSchools } from "../constants/roles";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { grs } from "../styles/grs";

const SCHOOL_TYPES = ["EMRS", "JNV", "KSP", "MRS", "GNV", "KGBV", "SportsBoys", "SportsGirls", "Other"];

const TYPE_BADGE: Record<string, { bg: string; fg: string }> = {
  EMRS:        { bg: "var(--badge-blue-bg)",   fg: "var(--badge-blue-fg)"   },
  JNV:         { bg: "var(--badge-green-bg)",  fg: "var(--badge-green-fg)"  },
  KSP:         { bg: "var(--badge-purple-bg)", fg: "var(--badge-purple-fg)" },
  MRS:         { bg: "var(--badge-amber-bg)",  fg: "var(--badge-amber-fg)"  },
  GNV:         { bg: "var(--badge-red-bg)",    fg: "var(--badge-red-fg)"    },
  KGBV:        { bg: "var(--badge-yellow-bg)", fg: "var(--badge-yellow-fg)" },
  SportsBoys:  { bg: "var(--badge-teal-bg)",   fg: "var(--badge-teal-fg)"   },
  SportsGirls: { bg: "var(--badge-pink-bg)",   fg: "var(--badge-pink-fg)"   },
};
function typeBadge(type: string) {
  return TYPE_BADGE[type] ?? { bg: "var(--badge-grey-bg)", fg: "var(--badge-grey-fg)" };
}

const _savedFilters = (() => {
  try {
    const s = sessionStorage.getItem("schools_filter_state");
    if (s) { sessionStorage.removeItem("schools_filter_state"); return JSON.parse(s); }
  } catch {}
  return null;
})();

interface SchoolWithDistrict extends School {
  district?: { id: number; name: string } | null;
}

type SchoolColRenderer = {
  render?: (s: SchoolWithDistrict) => ReactNode;
  csvValue?: (s: SchoolWithDistrict) => string;
  sortValue?: (s: SchoolWithDistrict) => string | number;
  sortable?: boolean;
};

function schoolColRenderers(): Record<string, SchoolColRenderer> {
  const renderers: Record<string, SchoolColRenderer> = {
    name: {
      sortable: true,
      render: (s) => <strong style={{ color: "var(--text-primary)" }}>{s.name}</strong>,
    },
    school_type: {
      sortable: true,
      render: (s) => {
        const { bg, fg } = typeBadge(s.school_type);
        return <span style={{ ...grs.badge, background: bg, color: fg }}>{s.school_type}</span>;
      },
    },
    city: {
      render: (s) => s.city ?? "—",
      csvValue: (s) => s.city ?? "",
    },
    district: {
      render: (s) => s.district ? s.district.name : s.district_id ? `#${s.district_id}` : "—",
      csvValue: (s) => s.district?.name ?? (s.district_id ? `#${s.district_id}` : ""),
      sortValue: (s) => (s.district?.name ?? "").toLowerCase(),
    },
    state: { sortable: true },
    street: {
      sortable: false,
      render: (s) => s.street ?? "—",
      csvValue: (s) => s.street ?? "",
    },
    pincode: {
      sortable: true,
      render: (s) => s.pincode ?? "—",
      csvValue: (s) => s.pincode ?? "",
    },
  };
  if (import.meta.env.DEV) {
    for (const key of SCHOOLS_FIELD_KEYS) {
      if (!(key in renderers)) {
        throw new Error(`SchoolsPage missing renderer for SCHOOLS_FIELDS key: ${key}`);
      }
    }
  }
  return renderers;
}

export default function SchoolsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = canManageSchools(user?.title);

  useBfcacheReload();

  const [filterType, setFilterType] = useState(_savedFilters?.type ?? "");
  const [pendingDelete, setPendingDelete] = useState<{ id: number; name: string } | null>(null);

  const { data: schools = [], isLoading } = useQuery<SchoolWithDistrict[]>({
    queryKey: ["schools"],
    queryFn: () => listSchools() as Promise<SchoolWithDistrict[]>,
  });

  const deleteMut = useMutation({
    mutationFn: deleteSchool,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schools"] }),
  });

  function saveFilters() {
    sessionStorage.setItem("schools_filter_state", JSON.stringify({ type: filterType }));
  }

  const typeCounts = SCHOOL_TYPES.reduce((acc, t) => {
    acc[t] = schools.filter(s => s.school_type === t).length;
    return acc;
  }, {} as Record<string, number>);

  const displayed = filterType ? schools.filter(s => s.school_type === filterType) : schools;

  // List columns, labels, visibility, order, and CSV headers all come from SCHOOLS_FIELDS.
  const { isVisible, orderedMetas } = useFieldConfig("schools", SCHOOLS_FIELDS);
  const columns = useMemo<Col<SchoolWithDistrict>[]>(() => {
    const renderers = schoolColRenderers();
    return orderedMetas
      .filter((m) => isVisible(m.key))
      .map((meta): Col<SchoolWithDistrict> => {
        const r = renderers[meta.key] ?? {};
        return {
          key: meta.key,
          label: meta.label,
          sortable: r.sortable ?? true,
          render: r.render,
          csvValue: r.csvValue,
          sortValue: r.sortValue,
        };
      });
  }, [orderedMetas, isVisible]);

  return (
    <div style={{ padding: "24px 28px" }}>
      <GrsTable
        title="Schools"
        columns={columns}
        data={displayed}
        rowKey={s => s.id}
        isLoading={isLoading}
        emptyMessage="No schools found."
        actions={s => ({
          onView: () => { saveFilters(); navigate(`/schools/${s.id}`); },
          ...(canManage ? {
            onEdit: () => { saveFilters(); navigate(`/schools/${s.id}?edit=1`); },
            onDelete: () => setPendingDelete({ id: s.id, name: s.name }),
          } : {}),
        })}
        searchable
        filters={
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={grs.filterSelect}>
            <option value="">All Types</option>
            {SCHOOL_TYPES.filter(t => typeCounts[t] > 0).map(t => (
              <option key={t} value={t}>{t} ({typeCounts[t]})</option>
            ))}
          </select>
        }
        searchFn={(s, q) => {
          const lower = q.toLowerCase();
          return s.name.toLowerCase().includes(lower)
            || (s.city ?? "").toLowerCase().includes(lower)
            || (s.district?.name ?? "").toLowerCase().includes(lower);
        }}
        exportFilename="schools"
        printTitle="Schools"
        onAdd={canManage ? () => navigate("/schools/new") : undefined}
      />
      {pendingDelete && (
        <ConfirmDialog
          message={<>Delete <strong>"{pendingDelete.name}"</strong>?</>}
          onConfirm={() => { deleteMut.mutate(pendingDelete.id); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
