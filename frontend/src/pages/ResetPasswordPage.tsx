import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/auth";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = (params.get("token") || "").trim();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("Missing reset token. Open the link from your email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string }; status?: number } })
        ?.response?.data?.detail;
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(typeof detail === "string" ? detail : "Invalid or expired reset link.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Set new password</h1>
        {!token && !done ? (
          <p style={styles.error}>
            Missing reset token. Use the link from your email, or{" "}
            <Link to="/forgot-password" style={styles.link}>
              request a new link
            </Link>
            .
          </p>
        ) : done ? (
          <div>
            <p style={styles.ok}>Your password was updated. You can sign in now.</p>
            <Link to="/login" style={styles.link}>
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form} className="grs-form">
            <label style={styles.label}>New password</label>
            <input
              type="password"
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
              minLength={8}
              autoComplete="new-password"
            />
            <label style={styles.label}>Confirm password</label>
            <input
              type="password"
              style={styles.input}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.btn} disabled={busy}>
              {busy ? "Saving…" : "Update password"}
            </button>
            <Link to="/login" style={{ ...styles.link, marginTop: 12 }}>
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100svh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg-input)",
    padding: 16,
  },
  card: {
    background: "var(--bg-card)",
    borderRadius: 12,
    padding: "2.5rem 2rem",
    boxShadow: "0 4px 24px rgba(0,0,0,.1)",
    width: "100%",
    maxWidth: 380,
    boxSizing: "border-box",
  },
  title: { margin: 0, fontSize: "1.5rem", color: "var(--text-primary)", marginBottom: 24 },
  form: { display: "flex", flexDirection: "column", gap: 8 },
  label: {
    fontWeight: 600,
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
    textAlign: "left" as const,
    display: "block",
  },
  input: {
    padding: "10px 12px",
    borderRadius: 6,
    border: "1px solid #cbd5e0",
    fontSize: "1rem",
    marginBottom: 4,
    width: "100%",
    boxSizing: "border-box",
  },
  error: { color: "var(--status-danger-fg)", fontSize: "0.875rem", margin: "4px 0" },
  ok: { color: "var(--text-primary)", fontSize: "0.9rem", lineHeight: 1.45, margin: "0 0 16px" },
  btn: {
    marginTop: 8,
    padding: "11px",
    background: "var(--link-color)",
    color: "white",
    border: "none",
    borderRadius: 6,
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    minHeight: 44,
  },
  link: {
    color: "var(--link-color)",
    fontSize: "0.875rem",
    textDecoration: "none",
    display: "inline-block",
  },
};
