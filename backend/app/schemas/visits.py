from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


class KutirVisitBase(BaseModel):
    kutir_id: int
    visited_by_id: Optional[int] = None
    visit_date: date

    # Attendance & implementation
    avg_attendance_last_week: int = Field(..., ge=0)
    follow_timetable: bool = False
    follow_monthly_plan: bool = False
    timetable_plan_reason: Optional[str] = None

    # Topics
    math_topics_pre: Optional[str] = None
    math_topics_upper: Optional[str] = None
    english_topics_pre: Optional[str] = None
    english_topics_upper: Optional[str] = None

    # Time slots
    timeslot_utilization: bool = False
    timeslot_reason: Optional[str] = None

    # GRS prep
    grs_prep_remarks: Optional[str] = None

    # Registers & materials
    physical_vs_registered: str          # Matched / Not Matched
    workbook_percentage: int = Field(..., ge=0, le=100)
    workbook_completion: str             # Upto Date / Partial Upto Date / Not Uptodate
    book_availability: str               # Sufficient / Lacking / More than required

    # Ratings 1–5
    cleanliness: int = Field(..., ge=1, le=5)
    hindi_proficiency: int = Field(..., ge=1, le=5)
    english_proficiency: int = Field(..., ge=1, le=5)
    maths_proficiency: int = Field(..., ge=1, le=5)
    evs_proficiency: int = Field(..., ge=1, le=5)
    reasoning_proficiency: int = Field(..., ge=1, le=5)
    material_management: int = Field(..., ge=1, le=5)
    kutir_performance: int = Field(..., ge=1, le=5)

    # Document registers
    reg_admission_forms: bool = False
    reg_attendance_students: bool = False
    reg_daily_activity: bool = False
    reg_observation: bool = False
    reg_students_data: bool = False
    reg_attendance_teachers: bool = False
    reg_students_documents: bool = False

    # Regular students
    regular_students: Optional[int] = None

    # Time slot activities
    timeslot_bal_sabha: bool = False
    timeslot_sports: bool = False
    timeslot_yoga: bool = False
    timeslot_value_ed: bool = False
    timeslot_gk_map: bool = False

    final_remarks: Optional[str] = None


class KutirVisitCreate(KutirVisitBase):
    pass


class KutirVisitUpdate(BaseModel):
    visited_by_id: Optional[int] = None
    visit_date: Optional[date] = None
    avg_attendance_last_week: Optional[int] = Field(None, ge=0)
    follow_timetable: Optional[bool] = None
    follow_monthly_plan: Optional[bool] = None
    timetable_plan_reason: Optional[str] = None
    math_topics_pre: Optional[str] = None
    math_topics_upper: Optional[str] = None
    english_topics_pre: Optional[str] = None
    english_topics_upper: Optional[str] = None
    timeslot_utilization: Optional[bool] = None
    timeslot_reason: Optional[str] = None
    grs_prep_remarks: Optional[str] = None
    physical_vs_registered: Optional[str] = None
    workbook_percentage: Optional[int] = Field(None, ge=0, le=100)
    workbook_completion: Optional[str] = None
    book_availability: Optional[str] = None
    cleanliness: Optional[int] = Field(None, ge=1, le=5)
    hindi_proficiency: Optional[int] = Field(None, ge=1, le=5)
    english_proficiency: Optional[int] = Field(None, ge=1, le=5)
    maths_proficiency: Optional[int] = Field(None, ge=1, le=5)
    evs_proficiency: Optional[int] = Field(None, ge=1, le=5)
    reasoning_proficiency: Optional[int] = Field(None, ge=1, le=5)
    material_management: Optional[int] = Field(None, ge=1, le=5)
    kutir_performance: Optional[int] = Field(None, ge=1, le=5)
    reg_admission_forms: Optional[bool] = None
    reg_attendance_students: Optional[bool] = None
    reg_daily_activity: Optional[bool] = None
    reg_observation: Optional[bool] = None
    reg_students_data: Optional[bool] = None
    reg_attendance_teachers: Optional[bool] = None
    reg_students_documents: Optional[bool] = None
    regular_students: Optional[int] = None
    timeslot_bal_sabha: Optional[bool] = None
    timeslot_sports: Optional[bool] = None
    timeslot_yoga: Optional[bool] = None
    timeslot_value_ed: Optional[bool] = None
    timeslot_gk_map: Optional[bool] = None
    final_remarks: Optional[str] = None


class KutirVisitOut(KutirVisitBase):
    id: int
    visit_photo: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
