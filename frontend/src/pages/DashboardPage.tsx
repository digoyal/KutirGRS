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
        <div style={styles.logo}>KutirGRS</div>
        <nav style={styles.nav}>
          {navItems.map(({ to, label, divider, sub }) => (
            divider
              ? <div key={label} style={styles.divider}>{label}</div>
              : (
                <NavLink
                  key={to}
                  to={to!}
                  end={to === "/"}
                  onClick={closeNav}
                  style={({ isActive }) => ({
                    ...styles.link,
                    ...(sub ? styles.subLink : {}),
                    background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                    color: isActive ? "#fff" : sub ? "#90cdf4" : "#bee3f8",
                  })}
                >
                  {sub ? "↳ " : ""}{label}
                </NavLink>
              )
          ))}
        </nav>
        <div style={styles.userInfo}>
          <div style={{ fontSize: "0.8rem", color: "#90cdf4" }}>{user?.username}</div>
          <div style={{ fontSize: "0.7rem", color: "#718096" }}>{user?.title}</div>
        </div>
        <button style={styles.logoutBtn} onClick={logout}>Sign out</button>
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
  { to: "/geo", label: "Geography" },
  { to: "/lookups", label: "Lookups" },
  { to: "/users", label: "Users" },
];

const styles: Record<string, React.CSSProperties> = {
  layout: { display: "flex", minHeight: "100vh", fontFamily: "sans-serif" },
  sidebar: {
    width: 220,
    background: "#1a365d",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    padding: "1.5rem 1rem",
    gap: 8,
    flexShrink: 0,
  },
  logo: { fontSize: "1.25rem", fontWeight: 700, marginBottom: 24, color: "#fff" },
  nav: { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  link: {
    textDecoration: "none",
    padding: "8px 10px",
    borderRadius: 6,
    fontSize: "0.9rem",
    transition: "background 0.15s",
  },
  subLink: {
    paddingLeft: 22,
    fontSize: "0.82rem",
  },
  divider: {
    fontSize: "0.65rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#4a6fa5",
    padding: "12px 10px 4px",
    textTransform: "uppercase",
  },
  userInfo: { marginTop: "auto", padding: "8px 0", borderTop: "1px solid #2d4a7a" },
  logoutBtn: {
    background: "transparent",
    border: "1px solid #4a6fa5",
    color: "#bee3f8",
    padding: "8px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: "0.875rem",
    marginTop: 8,
  },
  main: { flex: 1, padding: "0", overflowY: "auto" },
};
