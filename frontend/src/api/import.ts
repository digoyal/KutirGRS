import api from "./client";

export interface SheetResult {
  sheet: string;
  total: number;
  created: number;
  skipped: number;
  errors: string[];
}

export interface ImportResponse {
  results: SheetResult[];
  totals: {
    total: number;
    created: number;
    skipped: number;
    errors: number;
  };
}

export async function uploadImportFile(file: File): Promise<ImportResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post<ImportResponse>("/import/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export function getTemplateUrl(): string {
  const base =
    (import.meta.env.VITE_API_URL as string | undefined) ??
    "http://localhost:8001/api/v1";
  const token = localStorage.getItem("access_token") ?? "";
  // We'll trigger download programmatically with auth header
  return `${base}/import/template?token=${encodeURIComponent(token)}`;
}

export async function downloadTemplate(): Promise<void> {
  const token = localStorage.getItem("access_token") ?? "";
  const base =
    (import.meta.env.VITE_API_URL as string | undefined) ??
    "http://localhost:8001/api/v1";
  const res = await fetch(`${base}/import/template`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to download template");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "GRS_Import_Template.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

export interface DeleteDataResponse {
  deleted: Record<string, number>;
}

export async function resetData(): Promise<DeleteDataResponse> {
  const res = await api.delete<DeleteDataResponse>("/import/reset");
  return res.data;
}
