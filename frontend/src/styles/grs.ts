/**
 * KutirGRS style tokens — shared primitives from @parivaar/ui plus app nav tokens.
 * Prefer importing `styles` from `@parivaar/ui` for new shared UI; keep `grs` for app pages.
 */
import type { CSSProperties } from "react";
import { styles } from "@parivaar/ui";

export const grs = {
  ...styles,

  // ── Nav sidebar (app-specific; not in @parivaar/ui)
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
