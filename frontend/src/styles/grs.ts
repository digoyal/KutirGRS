/**
 * Shared GRS style tokens — single source of truth for all pages.
 * Uses CSS variables defined in index.css so light/dark mode just works.
 */
import type { CSSProperties } from "react";

export const grs = {
  // ── Overlays & modals
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: 16,
  } as CSSProperties,

  modal: {
    background: "var(--bg-card)",
    borderRadius: 12, padding: 28,
    width: 480, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  } as CSSProperties,

  modalTitle: {
    margin: "0 0 20px", fontSize: 18, fontWeight: 700,
    color: "var(--text-primary)",
  } as CSSProperties,

  // ── Form fields
  fieldLabel: {
    display: "block", fontSize: 12, fontWeight: 600,
    marginBottom: 4, color: "var(--text-secondary)",
    textTransform: "uppercase" as const, letterSpacing: "0.04em",
    textAlign: "left" as const,
  } as CSSProperties,

  input: {
    width: "100%", padding: "7px 10px", borderRadius: 6,
    border: "1px solid var(--border)",
    background: "var(--bg-input)", color: "var(--text-primary)",
    fontSize: 14, boxSizing: "border-box" as const, outline: "none",
  } as CSSProperties,

  select: {
    width: "100%", padding: "7px 10px", borderRadius: 6,
    border: "1px solid var(--border)",
    background: "var(--bg-input)", color: "var(--text-primary)",
    fontSize: 14, boxSizing: "border-box" as const, cursor: "pointer",
  } as CSSProperties,

  // ── Buttons
  btnPrimary: {
    padding: "8px 18px", borderRadius: 7,
    background: "var(--link-color)", color: "white",
    border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
  } as CSSProperties,

  btnSecondary: {
    padding: "8px 18px", borderRadius: 7,
    border: "1px solid var(--border)", background: "transparent",
    color: "var(--text-secondary)", cursor: "pointer", fontSize: 14,
  } as CSSProperties,

  btnDanger: {
    padding: "4px 10px", borderRadius: 5,
    background: "var(--status-danger-bg)", color: "var(--status-danger-fg)",
    border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
  } as CSSProperties,

  btnIcon: {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "5px 10px", border: "1px solid var(--border)",
    borderRadius: 6, background: "var(--bg-input)",
    cursor: "pointer", fontSize: "0.8rem",
    color: "var(--text-secondary)", fontWeight: 500,
  } as CSSProperties,

  // ── Tables
  thead: { background: "var(--bg-thead)" } as CSSProperties,

  th: {
    padding: "10px 12px", textAlign: "left" as const,
    fontWeight: 600, fontSize: 13, color: "var(--text-secondary)",
    borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" as const,
  } as CSSProperties,

  td: {
    padding: "10px 12px", textAlign: "left" as const, fontSize: 14, color: "var(--text-primary)",
    borderBottom: "1px solid var(--border)", verticalAlign: "middle" as const,
  } as CSSProperties,

  trEven: { background: "var(--bg-card)" } as CSSProperties,
  trOdd:  { background: "var(--bg-input)" } as CSSProperties,

  // ── Search / filter bar
  searchInput: {
    padding: "7px 12px", border: "1.5px solid var(--border-input)",
    borderRadius: 6, fontSize: "0.875rem",
    background: "var(--bg-card)", color: "var(--text-primary)",
    outline: "none", minWidth: 200,
  } as CSSProperties,

  filterSelect: {
    padding: "7px 10px", border: "1.5px solid var(--border-input)",
    borderRadius: 6, fontSize: "0.875rem", width: 170, flexShrink: 0,
    background: "var(--bg-card)", color: "var(--text-primary)",
    cursor: "pointer",
  } as CSSProperties,

  // ── Misc
  badge: {
    display: "inline-block", padding: "2px 8px",
    borderRadius: 9999, fontSize: 11, fontWeight: 600,
  } as CSSProperties,

  errorBox: {
    color: "var(--status-danger-fg)", background: "var(--status-danger-bg)",
    border: "1px solid var(--status-danger-fg)", borderRadius: 5,
    padding: "8px 12px", marginBottom: 12, fontSize: "0.85rem",
  } as CSSProperties,

  muted: { color: "var(--text-secondary)", fontSize: 13 } as CSSProperties,

  // ── Nav sidebar (sidebar + any future nav variants share these tokens)
  navLink: {
    textDecoration: "none",
    padding: "8px 10px",
    borderRadius: 6,
    fontSize: "0.9rem",
    transition: "background 0.15s",
    textAlign: "left" as const,
    display: "block",
    color: "var(--nav-muted)",
  } as CSSProperties,

  navSubLink: {
    paddingLeft: 22,
    fontSize: "0.82rem",
  } as CSSProperties,

  navSectionLabel: {
    fontSize: "0.68rem",
    fontWeight: 800,
    letterSpacing: "0.1em",
    color: "#fff",
    padding: "16px 10px 4px",
    textTransform: "uppercase" as const,
    textAlign: "left" as const,
    borderTop: "1px solid rgba(255,255,255,0.12)",
    marginTop: 4,
  } as CSSProperties,

  navLogoutBtn: {
    background: "transparent",
    border: "1px solid #4a6fa5",
    color: "var(--nav-muted)",
    padding: "8px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: "0.875rem",
    marginTop: 8,
    width: "100%",
    textAlign: "left" as const,
  } as CSSProperties,

  navLogo: {
    fontSize: "1.25rem",
    fontWeight: 700,
    marginBottom: 24,
    color: "var(--nav-fg)",
    textAlign: "left" as const,
  } as CSSProperties,

};
