import api from "./client";

// ── School (minimal) ─────────────────────────────────────────────────────────
export interface SchoolMin {
  id: number;
  name: string;
  school_type: string;
  city: string | null;
  state: string;
}

// ── StudentExam ──────────────────────────────────────────────────────────────
export interface ExamScore {
  id: number;
  subject_id: number;
  subject?: { id: number; name: string };
  score: number | null;
}

export interface StudentExam {
  id: number;
  student_id: number;
  school_id: number;
  school_start_year: number;
  eligible: boolean;
  form_received: boolean;
  applied: boolean;
  appeared: boolean;
  selected: boolean;
  admitted: boolean;
  admitted_school_id: number | null;
  no_admit_reason_id: number | null;
  exam_category_id: number | null;
  application_number: string | null;
  exam_center_id: number | null;
  roll_number: string | null;
  no_exam_reason_id: number | null;
  math: number | null;
  english: number | null;
  reasoning: number | null;
  evs: number | null;
  scores: ExamScore[];
  school?: SchoolMin;
  created_at: string;
  updated_at: string;
}

export interface StudentExamCreate {
  student_id: number;
  school_id: number;
  school_start_year: number;
  eligible?: boolean;
  form_received?: boolean;
  applied?: boolean;
  appeared?: boolean;
  selected?: boolean;
  admitted?: boolean;
  admitted_school_id?: number | null;
  no_admit_reason_id?: number | null;
  exam_category_id?: number | null;
  application_number?: string | null;
  exam_center_id?: number | null;
  roll_number?: string | null;
  no_exam_reason_id?: number | null;
  math?: number | null;
  english?: number | null;
  reasoning?: number | null;
  evs?: number | null;
  scores?: { subject_id: number; score: number | null }[];
}

// ── StudentProgress ──────────────────────────────────────────────────────────
export interface StudentProgress {
  id: number;
  student_id: number;
  school_id: number;
  academic_year: number;
  grade: number;
  is_enrolled: boolean;
  exit_reason: string | null;
  previous_year_percentage: number | null;
  remarks: string | null;
  school?: SchoolMin;
  created_at: string;
  updated_at: string;
}

export interface StudentProgressCreate {
  student_id: number;
  school_id: number;
  academic_year: number;
  grade: number;
  is_enrolled?: boolean;
  exit_reason?: string | null;
  previous_year_percentage?: number | null;
  remarks?: string | null;
}

// ── API calls ────────────────────────────────────────────────────────────────
export async function listExams(params: {
  student_id?: number;
  school_id?: number;
  school_start_year?: number;
} = {}): Promise<StudentExam[]> {
  const { data } = await api.get("/student-exams", { params });
  return data;
}

export async function getExam(id: number): Promise<StudentExam> {
  const { data } = await api.get(`/student-exams/${id}`);
  return data;
}

export async function createExam(payload: StudentExamCreate): Promise<StudentExam> {
  const { data } = await api.post("/student-exams", payload);
  return data;
}

export async function updateExam(id: number, payload: Partial<StudentExamCreate>): Promise<StudentExam> {
  const { data } = await api.patch(`/student-exams/${id}`, payload);
  return data;
}

export async function deleteExam(id: number): Promise<void> {
  await api.delete(`/student-exams/${id}`);
}

export async function listProgress(params: {
  student_id?: number;
  school_id?: number;
} = {}): Promise<StudentProgress[]> {
  const { data } = await api.get("/student-progress", { params });
  return data;
}

export async function createProgress(payload: StudentProgressCreate): Promise<StudentProgress> {
  const { data } = await api.post("/student-progress", payload);
  return data;
}

export async function updateProgress(id: number, payload: Partial<StudentProgressCreate>): Promise<StudentProgress> {
  const { data } = await api.patch(`/student-progress/${id}`, payload);
  return data;
}

export async function deleteProgress(id: number): Promise<void> {
  await api.delete(`/student-progress/${id}`);
}
