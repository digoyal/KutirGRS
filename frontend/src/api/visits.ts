import api from "./client";

export interface KutirVisit {
  id: number;
  kutir_id: number;
  visited_by_id: number | null;
  visit_date: string;
  avg_attendance_last_week: number;
  follow_timetable: boolean;
  follow_monthly_plan: boolean;
  timetable_plan_reason: string | null;
  math_topics_pre: string | null;
  math_topics_upper: string | null;
  english_topics_pre: string | null;
  english_topics_upper: string | null;
  timeslot_utilization: boolean;
  timeslot_reason: string | null;
  grs_prep_remarks: string | null;
  physical_vs_registered: "Matched" | "Not Matched";
  workbook_percentage: number;
  workbook_completion: "Upto Date" | "Partial Upto Date" | "Not Uptodate";
  book_availability: "Sufficient" | "Lacking" | "More than required";
  cleanliness: number;
  hindi_proficiency: number;
  english_proficiency: number;
  maths_proficiency: number;
  evs_proficiency: number;
  reasoning_proficiency: number;
  material_management: number;
  kutir_performance: number;
  reg_admission_forms: boolean;
  reg_attendance_students: boolean;
  reg_daily_activity: boolean;
  reg_observation: boolean;
  reg_students_data: boolean;
  reg_attendance_teachers: boolean;
  reg_students_documents: boolean;
  regular_students: number | null;
  timeslot_bal_sabha: boolean;
  timeslot_sports: boolean;
  timeslot_yoga: boolean;
  timeslot_value_ed: boolean;
  timeslot_gk_map: boolean;
  visit_photo: string | null;
  final_remarks: string | null;
  created_at: string;
  updated_at: string;
}

export type KutirVisitCreate = Omit<KutirVisit, "id" | "visited_by_id" | "visit_photo" | "created_at" | "updated_at">;

export const BLANK_VISIT: KutirVisitCreate = {
  kutir_id: 0,
  visit_date: new Date().toISOString().slice(0, 10),
  avg_attendance_last_week: 0,
  follow_timetable: false,
  follow_monthly_plan: false,
  timetable_plan_reason: null,
  math_topics_pre: null,
  math_topics_upper: null,
  english_topics_pre: null,
  english_topics_upper: null,
  timeslot_utilization: false,
  timeslot_reason: null,
  grs_prep_remarks: null,
  physical_vs_registered: "Matched",
  workbook_percentage: 0,
  workbook_completion: "Upto Date",
  book_availability: "Sufficient",
  cleanliness: 3,
  hindi_proficiency: 3,
  english_proficiency: 3,
  maths_proficiency: 3,
  evs_proficiency: 3,
  reasoning_proficiency: 3,
  material_management: 3,
  kutir_performance: 3,
  reg_admission_forms: false,
  reg_attendance_students: false,
  reg_daily_activity: false,
  reg_observation: false,
  reg_students_data: false,
  reg_attendance_teachers: false,
  reg_students_documents: false,
  regular_students: null,
  timeslot_bal_sabha: false,
  timeslot_sports: false,
  timeslot_yoga: false,
  timeslot_value_ed: false,
  timeslot_gk_map: false,
  final_remarks: null,
};

export async function listVisits(params: { kutir_id?: number; limit?: number } = {}): Promise<KutirVisit[]> {
  const { data } = await api.get("/kutir-visits", { params: { limit: 200, ...params } });
  return data;
}

export async function getVisit(id: number): Promise<KutirVisit> {
  const { data } = await api.get(`/kutir-visits/${id}`);
  return data;
}

export async function createVisit(payload: KutirVisitCreate): Promise<KutirVisit> {
  const { data } = await api.post("/kutir-visits", payload);
  return data;
}

export async function updateVisit(id: number, payload: Partial<KutirVisitCreate>): Promise<KutirVisit> {
  const { data } = await api.patch(`/kutir-visits/${id}`, payload);
  return data;
}

export async function deleteVisit(id: number): Promise<void> {
  await api.delete(`/kutir-visits/${id}`);
}

export async function uploadVisitPhoto(id: number, file: File): Promise<KutirVisit> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post(`/kutir-visits/${id}/photo`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
