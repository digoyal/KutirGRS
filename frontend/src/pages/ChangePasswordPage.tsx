import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword } from "../api/auth";
import { grs } from "../styles/grs";

const MIN_LEN = 8;

function passwordStrengthOk(pw: string): boolean {
  return pw.length >= MIN_LEN;
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!current) {
      setError("Enter your current password.");
      return;
    }
    if (!passwordStrengthOk(password)) {
      setError(`New password must be at least ${MIN_LEN} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    if (password === current) {
      setError("New password must be different from the current password.");
      return;
    }
    setBusy(true);
    try {
      await changePassword(current, password);
      setDone(true);
      setCurrent("");
      setPassword("");
      setConfirm("");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        // FastAPI validation errors
        const msg = detail
          .map((d: { msg?: string }) => d?.msg)
          .filter(Boolean)
          .join(" ");
        setError(msg || "Could not update password.");
      } else {
        setError("Could not update password. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const strengthHint =
    password.length === 0
      ? ""
      : passwordStrengthOk(password)
        ? "Strength: OK (at least 8 characters)"
        : `Strength: too short (${password.length}/${MIN_LEN})`;

  return (
    <div className="grs-page" style={{ maxWidth: 480, padding: "24px 16px", minWidth: 0, width: "100%", boxSizing: "border-box" }}>
      <div className="grs-page-topbar">
        <button type="button" className="grs-page-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h2 className="grs-page-title" style={{ margin: 0, fontSize: 20 }}>
          Change Password
        </h2>
      </div>

      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 16,
        }}
      >
        {done ? (
          <div>
            <p role="status" style={{ color: "var(--text-primary)", marginTop: 0 }}>
              Your password was updated.
            </p>
            <button
              type="button"
              style={{ ...grs.btnPrimary, minHeight: 44 }}
              onClick={() => {
                setDone(false);
                setError("");
              }}
            >
              Change again
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grs-form" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={styles.label}>Current password</label>
            <input
              type="password"
              style={styles.input}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoFocus
              required
              autoComplete="current-password"
            />

            <label style={styles.label}>New password</label>
            <input
              type="password"
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={MIN_LEN}
              autoComplete="new-password"
            />
            {strengthHint && (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.875rem",
                  color: passwordStrengthOk(password)
                    ? "var(--text-secondary)"
                    : "var(--status-danger-fg)",
                }}
              >
                {strengthHint}
              </p>
            )}

            <label style={styles.label}>Confirm new password</label>
            <input
              type="password"
              style={styles.input}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={MIN_LEN}
              autoComplete="new-password"
            />
            {confirm.length > 0 && confirm !== password && (
              <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--status-danger-fg)" }}>
                Passwords do not match.
              </p>
            )}

            {error && (
              <p role="alert" style={{ color: "var(--status-danger-fg)", fontSize: "0.875rem", margin: "4px 0" }}>
                {error}
              </p>
            )}

            <button type="submit" style={{ ...grs.btnPrimary, minHeight: 44, marginTop: 8 }} disabled={busy}>
              {busy ? "Saving…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
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
    border: "1px solid var(--border, #cbd5e0)",
    fontSize: "1rem",
    marginBottom: 4,
    width: "100%",
    boxSizing: "border-box",
    background: "var(--bg-input, #fff)",
    color: "var(--text-primary)",
  },
};
