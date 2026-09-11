import api from "./client";

export interface Kutir {
  id: number; name: string; kutir_type: string; cluster_id: number;
  district_id: number | null; village: string | null; street: string | null;
  state: string; pincode: string | null; teacher_id: number | null;
  donor_id: number | null; enrollment_5th: number | null; enrollment_8th: number | null;
}
export interface KutirCreate {
  name: string; kutir_type: string; cluster_id: number; district_id?: number | null;
  village?: string | null; street?: string | null; state?: string; pincode?: string | null;
  enrollment_5th?: number | null; enrollment_8th?: number | null;
}
export const listKutirs = async (params?: { cluster_id?: number; district_id?: number }): Promise<Kutir[]> =>
  (await api.get("/kutirs", { params })).data;
export const createKutir = async (data: KutirCreate): Promise<Kutir> => (await api.post("/kutirs", data)).data;
export const updateKutir = async (id: number, data: Partial<KutirCreate>): Promise<Kutir> => (await api.put(`/kutirs/${id}`, data)).data;
