import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "../api/client";
import { grs } from "../styles/grs";

async function fetchStatus() {
  return (await api.get("/admin/deploy/status")).data as { output: string; success: boolean };
}
async function runDeploy() {
  return (await api.post("/admin/deploy")).data as { success: boolean; output: string; returncode: number };
}

export default function DeployPage() {
  const navigate = useNavigate();
  const [log, setLog] = useState<string | null>(null);
  const [deploySuccess, setDeploySuccess] = useState<boolean | null>(null);

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ["deploy-status"],
    queryFn: fetchStatus,
  });

  const deployMut = useMutation({
    mutationFn: runDeploy,
    onSuccess: (data) => {
      setLog(data.output);
      setDeploySuccess(data.success);
      refetchStatus();
    },
    onError: (e: any) => {
      setLog(e?.response?.data?.detail ?? String(e));
      setDeploySuccess(false);
    },
  });

  const running = deployMut.isPending;

  return (
    <div style={{ maxWidth: 700, padding: "24px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <button style={{ background: "none", border: "none", color: "var(--link-color)", cursor: "pointer", fontSize: 14, padding: 0 }}
          onClick={() => navigate(-1)}>← Back</button>
        <h2 style={{ margin: 0, fontSize: 20 }}>Deploy from Git</h2>
      </div>

      {/* Current server status */}
      <div style={{ background: "var(--bg-card)", borderRadius: 8, padding: "12px 16px", marginBottom: 16, border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--badge-blue-fg, #2563eb)", marginBottom: 6 }}>
          Current Server State
        </div>
        {status ? (
          <pre style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
            {status.output}
          </pre>
        ) : (
          <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Loading…</span>
        )}
      </div>

      {/* Deploy steps info */}
      <div style={{ background: "var(--bg-card)", borderRadius: 8, padding: "12px 16px", marginBottom: 20, border: "1px solid var(--border)", fontSize: 13, color: "var(--text-secondary)" }}>
        <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>What this does:</div>
        {["git pull origin main", "pip install -r requirements.txt", "alembic upgrade head", "npm ci && npm run build", "systemctl restart kutir-backend"].map((step, i) => (
          <div key={i} style={{ padding: "3px 0" }}>
            <span style={{ color: "var(--badge-blue-fg, #2563eb)", fontWeight: 700, marginRight: 8 }}>{i + 1}.</span>
            <code style={{ fontSize: 12 }}>{step}</code>
          </div>
        ))}
        <div style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: 12 }}>⏱ Takes ~2–3 minutes. Page will wait.</div>
      </div>

      {/* Deploy button */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button
          style={{
            ...grs.btnPrimary,
            fontSize: 15, padding: "10px 28px",
            opacity: running ? 0.7 : 1,
            cursor: running ? "not-allowed" : "pointer",
          }}
          disabled={running}
          onClick={() => { setLog(null); setDeploySuccess(null); deployMut.mutate(); }}
        >
          {running ? "⏳ Deploying…" : "🚀 Deploy Now"}
        </button>
        <button style={{ ...grs.btnSecondary }} onClick={() => refetchStatus()} disabled={running}>
          Refresh Status
        </button>
      </div>

      {/* Output log */}
      {running && !log && (
        <div style={{ padding: "16px", background: "var(--bg-card)", borderRadius: 8, border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 13 }}>
          Running deploy… this takes 2–3 minutes, please wait.
        </div>
      )}
      {log !== null && (
        <div style={{ borderRadius: 8, border: `1px solid ${deploySuccess ? "var(--status-success-border, #86efac)" : "var(--danger-border, #fca5a5)"}`, overflow: "hidden" }}>
          <div style={{
            padding: "8px 14px", fontWeight: 700, fontSize: 13,
            background: deploySuccess ? "var(--status-success-bg, #d1fae5)" : "var(--danger-bg, #fef2f2)",
            color: deploySuccess ? "var(--status-success-fg, #065f46)" : "var(--danger, #dc2626)",
          }}>
            {deploySuccess ? "✅ Deploy succeeded" : "❌ Deploy failed"}
          </div>
          <pre style={{
            margin: 0, padding: "14px 16px", fontSize: 12, lineHeight: 1.6,
            background: "var(--bg-input, #1e1e1e)", color: "#e5e7eb",
            whiteSpace: "pre-wrap", fontFamily: "monospace",
            maxHeight: 500, overflowY: "auto",
          }}>
            {log}
          </pre>
        </div>
      )}
    </div>
  );
}
