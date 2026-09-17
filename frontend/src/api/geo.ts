import api from "./client";

export interface Zone     { id: number; name: string; }
export interface District { id: number; name: string; zone_id: number; }
export interface Area     { id: number; name: string; district_id: number; }
export interface Cluster  { id: number; name: string; area_id: number; }

export const listZones = async (): Promise<Zone[]> => (await api.get("/geo/zones")).data;
export const listDistricts = async (zone_id?: number): Promise<District[]> => (await api.get("/geo/districts", { params: zone_id ? { zone_id } : {} })).data;
export const listAreas = async (district_id?: number): Promise<Area[]> => (await api.get("/geo/areas", { params: district_id ? { district_id } : {} })).data;
export const listClusters = async (area_id?: number): Promise<Cluster[]> => (await api.get("/geo/clusters", { params: area_id ? { area_id } : {} })).data;

export const createZone    = async (data: { name: string }): Promise<Zone>     => (await api.post("/geo/zones", data)).data;
export const updateZone    = async (id: number, data: Partial<Zone>): Promise<Zone>     => (await api.put(`/geo/zones/${id}`, data)).data;
export const deleteZone    = async (id: number): Promise<void>                           => { await api.delete(`/geo/zones/${id}`); };
export const createDistrict = async (data: { name: string; zone_id: number }): Promise<District> => (await api.post("/geo/districts", data)).data;
export const updateDistrict = async (id: number, data: Partial<District>): Promise<District> => (await api.put(`/geo/districts/${id}`, data)).data;
export const deleteDistrict = async (id: number): Promise<void>                               => { await api.delete(`/geo/districts/${id}`); };
export const createArea    = async (data: { name: string; district_id: number }): Promise<Area>  => (await api.post("/geo/areas", data)).data;
export const updateArea    = async (id: number, data: Partial<Area>): Promise<Area>    => (await api.put(`/geo/areas/${id}`, data)).data;
export const deleteArea    = async (id: number): Promise<void>                          => { await api.delete(`/geo/areas/${id}`); };
export const createCluster = async (data: { name: string; area_id: number }): Promise<Cluster>  => (await api.post("/geo/clusters", data)).data;
export const updateCluster = async (id: number, data: Partial<Cluster>): Promise<Cluster> => (await api.put(`/geo/clusters/${id}`, data)).data;
export const deleteCluster = async (id: number): Promise<void>                              => { await api.delete(`/geo/clusters/${id}`); };

// ── Exam Centers ─────────────────────────────────────────────────────────────
export interface ExamCenter { id: number; name: string; district_id?: number | null; street?: string | null; city?: string | null; state?: string | null; pincode?: string | null; }
export const listExamCenters = async (): Promise<ExamCenter[]> => (await api.get("/geo/exam-centers")).data;

// ── Lookups ──────────────────────────────────────────────────────────────────
export interface ExamCategory   { id: number; name: string; }
export interface NoExamReason   { id: number; reason: string; }
export interface NoAdmitReason  { id: number; reason: string; }

export const listExamCategories  = async (): Promise<ExamCategory[]>  => (await api.get("/lookups/exam-categories")).data;
export const listNoExamReasons   = async (): Promise<NoExamReason[]>  => (await api.get("/lookups/no-exam-reasons")).data;
export const listNoAdmitReasons  = async (): Promise<NoAdmitReason[]> => (await api.get("/lookups/no-admit-reasons")).data;

export interface Category    { id: number; name: string; }
export interface SubCategory { id: number; name: string; category_id: number; }

export const listCategories    = async (): Promise<Category[]>    => (await api.get("/lookups/categories")).data;
export const listSubCategories = async (category_id?: number): Promise<SubCategory[]> => {
  const params = category_id ? { category_id } : {};
  return (await api.get("/lookups/sub-categories", { params })).data;
};
