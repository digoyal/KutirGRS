import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import { listVisits } from "../api/visits";
import type { KutirVisit } from "../api/visits";

interface Kutir {
  id: number;
  name: string;
  code: string;
  cluster_id: number | null;
  teacher_id: number | null;
  address: string | null;
  contact_number: string | null;
  cluster?: { id: number; name: string; area?: { id: number; name: string; district?: { id: number; name: string; zone?: { id: number; name: string } } } };
  teacher?: { id: number; username: string; title: string } | null;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  father_name: string | null;
  dob: string | null;
  gender: "M" | "F";
  category?: { id: number; name: string } | null;
}

function StarRating({ value }: { value: number }) {
  return (
    <span style={{ color: "#f6ad55", fontSize: "0.85rem" }}>
      {"★".repeat(value)}
      <span style={{ color: "#e2e8f0" }}>{"★".repeat(5 - value)}</span>
    </span>
  );
}

function SectionHead({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#4a6fa5",
        borderBottom: "2px solid #bee3f8",
        paddingBottom: 5,
        marginBottom: 14,
        marginTop: 28,
      }}
    >
      {label}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: "1px solid #f0f4f8", fontSize: "0.875rem" }}>
      <span style={{ width: 140, color: "#718096", fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "#2d3748" }}>{value ?? "—"}</span>
    </div>
  );
}

export default function KutirDetailPage() {
  const { id } = useParams<{ id: string }>();
  const kutirId = Number(id);
  const [activeTab, setActiveTab] = useState<"students" | "visits">("students");

  const { data: kutir, isLoading: kutirLoading } = useQuery<Kutir>({
    queryKey: ["kutir", kutirId],
    queryFn: async () => (await api.get(`/kutirs/${kutirId}`)).data,
    enabled: !!kutirId,
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["students", { kutir_id: kutirId }],
    queryFn: async () =>
      (await api.get("/students", { params: { kutir_id: kutirId, limit: 500 } })).data,
    enabled: !!kutirId,
  });

  const { data: visits = [], isLoading: visitsLoading } = useQuery<KutirVisit[]>({
    queryKey: ["visits", kutirId],
    queryFn: () => listVisits({ kutir_id: kutirId }),
    enabled: !!kutirId,
  });

  const sortedVisits = [...visits].sort(
    (a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
  );

  if (kutirLoading) return <div style={{ padding: 32, color: "#718096" }}>Loading…</div>;
  if (!kutir) return <div style={{ padding: 32, color: "#c53030" }}>Kutir not found.</div>;

  const breadcrumb = [
    kutir.cluster?.area?.district?.zone?.name,
    kutir.cluster?.area?.district?.name,
    kutir.cluster?.area?.name,
    kutir.cluster?.name,
  ]
    .filter(Boolean)
    .join(" › ");

  return (
    <div style={{ padding: "24px 32px" }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: "0.8rem", color: "#718096", marginBottom: 8 }}>
        <Link to="/kutirs" style={{ color: "#4a6fa5", textDecoration: "none" }}>
          Kutirs
        </Link>
        {" › "}
        <span>{kutir.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
        <div>
          <h2 style={{ margin: 0, color: "#1a365d", fontSize: "1.4rem" }}>
            {kutir.name}
          </h2>
          <div style={{ marginTop: 4, display: "flex", gap: 8, alignItems: "center" }}>
            <span
              style={{
                background: "#ebf4ff",
                color: "#2c5282",
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: "0.8rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              {kutir.code}
            </span>
            {breadcrumb && (
              <span style={{ fontSize: "0.82rem", color: "#718096" }}>{breadcrumb}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span
            style={{
              background: "#f0fff4",
              color: "#276749",
              borderRadius: 6,
              padding: "6px 14px",
              fontSize: "0.85rem",
              fontWeight: 600,
              border: "1px solid #9ae6b4",
            }}
          >
            {students.length} Students
          </span>
          <span
            style={{
              background: "#faf5ff",
              color: "#553c9a",
              borderRadius: 6,
              padding: "6px 14px",
              fontSize: "0.85rem",
              fontWeight: 600,
              border: "1px solid #d6bcfa",
            }}
          >
            {visits.length} Visits
          </span>
        </div>
      </div>

      {/* Kutir info */}
      <SectionHead label="Kutir Details" />
      <div style={{ maxWidth: 600 }}>
        {kutir.address && <InfoRow label="Address" value={kutir.address} />}
        {kutir.contact_number && <InfoRow label="Contact" value={kutir.contact_number} />}
        <InfoRow
          label="Teacher"
          value={
            kutir.teacher ? (
              <span>
                {kutir.teacher.username}
                <span style={{ color: "#718096", fontSize: "0.8rem", marginLeft: 6 }}>
                  ({kutir.teacher.title})
                </span>
              </span>
            ) : (
              <span style={{ color: "#a0aec0" }}>Not assigned</span>
            )
          }
        />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginTop: 28, borderBottom: "2px solid #e2e8f0" }}>
        {(["students", "visits"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid #2c5282" : "2px solid transparent",
              marginBottom: -2,
              padding: "8px 20px",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: activeTab === tab ? 700 : 400,
              color: activeTab === tab ? "#2c5282" : "#718096",
              transition: "color 0.15s",
            }}
          >
            {tab === "students" ? `Students (${students.length})` : `Visits (${visits.length})`}
          </button>
        ))}
      </div>

      {/* ── Students tab ── */}
      {activeTab === "students" && (
        <div style={{ marginTop: 16 }}>
          {studentsLoading ? (
            <p style={{ color: "#718096" }}>Loading students…</p>
          ) : students.length === 0 ? (
            <p style={{ color: "#a0aec0", textAlign: "center", padding: "32px 0" }}>
              No students enrolled in this kutir.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tbl.table}>
                <thead>
                  <tr style={{ background: "#ebf4ff" }}>
                    <th style={tbl.th}>Name</th>
                    <th style={tbl.th}>Father</th>
                    <th style={tbl.th}>Gender</th>
                    <th style={tbl.th}>DOB</th>
                    <th style={tbl.th}>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr
                      key={s.id}
                      style={{ background: i % 2 === 0 ? "#fff" : "#f7fafc" }}
                    >
                      <td style={tbl.td}>
                        <Link
                          to={`/students/${s.id}`}
                          style={{ color: "#2c5282", textDecoration: "none", fontWeight: 600 }}
                        >
                          {s.first_name} {s.last_name}
                        </Link>
                      </td>
                      <td style={tbl.td}>{s.father_name ?? "—"}</td>
                      <td style={tbl.td}>
                        <span
                          style={{
                            background: s.gender === "F" ? "#fef3c7" : "#ebf4ff",
                            color: s.gender === "F" ? "#92400e" : "#2c5282",
                            borderRadius: 4,
                            padding: "2px 8px",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                          }}
                        >
                          {s.gender === "M" ? "Boy" : "Girl"}
                        </span>
                      </td>
                      <td style={tbl.td}>
                        {s.dob
                          ? new Date(s.dob).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td style={tbl.td}>
                        {s.category ? (
                          <span
                            style={{
                              background: "#f0fff4",
                              color: "#276749",
                              borderRadius: 4,
                              padding: "2px 8px",
                              fontSize: "0.78rem",
                            }}
                          >
                            {s.category.name}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Visits tab ── */}
      {activeTab === "visits" && (
        <div style={{ marginTop: 16 }}>
          {visitsLoading ? (
            <p style={{ color: "#718096" }}>Loading visits…</p>
          ) : sortedVisits.length === 0 ? (
            <p style={{ color: "#a0aec0", textAlign: "center", padding: "32px 0" }}>
              No visits recorded for this kutir.{" "}
              <Link to="/visits" style={{ color: "#4a6fa5" }}>
                Log one →
              </Link>
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tbl.table}>
                <thead>
                  <tr style={{ background: "#ebf4ff" }}>
                    <th style={tbl.th}>Date</th>
                    <th style={tbl.th}>Attendance</th>
                    <th style={tbl.th}>Timetable</th>
                    <th style={tbl.th}>Timeslots</th>
                    <th style={tbl.th}>Workbook</th>
                    <th style={tbl.th}>Performance</th>
                    <th style={tbl.th}>Cleanliness</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVisits.map((v, i) => (
                    <tr key={v.id} style={{ background: i % 2 === 0 ? "#fff" : "#f7fafc" }}>
                      <td style={tbl.td}>
                        {new Date(v.visit_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td style={tbl.td}>{v.avg_attendance_last_week}</td>
                      <td style={tbl.td}>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            color: v.follow_timetable && v.follow_monthly_plan ? "#276749" : "#c53030",
                          }}
                        >
                          {v.follow_timetable && v.follow_monthly_plan ? "✓ Yes" : "✗ No"}
                        </span>
                      </td>
                      <td style={tbl.td}>
                        <span
                          style={{
                            background: v.timeslot_utilization ? "#c6f6d5" : "#fed7d7",
                            color: v.timeslot_utilization ? "#276749" : "#c53030",
                            borderRadius: 4,
                            padding: "2px 7px",
                            fontSize: "0.75rem",
                          }}
                        >
                          {v.timeslot_utilization ? "On Track" : "Missed"}
                        </span>
                      </td>
                      <td style={tbl.td}>
                        <span style={{ fontSize: "0.82rem" }}>{v.workbook_percentage}%</span>
                        <span
                          style={{
                            marginLeft: 5,
                            fontSize: "0.75rem",
                            color:
                              v.workbook_completion === "Upto Date"
                                ? "#276749"
                                : v.workbook_completion === "Partial Upto Date"
                                ? "#744210"
                                : "#c53030",
                          }}
                        >
                          {v.workbook_completion === "Upto Date"
                            ? "✓"
                            : v.workbook_completion === "Partial Upto Date"
                            ? "~"
                            : "✗"}
                        </span>
                      </td>
                      <td style={tbl.td}>
                        <StarRating value={v.kutir_performance} />
                      </td>
                      <td style={tbl.td}>
                        <StarRating value={v.cleanliness} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const tbl: Record<string, React.CSSProperties> = {
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
  th: {
    padding: "10px 12px",
    textAlign: "left",
    fontWeight: 600,
    color: "#2c5282",
    borderBottom: "2px solid #bee3f8",
  },
  td: { padding: "10px 12px", borderBottom: "1px solid #e2e8f0" },
};
