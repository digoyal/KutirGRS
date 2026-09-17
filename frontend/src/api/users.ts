import api from "./client";

export interface User {
  id: number;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  title: string | null;
  zone_ids: number[];
  district_ids: number[];
  area_ids: number[];
  cluster_ids: number[];
  kutir_ids: number[];
  is_active: boolean;
  is_superuser: boolean;
}

export interface UserCreate {
  username: string;
  password: string;
  title?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  zone_ids?: number[];
  district_ids?: number[];
  area_ids?: number[];
  cluster_ids?: number[];
  kutir_ids?: number[];
  is_active?: boolean;
}

export interface UserUpdate {
  title?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  zone_ids?: number[];
  district_ids?: number[];
  area_ids?: number[];
  cluster_ids?: number[];
  kutir_ids?: number[];
  is_active?: boolean;
  password?: string;
}

export const listUsers  = async (): Promise<User[]>  => (await api.get("/users")).data;
export const getUser    = async (id: number): Promise<User> => (await api.get(`/users/${id}`)).data;
export const createUser = async (data: UserCreate): Promise<User> => (await api.post("/users", data)).data;
export const updateUser = async (id: number, data: UserUpdate): Promise<User> => (await api.put(`/users/${id}`, data)).data;
export const deleteUser = async (id: number): Promise<void> => { await api.delete(`/users/${id}`); };
