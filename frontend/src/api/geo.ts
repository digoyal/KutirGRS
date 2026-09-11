import api from "./client";

export interface Zone     { id: number; name: string; zonal_head_id?: number | null; }
export interface District { id: number; name: string; zone_id: number; district_anchor_id?: number | null; }
export interface Area     { id: number; name: string; district_id: number; education_coordinator_id?: number | null; }
export interface Cluster  { id: number; name: string; area_id: number; cluster_coordinator_id?: number | null; }

export const listZones = async (): Promise<Zone[]> => (await api.get("/geo/zones")).data;
export const listDistricts = async (zone_id?: number): Promise<District[]> => (await api.get("/geo/districts", { params: zone_id ? { zone_id } : {} })).data;
export const listAreas = async (district_id?: number): Promise<Area[]> => (await api.get("/geo/areas", { params: district_id ? { district_id } : {} })).data;
export const listClusters = async (area_id?: number): Promise<Cluster[]> => (await api.get("/geo/clusters", { params: area_id ? { area_id } : {} })).data;

export const createZone = async (data: { name: string }): Promise<Zone> => (await api.post("/geo/zones", data)).data;
export const createDistrict = async (data: { name: string; zone_id: number }): Promise<District> => (await api.post("/geo/districts", data)).data;
export const createArea = async (data: { name: string; district_id: number }): Promise<Area> => (await api.post("/geo/areas", data)).data;
export const createCluster = async (data: { name: string; area_id: number }): Promise<Cluster> => (await api.post("/geo/clusters", data)).data;

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
