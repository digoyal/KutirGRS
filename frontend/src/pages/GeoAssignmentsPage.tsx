import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listGeoAssignments, type GeoAssignment } from "../api/geo";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";
import { grs } from "../styles/grs";

const LEVELS = ["", "Zone", "District", "Area", "Cluster", "Kutir"] as const;
const ROLES = [
  "",
  "Regional Head",
  "District Anchor",
  "Education Coordinator",
  "Cluster Coordinator",
  "Teacher",
] as const;

type Row = GeoAssignment & { id: string };

export default function GeoAssignmentsPage() {
  const [levelFilter, setLevelFilter] = useState<(typeof LEVELS)[number]>("");
  const [roleFilter, setRoleFilter] = useState<(typeof ROLES)[number]>("");

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["geo-assignments", levelFilter || null],
    queryFn: () => listGeoAssignments(levelFilter || undefined),
  });

  const tableRows = useMemo<Row[]>(() => {
    let list = rows.map((r) => ({
      ...r,
      id: `${r.entity_level}-${r.entity_id}-${r.user_id ?? "unassigned"}`,
    }));
    if (roleFilter) {
      list = list.filter((r) => r.role === roleFilter);
    }
    return list;
  }, [rows, roleFilter]);

  const columns = useMemo<Col<Row>[]>(
    () => [
      { key: "entity_level", label: "Entity Level", sortable: true },
      {
        key: "entity_name",
        label: "Entity Name",
        sortable: true,
        render: (r) => <strong>{r.entity_name}</strong>,
      },
      {
        key: "parent_chain",
        label: "Parent chain",
        sortable: true,
        wrap: true,
        render: (r) => r.parent_chain || "—",
      },
      { key: "role", label: "Role", sortable: true },
      {
        key: "user_display_name",
        label: "User",
        sortable: true,
        render: (r) => r.user_display_name ?? "—",
      },
      {
        key: "username",
        label: "Username",
        sortable: true,
        render: (r) => r.username ?? "—",
      },
      {
        key: "user_active",
        label: "Active",
        sortable: true,
        render: (r) =>
          r.user_active == null ? "—" : r.user_active ? "Yes" : "No",
      },
    ],
    [],
  );

  const activeFilterCount =
    (levelFilter ? 1 : 0) + (roleFilter ? 1 : 0);

  return (
    <div className="grs-page" style={{ padding: "24px 28px" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Link to="/geo" style={{ ...grs.btnSecondary, textDecoration: "none" }}>
          ← Geography
        </Link>
        <h1 className="grs-page-title" style={{ margin: 0, flex: "1 1 auto" }}>
          Geo Assignments
        </h1>
      </div>

      <GrsTable<Row>
        title="Geo Assignments"
        columns={columns}
        data={tableRows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage={
          isError
            ? "Could not load assignments."
            : "No geography entities in your scope."
        }
        searchable
        searchPlaceholder="Search assignments…"
        exportFilename="geo-assignments"
        printTitle="Geo Assignments"
        filters={
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: "1 1 140px", minWidth: 0 }}>
              <label style={grs.fieldLabel}>Entity level</label>
              <select
                style={grs.select}
                value={levelFilter}
                onChange={(e) =>
                  setLevelFilter(e.target.value as (typeof LEVELS)[number])
                }
              >
                {LEVELS.map((l) => (
                  <option key={l || "all"} value={l}>
                    {l || "All levels"}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: "1 1 160px", minWidth: 0 }}>
              <label style={grs.fieldLabel}>Role</label>
              <select
                style={grs.select}
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value as (typeof ROLES)[number])
                }
              >
                {ROLES.map((r) => (
                  <option key={r || "all"} value={r}>
                    {r || "All roles"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        }
        activeFilterCount={activeFilterCount}
      />
    </div>
  );
}
