import { Navigate, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import api from "../api/client";
import { grs } from "../styles/grs";
import { useAuth } from "../context/AuthContext";
import { canViewDeploy } from "../constants/roles";

type Job = {
  id: string;
  state: "queued" | "running" | "succeeded" | "failed";
  output?: string;
  target_commit?: string;
  backup?: string;
};
type Status = { output: string; success: boolean; job: Job | null };
const active = (job?: Job | null) => job?.state === "queued" || job?.state === "running";
const panel = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 };

export default function DeployPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const allowed = canViewDeploy(user?.title);
  const status = useQuery({
    queryKey: ["deploy-status"],
    queryFn: async () => (await api.get<Status>("/admin/deploy/status", { timeout: 10000 })).data,
    enabled: allowed,
    refetchInterval: 2500,
    refetchIntervalInBackground: true,
    retry: false,
  });
  const deploy = useMutation({
    mutationFn: async () => (await api.post<Job>("/admin/deploy", undefined, { timeout: 15000 })).data,
    onSettled: () => { void status.refetch(); },
  });
  // The saved server job is authoritative, including after navigating away/reloading.
  const job = status.data?.job;
  const running = deploy.isPending || active(job);
  const message = axios.isAxiosError(deploy.error)
    ? deploy.error.response?.data?.detail ?? "Could not confirm the request. Refresh Status before retrying."
    : deploy.error ? "Could not start deployment. Refresh Status before retrying." : null;

  if (!allowed) return <Navigate to="/" replace />;

  return (
    <div style={{ maxWidth: 800, padding: "24px 16px", minWidth: 0 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
        <button style={grs.btnSecondary} onClick={() => navigate(-1)}>← Back</button>
        <h2 style={{ margin: 0, fontSize: 20 }}>Deploy from Git</h2>
      </div>
      <div style={{ ...panel, padding: 16, marginBottom: 16 }}>
        <strong>Current server version</strong>
        <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "var(--text-primary)" }}>
          {status.data?.output || "Loading…"}
        </pre>
        {status.isError && <p role="status">Server temporarily unavailable. Status will reconnect automatically.</p>}
      </div>
      <div style={{ ...panel, padding: 16, marginBottom: 16 }}>
        <p style={{ marginTop: 0 }}>Deploy the latest GitHub main code and shared UI, build the frontend, back up the database, apply pending database migrations, and restart the site.</p>
        <p style={{ marginBottom: 0 }}>Progress is saved. You can leave this page and return while deployment runs. The site may be briefly unavailable during the update.</p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <button style={{ ...grs.btnPrimary, minHeight: 44 }} disabled={running || !status.data || status.isError}
          onClick={() => deploy.mutate()}>
          {running ? "⏳ Deploying…" : "🚀 Deploy Now"}
        </button>
        <button style={{ ...grs.btnSecondary, minHeight: 44 }} onClick={() => { void status.refetch(); }}>Refresh Status</button>
      </div>
      {message && !active(job) && <p role="alert" style={{ color: "var(--danger, #dc2626)" }}>{String(message)}</p>}
      {job && <section aria-live="polite" style={{ ...panel, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", fontWeight: 700, color: "var(--text-primary)" }}>
          {job.state === "succeeded" ? "✅ Deploy succeeded" : job.state === "failed" ? "❌ Deploy failed — see details below" : "⏳ Deployment in progress"}
        </div>
        <pre style={{ margin: 0, padding: 16, background: "#111827", color: "#f9fafb",
          fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", overflowWrap: "anywhere",
          maxHeight: 500, overflowY: "auto" }}>{job.output || "Waiting for deployment worker…"}</pre>
      </section>}
    </div>
  );
}
