import api from "./client";

export interface TeacherMin {
  id: number;
  username: string;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface Kutir {
  id: number; name: string; kutir_type: string; cluster_id: number;
  district_id: number | null; street: string | null;
  state: string; pincode: string | null;
  donor_id: number | null; enrollment_5th: number | null; enrollment_8th: number | null;
  teachers?: TeacherMin[];
}

export interface KutirDetail extends Kutir {
  cluster?: {
    id: number; name: string;
    area?: {
      id: number; name: string;
      district?: {
        id: number; name: string;
        zone?: { id: number; name: string };
      };
    };
  } | null;
  teacher?: {
    id: number; username: string; title?: string | null;
    first_name?: string | null; last_name?: string | null;
  } | null;
}

export interface KutirCreate {
  name: string; kutir_type: string; cluster_id: number; district_id?: number | null;
  street?: string | null; state?: string; pincode?: string | null;
  enrollment_5th?: number | null; enrollment_8th?: number | null;
}

export const listKutirs = async (params?: { cluster_id?: number; district_id?: number }): Promise<Kutir[]> =>
  (await api.get("/kutirs", { params })).data;
export const getKutir = async (id: number): Promise<KutirDetail> => (await api.get(`/kutirs/${id}`)).data;
export const createKutir = async (data: KutirCreate): Promise<Kutir> => (await api.post("/kutirs", data)).data;
export const updateKutir = async (id: number, data: Partial<KutirCreate>): Promise<Kutir> => (await api.put(`/kutirs/${id}`, data)).data;
export const deleteKutir = async (id: number): Promise<void> => { await api.delete(`/kutirs/${id}`); };
