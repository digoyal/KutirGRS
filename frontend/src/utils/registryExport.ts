import type { Col } from "@parivaar/ui";
import type { FieldMeta } from "../hooks/useFieldConfig";

/** Soft cap for server-side export fetches (same filters, high limit). */
export const EXPORT_ROW_CAP = 50_000;

export function exportFetchLimit(total: number): number {
  if (total <= 0) return 1;
  return Math.min(total, EXPORT_ROW_CAP);
}

function defaultCsvCell<T extends object>(row: T, key: string): string {
  return String((row as Record<string, unknown>)[key] ?? "");
}

/**
 * CSV columns from full field registry (minus `actions`), using renderer csvValue when present.
 */
export function buildRegistryExportColumns<T extends object>(
  registry: FieldMeta[],
  renderers: Record<string, Partial<Col<T>>>,
): Col<T>[] {
  return registry
    .filter((m) => m.key !== "actions")
    .map((meta) => {
      const r = renderers[meta.key] ?? {};
      return {
        key: meta.key,
        label: meta.label,
        csvValue: r.csvValue ?? ((row: T) => defaultCsvCell(row, meta.key)),
        sortValue: r.sortValue,
      };
    });
}

/** Registry export columns from a full column def list (e.g. Visits / Admissions allColumns). */
export function buildRegistryExportColumnsFromCols<T extends object>(
  registry: FieldMeta[],
  defs: Col<T>[],
): Col<T>[] {
  const colByKey = new Map(defs.map((c) => [c.key, c]));
  return registry
    .filter((m) => m.key !== "actions")
    .map((meta) => {
      const col = colByKey.get(meta.key);
      return {
        key: meta.key,
        label: meta.label,
        csvValue: col?.csvValue ?? ((row: T) => defaultCsvCell(row, meta.key)),
        sortValue: col?.sortValue,
      };
    });
}

export function csvEscape(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

export function rowsToCsv<T extends object>(cols: Col<T>[], rows: T[]): string {
  const headers = cols.map((c) => csvEscape(c.label));
  const body = rows.map((row) =>
    cols.map((c) => {
      const val = c.csvValue ? c.csvValue(row) : defaultCsvCell(row, c.key);
      return csvEscape(val);
    }),
  );
  return [headers, ...body].map((r) => r.join(",")).join("\n");
}

export function downloadCsvFile(filename: string, csv: string): void {
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
}
