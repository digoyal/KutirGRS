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

export interface UsersListParams {
  is_active?: boolean;
  title?: string;
  /** Filter by role title (server `role` query param). */
  role?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface UsersPage {
  items: User[];
  total: number;
}

export async function listUsers(params: UsersListParams = {}): Promise<User[]> {
  const { data } = await api.get("/users", { params });
  return data;
}

export async function listUsersPaged(params: UsersListParams = {}): Promise<UsersPage> {
  const { data, headers } = await api.get("/users", { params });
  return { items: data, total: parseInt(headers["x-total-count"] ?? "0", 10) };
}

export const getUser    = async (id: number): Promise<User> => (await api.get(`/users/${id}`)).data;
export const createUser = async (data: UserCreate): Promise<User> => (await api.post("/users", data)).data;
export const updateUser = async (id: number, data: UserUpdate): Promise<User> => (await api.put(`/users/${id}`, data)).data;
export const deleteUser = async (id: number): Promise<void> => { await api.delete(`/users/${id}`); };
