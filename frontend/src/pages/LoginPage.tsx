import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(username, password);
      navigate("/", { replace: true });
    } catch {
      setError("Invalid username or password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>KutirGRS</h1>
        <p style={styles.sub}>Parivaar Kutir GRS Admission Tracking</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Username</label>
          <input
            style={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
          <label style={styles.label}>Password</label>
          <input
            type="password"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.btn} disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
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
  },
  card: {
    background: "var(--bg-card)",
    borderRadius: 12,
    padding: "2.5rem 2rem",
    boxShadow: "0 4px 24px rgba(0,0,0,.1)",
    width: "100%",
    maxWidth: 380,
  },
  title: { margin: 0, fontSize: "1.75rem", color: "var(--text-primary)" },
  sub: { margin: "4px 0 24px", color: "var(--text-secondary)", fontSize: "0.875rem" },
  form: { display: "flex", flexDirection: "column", gap: 8 },
  label: { fontWeight: 600, fontSize: "0.875rem", color: "var(--text-secondary)", textAlign: "left" as const, display: "block" },
  input: {
    padding: "10px 12px",
    borderRadius: 6,
    border: "1px solid #cbd5e0",
    fontSize: "1rem",
    marginBottom: 4,
  },
  error: { color: "var(--status-danger-fg)", fontSize: "0.875rem", margin: "4px 0" },
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
  },
};
