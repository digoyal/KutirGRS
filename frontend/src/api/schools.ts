import api from "./client";

export interface School {
  id: number;
  name: string;
  school_type: string;
  street: string | null;
  city: string | null;
  district_id: number | null;
  state: string;
  pincode: string | null;
}

export interface SchoolCreate {
  name: string;
  school_type: string;
  state?: string;
  city?: string | null;
  street?: string | null;
  district_id?: number | null;
  pincode?: string | null;
}

export async function listSchools(params: { district_id?: number } = {}): Promise<School[]> {
  const { data } = await api.get("/schools", { params });
  return data;
}

export async function getSchool(id: number): Promise<School> {
  const { data } = await api.get(`/schools/${id}`);
  return data;
}

export async function createSchool(payload: SchoolCreate): Promise<School> {
  const { data } = await api.post("/schools", payload);
  return data;
}

export async function updateSchool(id: number, payload: Partial<SchoolCreate>): Promise<School> {
  const { data } = await api.patch(`/schools/${id}`, payload);
  return data;
}

export async function deleteSchool(id: number): Promise<void> {
  await api.delete(`/schools/${id}`);
}
