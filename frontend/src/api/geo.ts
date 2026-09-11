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
