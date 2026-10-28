import api from "./client";

export interface Donor {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export interface DonorCreate {
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export const listDonors = async (): Promise<Donor[]> =>
  (await api.get("/donors")).data;

export const createDonor = async (data: DonorCreate): Promise<Donor> =>
  (await api.post("/donors", data)).data;

export const updateDonor = async (
  id: number,
  data: Partial<DonorCreate>,
): Promise<Donor> => (await api.put(`/donors/${id}`, data)).data;

export const deleteDonor = async (id: number): Promise<void> => {
  await api.delete(`/donors/${id}`);
};
