import { NavLink, Outlet } from "react-router-dom";

const SETTINGS_TOPICS = [
  { label: "General", to: "/admin/settings/general" },
  { label: "Column Settings", to: "/admin/settings/columns" },
] as const;

export default function SettingsLayout() {
  return (
    <div className="grs-page settings-layout" style={{ padding: "24px 28px" }}>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, color: "var(--text-primary)" }}>Settings</h1>
      </div>
      <div className="settings-layout-body">
        <nav className="settings-topics" aria-label="Settings topics">
          {SETTINGS_TOPICS.map((topic) => (
            <NavLink
              key={topic.to}
              to={topic.to}
              className={({ isActive }) => "settings-topics-link" + (isActive ? " active" : "")}
            >
              {topic.label}
            </NavLink>
          ))}
        </nav>
        <div className="settings-layout-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}