/** CSV download and printable HTML table — shared by embedded and standalone reports. */

function csvRow(values: string[]): string {
  return values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const csv = [csvRow(headers), ...rows.map(csvRow)].join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = filename;
  a.click();
}

export function printHtmlTable(options: {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: string[][];
  recordCount?: number;
}): void {
  const w = window.open("", "_blank");
  if (!w) return;
  const thStyle =
    "border:1px solid #ccc;padding:6px 10px;font-size:12px;background:#fef3c7;text-align:left;font-weight:600";
  const tdStyle = "border:1px solid #e5e7eb;padding:6px 10px;font-size:12px";
  const ths = options.columns.map((c) => `<th style="${thStyle}">${c}</th>`).join("");
  const trs = options.rows
    .map((row, i) => {
      const cells = row
        .map((v) => `<td style="${tdStyle}">${v.replace(/</g, "&lt;")}</td>`)
        .join("");
      return `<tr style="background:${i % 2 === 0 ? "#ffffff" : "#fffbeb"}">${cells}</tr>`;
    })
    .join("");
  const subtitle = options.subtitle
    ? `<p style="color:#6b7280;font-size:12px;margin:0 0 16px">${options.subtitle}</p>`
    : "";
  const count =
    options.recordCount != null
      ? `<p style="color:#6b7280;font-size:12px;margin-top:12px">${options.recordCount} records</p>`
      : "";
  w.document.write(
    `<html><head><title>${options.title}</title></head><body style="font-family:sans-serif;padding:20px">` +
      `<h2 style="margin:0 0 8px">${options.title}</h2>` +
      subtitle +
      `<table style="border-collapse:collapse;width:100%">` +
      `<thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>` +
      count +
      `</body></html>`,
  );
  w.document.close();
  w.focus();
  w.print();
}
