import { grs } from "../styles/grs";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import HomePage from "./HomePage";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [navOpen, setNavOpen] = useState(false);

  const closeNav = () => setNavOpen(false);

  return (
    <div style={styles.layout}>
      {/* Mobile hamburger */}
      <button className="grs-hamburger" onClick={() => setNavOpen(o => !o)} aria-label="Menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Backdrop overlay */}
      {navOpen && <div className="grs-nav-overlay" onClick={closeNav} />}

      <aside style={styles.sidebar} className={`grs-sidebar${navOpen ? " grs-sidebar--open" : ""}`}>
        <div style={grs.navLogo}>KutirGRS</div>
        <nav style={styles.nav}>
          {navItems.map(({ to, label, divider, sub }) => (
            divider
              ? <div key={label} style={grs.navSectionLabel}>{label}</div>
              : (
                <NavLink
                  key={to}
                  to={to!}
                  end={to === "/"}
                  onClick={closeNav}
                  style={({ isActive }) => ({
                    ...grs.navLink,
                    ...(sub ? grs.navSubLink : {}),
                    background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                    color: isActive ? "var(--nav-fg)" : sub ? "var(--nav-accent)" : "var(--nav-muted)",
                  })}
                >
                  {sub ? "↳ " : ""}{label}
                </NavLink>
              )
          ))}
        </nav>
        <div style={styles.userInfo}>
          <div style={{ fontSize: "0.8rem", color: "var(--nav-accent)" }}>{user?.username}</div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{user?.title}</div>
        </div>
        <button style={grs.navLogoutBtn} onClick={logout}>Sign out</button>
      </aside>

      <main style={styles.main} className="grs-main">
        {isHome ? <HomePage /> : <Outlet />}
      </main>
    </div>
  );
}

const navItems: { to?: string; label: string; divider?: boolean; sub?: boolean }[] = [
  { to: "/", label: "Dashboard" },
  { to: "/kutirs", label: "Kutirs" },
  { to: "/students", label: "Students" },
  { to: "/admissions", label: "Admissions" },
  { to: "/progress", label: "Progress" },
  { to: "/visits", label: "Kutir Visits" },
  { divider: true, label: "REPORTS" },
  { to: "/reports/detailed", label: "Detailed", sub: true },
  { to: "/reports/summary", label: "Summary", sub: true },
  { divider: true, label: "ADMIN" },
  { to: "/schools", label: "Govt. Res. Schools" },
  { to: "/exam-centers", label: "Exam Centers" },
  { to: "/geo", label: "Geography" },
  { to: "/lookups", label: "Lookups" },
  { to: "/users", label: "Users" },
];

const styles: Record<string, React.CSSProperties> = {
  layout: { display: "flex", minHeight: "100vh", fontFamily: "sans-serif" },
  sidebar: {
    width: 220,
    background: "var(--nav-bg)",
    color: "var(--nav-fg)",
    display: "flex",
    flexDirection: "column",
    padding: "1.5rem 1rem",
    gap: 8,
    flexShrink: 0,
  },
  nav: { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  userInfo: { marginTop: "auto", padding: "8px 0", borderTop: "1px solid #2d4a7a", textAlign: "left" as const },
  main: { flex: 1, padding: "0", overflowY: "auto" },
};
