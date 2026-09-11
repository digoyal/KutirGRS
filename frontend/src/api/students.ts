import api from "./client";

export interface Student {
  id: number;
  kutir_id: number | null;
  first_name: string;
  last_name: string;
  gender: string;
  dob: string | null;
  phone: string | null;
  email: string | null;
  father_name: string | null;
  mother_name: string | null;
  street: string | null;
  pincode: string | null;
  category_id: number | null;
  sub_category_id: number | null;
  aadhaar: boolean;
  category_cert: boolean;
  birth_cert: boolean;
  residence_proof: boolean;
  medical: boolean;
  alt_contact_name: string | null;
  alt_contact_phone: string | null;
  photo: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentCreate {
  first_name: string;
  last_name: string;
  gender: string;
  kutir_id?: number | null;
  dob?: string | null;
  phone?: string | null;
  email?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  street?: string | null;
  pincode?: string | null;
  category_id?: number | null;
  sub_category_id?: number | null;
  alt_contact_name?: string | null;
  alt_contact_phone?: string | null;
  aadhaar?: boolean;
  category_cert?: boolean;
  birth_cert?: boolean;
  residence_proof?: boolean;
  medical?: boolean;
}

export interface StudentsListParams {
  kutir_id?: number;
  skip?: number;
  limit?: number;
  search?: string;
}

export async function listStudents(params: StudentsListParams = {}): Promise<Student[]> {
  const { data } = await api.get("/students", { params });
  return data;
}

export async function getStudent(id: number): Promise<Student> {
  const { data } = await api.get(`/students/${id}`);
  return data;
}

export async function createStudent(payload: StudentCreate): Promise<Student> {
  const { data } = await api.post("/students", payload);
  return data;
}

export async function updateStudent(id: number, payload: Partial<StudentCreate>): Promise<Student> {
  const { data } = await api.patch(`/students/${id}`, payload);
  return data;
}

export async function deleteStudent(id: number): Promise<void> {
  await api.delete(`/students/${id}`);
}
