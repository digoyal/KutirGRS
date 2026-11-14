export default function SettingsGeneral() {
  return (
    <div style={{ minWidth: 0 }}>
      <h2 style={{ margin: "0 0 8px", color: "var(--text-primary)", fontSize: "1.25rem" }}>General</h2>
      <p style={{ margin: "0 0 20px", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
        Organization-wide preferences for Parivaar Kutirs (notifications, defaults, and integrations).
      </p>

      <div className="card card-body" style={{ maxWidth: 480 }}>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5 }}>
          No organization settings are configurable here yet. List column visibility and order are managed
          under <strong style={{ color: "var(--text-primary)" }}>Column Settings</strong> in the menu to the left.
        </p>
      </div>
    </div>
  );
}