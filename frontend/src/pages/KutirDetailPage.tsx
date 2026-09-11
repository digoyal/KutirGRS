import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";

interface Kutir {
  id: number;
  name: string;
  kutir_type: string;
  state: string;
  village?: string | null;
  street?: string | null;
  pincode?: string | null;
  enrollment_5th?: number | null;
  enrollment_8th?: number | null;
  cluster_id: number;
  district_id?: number | null;
  teacher_id?: number | null;
  cluster?: {
    id: number; name: string;
    area?: {
      id: number; name: string;
      district?: {
        id: number; name: string;
        zone?: { id: number; name: string };
      };
    };
  } | null;
  teacher?: {
    id: number; username: string; title?: string | null;
    first_name?: string | null; last_name?: string | null;
  } | null;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", gap: 12, padding: "8px 0",
      borderBottom: "1px solid var(--border)", fontSize: "0.875rem",
    }}>
      <span style={{ width: 160, color: "var(--text-secondary)", fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "var(--text-primary)" }}>{value ?? "—"}</span>
    </div>
  );
}

export default function KutirDetailPage() {
  const { id } = useParams<{ id: string }>();
  const kutirId = Number(id);

  const { data: kutir, isLoading } = useQuery<Kutir>({
    queryKey: ["kutir", kutirId],
    queryFn: async () => (await api.get(`/kutirs/${kutirId}`)).data,
    enabled: !!kutirId,
  });

  if (isLoading) return <div style={{ padding: 32, color: "var(--text-secondary)" }}>Loading…</div>;
  if (!kutir) return <div style={{ padding: 32, color: "var(--status-danger-fg)" }}>Kutir not found.</div>;

  const zone     = kutir.cluster?.area?.district?.zone?.name;
  const district = kutir.cluster?.area?.district?.name;
  const area     = kutir.cluster?.area?.name;
  const cluster  = kutir.cluster?.name;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 760 }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 8 }}>
        <Link to="/kutirs" style={{ color: "var(--link-color)", textDecoration: "none" }}>Kutirs</Link>
        {" › "}
        <span>{kutir.name}</span>
      </div>

      <h2 style={{ margin: "0 0 20px", color: "var(--text-primary)", fontSize: "1.4rem" }}>{kutir.name}</h2>

      <div>
        <InfoRow label="Zone"       value={zone     ?? "—"} />
        <InfoRow label="District"   value={district ?? "—"} />
        <InfoRow label="Area"       value={area     ?? "—"} />
        <InfoRow label="Cluster"    value={cluster  ?? "—"} />
        <InfoRow label="Name"       value={kutir.name} />
        <InfoRow label="Type"       value={kutir.kutir_type ?? "—"} />
        <InfoRow label="Village"    value={kutir.village ?? "—"} />
        <InfoRow label="State"      value={kutir.state ?? "—"} />
        {kutir.street  && <InfoRow label="Street"   value={kutir.street} />}
        {kutir.pincode && <InfoRow label="Pincode"  value={kutir.pincode} />}
        <InfoRow label="Enroll 5th" value={kutir.enrollment_5th ?? "—"} />
        <InfoRow label="Enroll 8th" value={kutir.enrollment_8th ?? "—"} />
        <InfoRow label="Teacher" value={
          kutir.teacher
            ? (() => {
                const t = kutir.teacher!;
                const displayName = [t.first_name, t.last_name].filter(Boolean).join(" ") || t.username;
                return <span>{displayName}{t.title && <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}> ({t.title})</span>}</span>;
              })()
            : <span style={{ color: "var(--text-secondary)" }}>Not assigned</span>
        } />
      </div>
    </div>
  );
}
