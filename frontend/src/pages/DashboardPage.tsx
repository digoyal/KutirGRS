import { grs } from "../styles/grs";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  canViewUsers,
  canViewColumnConfig,
  canViewDeploy,
  hasGlobalDataScope,
} from "../constants/roles";
import HomePage from "./HomePage";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const title = user?.title;
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [navOpen, setNavOpen] = useState(false);

  const closeNav = () => setNavOpen(false);

  function navVisible(item: (typeof navItems)[number]): boolean {
    // Admin-level menus (Import, …): Admin or SysAdmin
    if (item.adminOnly && !hasGlobalDataScope(title)) return false;
    // Deploy: SysAdmin only
    if (item.sysAdminOnly && !canViewDeploy(title)) return false;
    if (item.usersOnly && !canViewUsers(title)) return false;
    if (item.columnConfigOnly && !canViewColumnConfig(title)) return false;
    return true;
  }

  return (
    <div style={styles.layout} className="grs-dashboard">
      {/* Mobile hamburger */}
      <button className="grs-hamburger" onClick={() => setNavOpen(o => !o)} aria-label="Menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Backdrop overlay */}
      {navOpen && <div className="grs-nav-overlay" onClick={closeNav} />}

      <aside style={styles.sidebar} className={`grs-sidebar${navOpen ? " grs-sidebar--open" : ""}`}>
        <div style={grs.navLogo}>Parivaar Kutirs</div>
        <nav style={styles.nav}>
          {navItems.filter(navVisible).map(({ to, label, divider, sub }) => (
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

const navItems: {
  to?: string;
  label: string;
  divider?: boolean;
  sub?: boolean;
  adminOnly?: boolean;
  sysAdminOnly?: boolean;
  usersOnly?: boolean;
  columnConfigOnly?: boolean;
}[] = [
  { divider: true, label: "GRS TRACKING" },
  { to: "/", label: "GRS Dashboard" },
  { to: "/students", label: "Students" },
  { to: "/kutirs", label: "Kutirs" },
  { to: "/admissions", label: "Admissions" },
  { to: "/progress", label: "Progress" },
  { to: "/new-year-setup", label: "Bulk Progress Update" },
  { to: "/reports", label: "Reports" },
  { to: "/reports/detailed", label: "Detailed", sub: true },
  { to: "/reports/summary", label: "Summary", sub: true },
  { divider: true, label: "KUTIR VISITS" },
  { to: "/visits", label: "Visit Dashboard" },
  { to: "/visits/detail", label: "Visit Details" },
  { to: "/reports/summary", label: "Reports" },
  { to: "/reports/top-kutirs", label: "Top 10 Kutirs", sub: true },
  { to: "/reports/bottom-kutirs", label: "Bottom 10 Kutirs", sub: true },
  { to: "/reports/kutir-performance", label: "Kutir Performance", sub: true },
  { divider: true, label: "ADMIN" },
  { to: "/schools", label: "Govt. Res. Schools" },
  { to: "/exam-centers", label: "Exam Centers" },
  { to: "/geo", label: "Geography" },
  { to: "/lookups", label: "Lookups" }, // all roles may view; mutate Admin-only on page
  { to: "/users", label: "Users", usersOnly: true },
  { to: "/admin/change-password", label: "Change Password" },
  { to: "/admin/field-config", label: "Column Settings", columnConfigOnly: true },
  { to: "/admin/deploy", label: "🚀 Deploy", sysAdminOnly: true },
  { to: "/import", label: "Import Data", adminOnly: true },
];

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: "flex",
    height: "100svh",
    overflow: "hidden",
    fontFamily: "sans-serif",
    minHeight: 0,
  },
  sidebar: {
    width: 220,
    background: "var(--nav-bg)",
    color: "var(--nav-fg)",
    display: "flex",
    flexDirection: "column",
    padding: "1.5rem 1rem",
    gap: 8,
    flexShrink: 0,
    overflowY: "auto",
  },
  nav: { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  userInfo: { marginTop: "auto", padding: "8px 0", borderTop: "1px solid #2d4a7a", textAlign: "left" as const },
  main: { flex: 1, padding: "0", overflowY: "auto", minHeight: 0, minWidth: 0 },
};
