import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../api/auth";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await requestPasswordReset(identifier.trim());
      setDone(true);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setError("Too many requests. Please try again later.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Forgot password</h1>
        <p style={styles.sub}>
          Enter your username or email. If an account matches, we will send a reset link.
        </p>
        {done ? (
          <div>
            <p style={styles.ok}>
              If an account with that username or email exists and has an email on file,
              a reset link has been sent. Check your inbox (and the server log in local
              development when SMTP is not configured).
            </p>
            <Link to="/login" style={styles.link}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form} className="grs-form">
            <label style={styles.label}>Username or email</label>
            <input
              style={styles.input}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
              required
              autoComplete="username"
            />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.btn} disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
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
    minHeight: "100vh",
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
  title: { margin: 0, fontSize: "1.5rem", color: "var(--text-primary)" },
  sub: { margin: "8px 0 24px", color: "var(--text-secondary)", fontSize: "0.875rem" },
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
