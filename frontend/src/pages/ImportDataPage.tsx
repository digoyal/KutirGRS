import React, { useState, useRef } from "react";

import { uploadImportFile, downloadTemplate, resetData, type SheetResult, type DeleteDataResponse } from "../api/import";

const SHEET_GUIDE = [
  { name: "0_Users",              note: "App users (Admin / District Head / Regional Head etc.)" },
  { name: "1_Zones",              note: "Top-level geographic zones" },
  { name: "2_Districts",          note: "Districts within zones" },
  { name: "3_Areas",              note: "Areas within districts" },
  { name: "4_Clusters",           note: "Clusters within areas" },
  { name: "5_Kutirs",             note: "Residential schools (Kutirs) with type and cluster" },
  { name: "6_Categories",         note: "Student categories (e.g. SC, ST, OBC, General)" },
  { name: "7_SubCategories",      note: "Sub-categories within categories" },
  { name: "8_Schools",            note: "Schools (non-Kutir) where students may be placed" },
  { name: "9_ExamCenters",        note: "Exam centers used in admission exams" },
  { name: "10_Donors",            note: "Donors / sponsors" },
  { name: "11_ExamCategories",    note: "Exam eligibility categories" },
  { name: "12_NoExamReasons",     note: "Reasons why a student did not appear in the exam" },
  { name: "13_NoAdmitReasons",    note: "Reasons why a student was not admitted" },
  { name: "14_Subjects",          note: "Academic subjects" },
  { name: "15_SchoolTypeSubjects",note: "Subject-to-school-type mappings and marks" },
  { name: "16_Students",          note: "Student master data" },
  { name: "17_Admissions",        note: "Exam and admission records (requires school_type)" },
];

const s = {
  page: {
    padding: "28px 24px",
    maxWidth: 1100,
    margin: "0 auto",
  } as React.CSSProperties,

  h1: {
    fontSize: "1.4rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: 4,
  } as React.CSSProperties,

  sub: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
    marginBottom: 28,
  } as React.CSSProperties,

  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "20px 24px",
    marginBottom: 20,
  } as React.CSSProperties,

  stepTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: 6,
    display: "flex",
    alignItems: "center",
    gap: 10,
  } as React.CSSProperties,

  stepNum: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "var(--badge-purple-fg, #7c3aed)",
    color: "#fff",
    fontSize: "0.8rem",
    fontWeight: 700,
    flexShrink: 0,
  } as React.CSSProperties,

  stepDesc: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
    marginBottom: 14,
  } as React.CSSProperties,

  btnPrimary: {
    background: "var(--badge-purple-fg, #7c3aed)",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "8px 18px",
    fontWeight: 600,
    fontSize: "0.875rem",
    cursor: "pointer",
  } as React.CSSProperties,

  btnSecondary: {
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "8px 18px",
    fontWeight: 600,
    fontSize: "0.875rem",
    cursor: "pointer",
  } as React.CSSProperties,

  uploadArea: {
    border: "2px dashed var(--border)",
    borderRadius: 8,
    padding: "24px 16px",
    textAlign: "center" as const,
    cursor: "pointer",
    color: "var(--text-secondary)",
    fontSize: "0.9rem",
    transition: "border-color 0.2s",
    marginBottom: 14,
  } as React.CSSProperties,

  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.85rem",
  } as React.CSSProperties,

  th: {
    textAlign: "left" as const,
    padding: "8px 10px",
    borderBottom: "2px solid var(--border)",
    color: "var(--text-secondary)",
    fontWeight: 600,
    fontSize: "0.78rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  } as React.CSSProperties,

  td: {
    padding: "7px 10px",
    borderBottom: "1px solid var(--border)",
    color: "var(--text-primary)",
    verticalAlign: "top" as const,
  } as React.CSSProperties,

  badge: (color: "green" | "red" | "grey"): React.CSSProperties => ({
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: "0.78rem",
    fontWeight: 600,
    background:
      color === "green" ? "var(--badge-green-bg, #d1fae5)"
      : color === "red" ? "var(--badge-red-bg, #fee2e2)"
      : "var(--bg-input)",
    color:
      color === "green" ? "var(--badge-green-fg, #065f46)"
      : color === "red" ? "var(--badge-red-fg, #991b1b)"
      : "var(--text-secondary)",
  }),

  errorList: {
    margin: "4px 0 0",
    paddingLeft: 16,
    fontSize: "0.8rem",
    color: "var(--badge-red-fg, #991b1b)",
    lineHeight: 1.6,
  } as React.CSSProperties,

  totalsRow: {
    display: "flex",
    gap: 20,
    flexWrap: "wrap" as const,
    marginBottom: 16,
  } as React.CSSProperties,

  totalTile: {
    flex: "1 1 120px",
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "12px 16px",
    textAlign: "center" as const,
  } as React.CSSProperties,

  totalNum: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "var(--text-primary)",
  } as React.CSSProperties,

  totalLabel: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  } as React.CSSProperties,

  guideTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.82rem",
  } as React.CSSProperties,
};

function DeleteDataSection() {
  const [confirm, setConfirm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<DeleteDataResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleReset() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await resetData();
      setResult(r);
      setConfirm(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err instanceof Error ? err.message : "Delete failed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const totalDeleted = result
    ? Object.values(result.deleted).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div
      style={{
        ...s.card,
        borderColor: "var(--badge-red-fg, #991b1b)",
        borderWidth: 1,
      }}
    >
      <div style={s.stepTitle}>
        <span
          style={{
            ...s.stepNum,
            background: "var(--badge-red-fg, #991b1b)",
          }}
        >
          ⚠
        </span>
        Delete All Data
      </div>
      <p style={s.stepDesc}>
        Permanently removes all records from every table except Users. Use this
        before re-importing a corrected spreadsheet. This cannot be undone.
      </p>

      {!confirm ? (
        <button
          style={{
            ...s.btnPrimary,
            background: "var(--badge-red-fg, #991b1b)",
          }}
          onClick={() => setConfirm(true)}
        >
          🗑 Delete All Data
        </button>
      ) : (
        <div
          style={{
            background: "var(--badge-red-bg, #fee2e2)",
            border: "1px solid var(--badge-red-fg, #991b1b)",
            borderRadius: 8,
            padding: "16px 20px",
          }}
        >
          <p
            style={{
              margin: "0 0 14px",
              fontWeight: 700,
              color: "var(--badge-red-fg, #991b1b)",
            }}
          >
            Are you sure? This will delete ALL students, admissions, kutirs,
            schools, geography, and lookup data. Users will not be affected.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              style={{
                ...s.btnPrimary,
                background: "var(--badge-red-fg, #991b1b)",
                opacity: loading ? 0.6 : 1,
              }}
              onClick={handleReset}
              disabled={loading}
            >
              {loading ? "Deleting…" : "Yes, Delete Everything"}
            </button>
            <button
              style={s.btnSecondary}
              onClick={() => setConfirm(false)}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            background: "var(--badge-red-bg, #fee2e2)",
            borderRadius: 6,
            color: "var(--badge-red-fg, #991b1b)",
            fontSize: "0.875rem",
          }}
        >
          ⚠ {error}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            background: "var(--badge-green-bg, #d1fae5)",
            borderRadius: 6,
            color: "var(--badge-green-fg, #065f46)",
            fontSize: "0.875rem",
          }}
        >
          ✓ Done — {totalDeleted} rows deleted across{" "}
          {Object.keys(result.deleted).length} tables.
        </div>
      )}
    </div>
  );
}

export default function ImportDataPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SheetResult[] | null>(null);
  const [totals, setTotals] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResults(null);
    setTotals(null);
    setError(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setResults(null); setTotals(null); setError(null); }
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setTotals(null);
    try {
      const resp = await uploadImportFile(file);
      setResults(resp.results);
      setTotals(resp.totals);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        (err instanceof Error ? err.message : "Upload failed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadTemplate() {
    setDownloading(true);
    try {
      await downloadTemplate();
    } catch {
      setError("Failed to download template.");
    } finally {
      setDownloading(false);
    }
  }

  const hasErrors = results?.some((r) => r.errors.length > 0);

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Import Data</h1>
      <p style={s.sub}>
        Upload the GRS Import Template (.xlsx) to bulk-import all master data.
        Sheets are processed in order; each sheet is committed independently.
      </p>

      {/* Step 1 — Download Template */}
      <div style={s.card}>
        <div style={s.stepTitle}>
          <span style={s.stepNum}>1</span>
          Download the Import Template
        </div>
        <p style={s.stepDesc}>
          Fill in the template with your data. Row 1 has instructions, Row 2 has
          column headers (red = required), and Row 3 shows an example (delete before
          uploading). Keep all sheet names unchanged.
        </p>
        <button
          style={downloading ? { ...s.btnPrimary, opacity: 0.6 } : s.btnPrimary}
          onClick={handleDownloadTemplate}
          disabled={downloading}
        >
          {downloading ? "Downloading…" : "⬇ Download GRS_Import_Template.xlsx"}
        </button>
      </div>

      {/* Step 2 — Upload & Import */}
      <div style={s.card}>
        <div style={s.stepTitle}>
          <span style={s.stepNum}>2</span>
          Upload &amp; Import
        </div>
        <p style={s.stepDesc}>
          Select your filled-in template (.xlsx). The import will process all 18
          sheets in order and report results per sheet.
        </p>

        <div
          style={s.uploadArea}
          onClick={() => fileInput.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {file ? (
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </span>
          ) : (
            <>
              Click to select file or drag &amp; drop here
              <br />
              <span style={{ fontSize: "0.78rem" }}>Accepts .xlsx only</span>
            </>
          )}
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            style={
              !file || loading
                ? { ...s.btnPrimary, opacity: 0.5, cursor: "not-allowed" }
                : s.btnPrimary
            }
            onClick={handleUpload}
            disabled={!file || loading}
          >
            {loading ? "Importing…" : "▶ Start Import"}
          </button>
          {file && !loading && (
            <button
              style={s.btnSecondary}
              onClick={() => {
                setFile(null);
                setResults(null);
                setTotals(null);
                setError(null);
                if (fileInput.current) fileInput.current.value = "";
              }}
            >
              Clear
            </button>
          )}
        </div>

        {error && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 14px",
              background: "var(--badge-red-bg, #fee2e2)",
              borderRadius: 6,
              color: "var(--badge-red-fg, #991b1b)",
              fontSize: "0.875rem",
            }}
          >
            ⚠ {error}
          </div>
        )}
      </div>

      {/* Results */}
      {results && totals && (
        <div style={s.card}>
          <div style={s.stepTitle}>
            <span style={s.stepNum}>✓</span>
            Import Results
          </div>

          {/* Totals */}
          <div style={s.totalsRow}>
            {[
              { label: "Total Rows", key: "total", color: "var(--text-primary)" },
              { label: "Created", key: "created", color: "var(--badge-green-fg, #065f46)" },
              { label: "Skipped", key: "skipped", color: "var(--text-secondary)" },
              { label: "Errors", key: "errors", color: "var(--badge-red-fg, #991b1b)" },
            ].map(({ label, key, color }) => (
              <div key={key} style={s.totalTile}>
                <div style={{ ...s.totalNum, color }}>{totals[key] ?? 0}</div>
                <div style={s.totalLabel}>{label}</div>
              </div>
            ))}
          </div>

          {hasErrors && (
            <div
              style={{
                padding: "8px 12px",
                background: "var(--badge-red-bg, #fee2e2)",
                borderRadius: 6,
                fontSize: "0.85rem",
                color: "var(--badge-red-fg, #991b1b)",
                marginBottom: 14,
              }}
            >
              Some sheets had errors. Review the table below for details.
            </div>
          )}

          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Sheet</th>
                <th style={{ ...s.th, textAlign: "center" }}>Rows</th>
                <th style={{ ...s.th, textAlign: "center" }}>Created</th>
                <th style={{ ...s.th, textAlign: "center" }}>Skipped</th>
                <th style={{ ...s.th, textAlign: "center" }}>Errors</th>
                <th style={s.th}>Error Details</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.sheet}>
                  <td style={{ ...s.td, fontWeight: 600, fontFamily: "monospace" }}>
                    {r.sheet}
                  </td>
                  <td style={{ ...s.td, textAlign: "center" }}>{r.total}</td>
                  <td style={{ ...s.td, textAlign: "center" }}>
                    {r.created > 0 ? (
                      <span style={s.badge("green")}>{r.created}</span>
                    ) : (
                      r.created
                    )}
                  </td>
                  <td style={{ ...s.td, textAlign: "center" }}>{r.skipped}</td>
                  <td style={{ ...s.td, textAlign: "center" }}>
                    {r.errors.length > 0 ? (
                      <span style={s.badge("red")}>{r.errors.length}</span>
                    ) : (
                      <span style={s.badge("green")}>0</span>
                    )}
                  </td>
                  <td style={s.td}>
                    {r.errors.length > 0 && (
                      <ul style={s.errorList}>
                        {r.errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete All Data */}
      <DeleteDataSection />

      {/* Sheet Guide */}
      <div style={s.card}>
        <div style={{ ...s.stepTitle, marginBottom: 12 }}>Sheet Guide</div>
        <table style={s.guideTable}>
          <thead>
            <tr>
              <th style={{ ...s.th, width: 200 }}>Sheet</th>
              <th style={s.th}>Description</th>
            </tr>
          </thead>
          <tbody>
            {SHEET_GUIDE.map((g) => (
              <tr key={g.name}>
                <td
                  style={{
                    ...s.td,
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "var(--badge-purple-fg, #7c3aed)",
                  }}
                >
                  {g.name}
                </td>
                <td style={{ ...s.td, color: "var(--text-secondary)" }}>{g.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
