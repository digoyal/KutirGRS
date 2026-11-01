import { useState } from "react";
import { Link } from "react-router-dom";
import { REPORT_SECTIONS } from "../constants/reportsRegistry";

const pageStyle: React.CSSProperties = {
  padding: "24px 28px",
  maxWidth: "100%",
  boxSizing: "border-box",
  minWidth: 0,
};

export default function ReportsHubPage() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(REPORT_SECTIONS.map((s) => [s.id, true])),
  );

  function toggleSection(id: string) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="grs-page reports-hub" style={pageStyle}>
      <h2 style={{ margin: "0 0 8px", color: "var(--text-primary)" }}>Reports</h2>
      <p style={{ margin: "0 0 24px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
        Choose a report below. Filters and export are on each report page.
      </p>

      <div className="reports-hub-sections">
        {REPORT_SECTIONS.map((section) => {
          const open = openSections[section.id] ?? true;
          return (
            <section key={section.id} className="reports-hub-section">
              <button
                type="button"
                className="reports-hub-section-toggle"
                aria-expanded={open}
                onClick={() => toggleSection(section.id)}
              >
                <span className="reports-hub-section-title">{section.title}</span>
                <span className="reports-hub-section-chevron" aria-hidden>
                  {open ? "▲" : "▼"}
                </span>
              </button>
              {open && (
                <ul className="reports-hub-links">
                  {section.reports.map((r) => (
                    <li key={r.path}>
                      <Link to={r.path} className="reports-hub-link">
                        {r.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
