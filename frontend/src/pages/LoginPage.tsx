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
    background: "#f0f4f8",
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: "2.5rem 2rem",
    boxShadow: "0 4px 24px rgba(0,0,0,.1)",
    width: "100%",
    maxWidth: 380,
  },
  title: { margin: 0, fontSize: "1.75rem", color: "#1a365d" },
  sub: { margin: "4px 0 24px", color: "#718096", fontSize: "0.875rem" },
  form: { display: "flex", flexDirection: "column", gap: 8 },
  label: { fontWeight: 600, fontSize: "0.875rem", color: "#4a5568" },
  input: {
    padding: "10px 12px",
    borderRadius: 6,
    border: "1px solid #cbd5e0",
    fontSize: "1rem",
    marginBottom: 4,
  },
  error: { color: "#e53e3e", fontSize: "0.875rem", margin: "4px 0" },
  btn: {
    marginTop: 8,
    padding: "11px",
    background: "#2b6cb0",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
  },
};
