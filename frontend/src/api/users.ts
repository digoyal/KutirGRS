import api from "./client";

export interface User {
  id: number; username: string; email: string | null; first_name: string | null;
  last_name: string | null; phone: string | null; title: string | null;
  is_active: boolean; is_superuser: boolean;
}
export interface UserCreate {
  username: string; password: string; title?: string | null; first_name?: string | null;
  last_name?: string | null; phone?: string | null; email?: string | null; is_active?: boolean;
}
export const listUsers = async (): Promise<User[]> => (await api.get("/users")).data;
export const createUser = async (data: UserCreate): Promise<User> => (await api.post("/users", data)).data;
export const updateUser = async (id: number, data: Partial<UserCreate>): Promise<User> => (await api.put(`/users/${id}`, data)).data;
