from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# ── SchoolTypeSubject ────────────────────────────────────────────────────────
class SchoolTypeSubjectBase(BaseModel):
    school_type: str
    subject_ids: list[int] = []

class SchoolTypeSubjectCreate(SchoolTypeSubjectBase):
    pass

class SchoolTypeSubjectUpdate(BaseModel):
    subject_ids: Optional[list[int]] = None

class SubjectRef(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}

class SchoolTypeSubjectOut(BaseModel):
    id: int
    school_type: str
    subjects: list[SubjectRef] = []
    model_config = {"from_attributes": True}


# ── Student ──────────────────────────────────────────────────────────────────
class StudentBase(BaseModel):
    kutir_id: Optional[int] = None
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    gender: str                           # Boy / Girl
    dob: Optional[date] = None
    street: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    category_id: Optional[int] = None
    sub_category_id: Optional[int] = None
    alt_contact_name: Optional[str] = None
    alt_contact_phone: Optional[str] = None
    aadhaar: bool = False
    category_cert: bool = False
    birth_cert: bool = False
    residence_proof: bool = False
    medical: bool = False

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    kutir_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[date] = None
    street: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    category_id: Optional[int] = None
    sub_category_id: Optional[int] = None
    alt_contact_name: Optional[str] = None
    alt_contact_phone: Optional[str] = None
    aadhaar: Optional[bool] = None
    category_cert: Optional[bool] = None
    birth_cert: Optional[bool] = None
    residence_proof: Optional[bool] = None
    medical: Optional[bool] = None

class StudentOut(StudentBase):
    id: int
    photo: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ── StudentExamScore ─────────────────────────────────────────────────────────
class ExamScoreBase(BaseModel):
    subject_id: int
    score: Optional[float] = None

class ExamScoreCreate(ExamScoreBase):
    pass

class ExamScoreOut(BaseModel):
    id: int
    subject_id: int
    subject: SubjectRef
    score: Optional[float] = None
    model_config = {"from_attributes": True}


# ── StudentExam ──────────────────────────────────────────────────────────────
class StudentExamBase(BaseModel):
    student_id: int
    school_id: int
    school_start_year: int
    eligible: bool = True
    form_received: bool = False
    applied: bool = False
    appeared: bool = False
    selected: bool = False
    admitted: bool = False
    admitted_school_id: Optional[int] = None
    no_admit_reason_id: Optional[int] = None
    exam_category_id: Optional[int] = None
    application_number: Optional[str] = None
    exam_center_id: Optional[int] = None
    roll_number: Optional[str] = None
    no_exam_reason_id: Optional[int] = None
    math: Optional[float] = None
    english: Optional[float] = None
    reasoning: Optional[float] = None
    evs: Optional[float] = None

class StudentExamCreate(StudentExamBase):
    scores: list[ExamScoreCreate] = []

class StudentExamUpdate(BaseModel):
    eligible: Optional[bool] = None
    form_received: Optional[bool] = None
    applied: Optional[bool] = None
    appeared: Optional[bool] = None
    selected: Optional[bool] = None
    admitted: Optional[bool] = None
    admitted_school_id: Optional[int] = None
    no_admit_reason_id: Optional[int] = None
    exam_category_id: Optional[int] = None
    application_number: Optional[str] = None
    exam_center_id: Optional[int] = None
    roll_number: Optional[str] = None
    no_exam_reason_id: Optional[int] = None
    math: Optional[float] = None
    english: Optional[float] = None
    reasoning: Optional[float] = None
    evs: Optional[float] = None
    scores: Optional[list[ExamScoreCreate]] = None

class StudentExamOut(StudentExamBase):
    id: int
    scores: list[ExamScoreOut] = []
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ── StudentProgress ──────────────────────────────────────────────────────────
class StudentProgressBase(BaseModel):
    student_id: int
    school_id: int
    academic_year: int
    grade: int = Field(..., ge=6, le=12)
    is_enrolled: bool = True
    exit_reason: Optional[str] = None
    previous_year_percentage: Optional[Decimal] = None
    remarks: Optional[str] = None

class StudentProgressCreate(StudentProgressBase):
    pass

class StudentProgressUpdate(BaseModel):
    academic_year: Optional[int] = None
    grade: Optional[int] = Field(None, ge=6, le=12)
    is_enrolled: Optional[bool] = None
    exit_reason: Optional[str] = None
    previous_year_percentage: Optional[Decimal] = None
    remarks: Optional[str] = None

class StudentProgressOut(StudentProgressBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
