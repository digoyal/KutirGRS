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
  district_id?: number;
  cluster_id?: number;
  skip?: number;
  limit?: number;
  offset?: number;
  search?: string;
  name_only?: boolean;
}

export interface StudentsPage {
  items: Student[];
  total: number;
}

export async function listStudents(params: StudentsListParams = {}): Promise<Student[]> {
  const { data } = await api.get("/students", { params });
  return data;
}

export async function listStudentsPaged(params: StudentsListParams = {}): Promise<StudentsPage> {
  const { data, headers } = await api.get("/students", { params });
  return { items: data, total: parseInt(headers["x-total-count"] ?? "0", 10) };
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

export interface SubjectRef { id: number; name: string; code?: string | null; }
export interface SchoolTypeSubjectRow { id: number; school_type: string; subjects: SubjectRef[]; }

export async function listSchoolTypeSubjects(): Promise<SchoolTypeSubjectRow[]> {
  const { data } = await api.get("/school-type-subjects");
  return data;
}
