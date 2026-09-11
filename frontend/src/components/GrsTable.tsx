import { useState, useMemo } from "react";
import { grs } from "../styles/grs";
import { RowActions } from "./RowActions";

// ── Types ──────────────────────────────────────────────────────────────────

export interface Col<T> {
  key: string;
  label: string;
  sortable?: boolean;
  /** How to render the cell. Defaults to String(row[key]). */
  render?: (row: T, index: number) => React.ReactNode;
  /** Value used for CSV export. Defaults to String(row[key as keyof T] ?? ""). */
  csvValue?: (row: T) => string;
  /** Extra td style overrides. */
  tdStyle?: React.CSSProperties;
}

interface GrsTableProps<T> {
  title: string;
  subtitle?: string;
  columns: Col<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFn?: (row: T, q: string) => boolean;
  /** Extra filter controls rendered beside the search box. */
  filters?: React.ReactNode;
  /** Filename for CSV export (without .csv). Omit to hide export button. */
  exportFilename?: string;
  /** Title shown in the print window. Omit to hide print button. */
  printTitle?: string;
  onAdd?: () => void;
  addLabel?: string;
  /** Row-level view/edit/delete callbacks. When provided, a sticky actions column is added. */
  actions?: (row: T, idx: number) => { onView?: () => void; onEdit?: () => void; onDelete?: () => void; };
}

// ── Helpers ────────────────────────────────────────────────────────────────

const SortIcon = ({ dir }: { dir: "asc" | "desc" | null }) => (
  <span style={{ marginLeft: 4, opacity: dir ? 1 : 0.3, fontSize: 10 }}>
    {dir === "desc" ? "▼" : "▲"}
  </span>
);

function csvEscape(v: string) { return `"${v.replace(/"/g, '""')}"`; }

// ── Icons ──────────────────────────────────────────────────────────────────

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconPrint = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);

// ── Component ──────────────────────────────────────────────────────────────

export function GrsTable<T extends object>({
  title, subtitle,
  columns, data, rowKey,
  isLoading, emptyMessage = "No records found.",
  searchable, searchPlaceholder = "Search…", searchFn,
  filters, exportFilename, printTitle,
  onAdd, addLabel = "+ Add",
  actions,
}: GrsTableProps<T>) {

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // ── Filter
  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return data;
    const q = query.trim().toLowerCase();
    if (searchFn) return data.filter(r => searchFn(r, q));
    return data.filter(r =>
      Object.values(r as Record<string, unknown>).some(v =>
        (typeof v === "string" && v.toLowerCase().includes(q)) ||
        (typeof v === "number" && String(v).includes(q))
      )
    );
  }, [data, query, searchable, searchFn]);

  // ── Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av ?? "").localeCompare(String(bv ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  // ── Export CSV
  function exportCsv() {
    const headers = columns.map(c => csvEscape(c.label));
    const rows = sorted.map(row =>
      columns.map(c =>
        c.csvValue
          ? csvEscape(c.csvValue(row))
          : csvEscape(String((row as Record<string, unknown>)[c.key] ?? ""))
      )
    );
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = (exportFilename ?? "export") + ".csv";
    a.click();
  }

  // ── Print
  function doPrint() {
    const w = window.open("", "_blank")!;
    const thStyle = "border:1px solid #ccc;padding:6px 10px;font-size:12px;background:#eef2fb;text-align:left;font-weight:600";
    const tdStyle = "border:1px solid #e5e7eb;padding:6px 10px;font-size:12px";
    const ths = columns.map(c => `<th style="${thStyle}">${c.label}</th>`).join("");
    const trs = sorted.map((row, i) =>
      `<tr style="background:${i % 2 === 0 ? "#ffffff" : "#f9fafb"}">` +
      columns.map(c => {
        const val = c.csvValue
          ? c.csvValue(row)
          : String((row as Record<string, unknown>)[c.key] ?? "");
        return `<td style="${tdStyle}">${val}</td>`;
      }).join("") + "</tr>"
    ).join("");
    w.document.write(
      `<html><head><title>${printTitle ?? title}</title></head><body style="font-family:sans-serif;padding:20px">` +
      `<h2 style="margin:0 0 16px">${printTitle ?? title}</h2>` +
      `<table style="border-collapse:collapse;width:100%">` +
      `<thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>` +
      `<p style="color:#6b7280;font-size:12px;margin-top:12px">${sorted.length} records</p>` +
      `</body></html>`
    );
    w.document.close(); w.focus(); w.print();
  }

  const hasSearch = searchable || filters;

  return (
    <div>
      {/* ── Page header: Title + Export + Print + Add all on one row ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h1>
          {subtitle && <p style={{ margin: "4px 0 0", ...grs.muted }}>{subtitle}</p>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {exportFilename && (
            <button onClick={exportCsv} style={grs.btnIcon} title="Export CSV">
              <IconDownload />
              <span>Export CSV</span>
            </button>
          )}
          {printTitle !== undefined && (
            <button onClick={doPrint} style={grs.btnIcon} title="Print">
              <IconPrint />
              <span>Print</span>
            </button>
          )}
          {onAdd && (
            <button onClick={onAdd} style={grs.btnPrimary}>{addLabel}</button>
          )}
        </div>
      </div>

      {/* ── Search + filter bar (bordered container) ── */}
      {hasSearch && (
        <div style={{
          display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
          marginBottom: 16,
        }}>
          {searchable && (
            <input
              placeholder={searchPlaceholder}
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={grs.searchInput}
            />
          )}
          {filters}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
      }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", ...grs.muted }}>Loading…</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {columns.map(col => (
                    <th
                      key={col.key}
                      className="grs-thead-th"
                      style={{
                        ...grs.th,
                        cursor: col.sortable ? "pointer" : "default",
                        userSelect: "none",
                      }}
                      onClick={() => col.sortable && toggleSort(col.key)}
                    >
                      {col.label}
                      {col.sortable && <SortIcon dir={sortKey === col.key ? sortDir : null} />}
                    </th>
                  ))}
                  {actions && (
                    <th style={{
                      ...grs.th, width: 96, textAlign: "right",
                      position: "sticky", right: 0,
                      background: "var(--bg-thead)", zIndex: 1,
                    }} />
                  )}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length}
                        style={{ ...grs.td, padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
                      {emptyMessage}
                    </td>
                  </tr>
                ) : sorted.map((row, idx) => (
                  <tr
                    key={rowKey(row)}
                    style={{ background: idx % 2 === 0 ? "var(--bg-card)" : "var(--bg-input)" }}
                  >
                    {columns.map(col => (
                      <td key={col.key} style={{ ...grs.td, ...col.tdStyle }}>
                        {col.render
                          ? col.render(row, idx)
                          : String((row as Record<string, unknown>)[col.key] ?? "—")}
                      </td>
                    ))}
                    {actions && (
                      <td style={{
                        ...grs.td, textAlign: "right", width: 96,
                        position: "sticky", right: 0,
                        background: idx % 2 === 0 ? "var(--bg-card)" : "var(--bg-input)",
                        borderLeft: "1px solid var(--border)",
                      }}>
                        <RowActions {...actions(row, idx)} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Row count ── */}
      {!isLoading && sorted.length > 0 && (
        <p style={{ ...grs.muted, margin: "8px 0 0", textAlign: "right" }}>
          {sorted.length} {sorted.length === 1 ? "record" : "records"}
          {data.length !== sorted.length ? ` of ${data.length}` : ""}
        </p>
      )}
    </div>
  );
}
