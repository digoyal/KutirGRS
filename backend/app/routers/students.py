"""
Students, StudentExams, StudentExamScores, StudentProgress, SchoolTypeSubjects
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import select, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user, require_admin
from app.models.students import (
    Student, StudentExam, StudentExamScore, StudentProgress, SchoolTypeSubject,
    school_type_subject_subjects,
)
from app.models.lookups import Subject
from app.schemas.students import (
    StudentCreate, StudentUpdate, StudentOut,
    StudentExamCreate, StudentExamUpdate, StudentExamOut,
    StudentProgressCreate, StudentProgressUpdate, StudentProgressOut,
    SchoolTypeSubjectCreate, SchoolTypeSubjectUpdate, SchoolTypeSubjectOut,
    ExamScoreCreate,
)
import os, uuid, shutil
from app.config import settings

router = APIRouter()


# ── helpers ──────────────────────────────────────────────────────────────────
def _media(sub: str) -> str:
    path = os.path.join(settings.MEDIA_DIR, sub)
    os.makedirs(path, exist_ok=True)
    return path


# ════════════════════════════════════════════════════════════════════════════
# STUDENTS
# ════════════════════════════════════════════════════════════════════════════

@router.get("/students", response_model=list[StudentOut], tags=["Students"])
async def list_students(
    kutir_id: Optional[int] = Query(None),
    gender: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(Student)
    if kutir_id:
        q = q.where(Student.kutir_id == kutir_id)
    if gender:
        q = q.where(Student.gender == gender)
    if search:
        term = f"%{search}%"
        q = q.where(
            (Student.first_name.ilike(term)) |
            (Student.last_name.ilike(term)) |
            (Student.phone.ilike(term)) |
            (Student.father_name.ilike(term))
        )
    q = q.order_by(Student.last_name, Student.first_name)
    if limit:
        q = q.limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/students", response_model=StudentOut, status_code=201, tags=["Students"])
async def create_student(
    data: StudentCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    student = Student(**data.model_dump())
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


@router.get("/students/{id}", response_model=StudentOut, tags=["Students"])
async def get_student(id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(Student, id)
    if not obj:
        raise HTTPException(404, "Student not found")
    return obj


@router.patch("/students/{id}", response_model=StudentOut, tags=["Students"])
async def update_student(
    id: int, data: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(Student, id)
    if not obj:
        raise HTTPException(404, "Student not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/students/{id}", status_code=204, tags=["Students"])
async def delete_student(id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(Student, id)
    if not obj:
        raise HTTPException(404, "Student not found")
    await db.delete(obj)
    await db.commit()


@router.post("/students/{id}/photo", response_model=StudentOut, tags=["Students"])
async def upload_student_photo(
    id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(Student, id)
    if not obj:
        raise HTTPException(404, "Student not found")
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    dest = os.path.join(_media("student_photos"), filename)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    obj.photo = f"student_photos/{filename}"
    await db.commit()
    await db.refresh(obj)
    return obj


# ════════════════════════════════════════════════════════════════════════════
# STUDENT EXAMS
# ════════════════════════════════════════════════════════════════════════════

@router.get("/student-exams", response_model=list[StudentExamOut], tags=["Student Exams"])
async def list_exams(
    student_id: Optional[int] = Query(None),
    school_id: Optional[int] = Query(None),
    school_start_year: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(StudentExam)
    if student_id:
        q = q.where(StudentExam.student_id == student_id)
    if school_id:
        q = q.where(StudentExam.school_id == school_id)
    if school_start_year:
        q = q.where(StudentExam.school_start_year == school_start_year)
    result = await db.execute(q.order_by(StudentExam.school_start_year.desc()))
    return result.scalars().all()


@router.post("/student-exams", response_model=StudentExamOut, status_code=201, tags=["Student Exams"])
async def create_exam(
    data: StudentExamCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    scores = data.scores
    exam_data = data.model_dump(exclude={"scores"})
    exam = StudentExam(**exam_data)
    db.add(exam)
    try:
        await db.flush()  # get exam.id
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "An admission record for this student, school, and year already exists.")

    for s in scores:
        db.add(StudentExamScore(exam_id=exam.id, subject_id=s.subject_id, score=s.score))

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "An admission record for this student, school, and year already exists.")
    await db.refresh(exam)
    return exam


@router.get("/student-exams/{id}", response_model=StudentExamOut, tags=["Student Exams"])
async def get_exam(id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(StudentExam, id)
    if not obj:
        raise HTTPException(404, "StudentExam not found")
    return obj


@router.patch("/student-exams/{id}", response_model=StudentExamOut, tags=["Student Exams"])
async def update_exam(
    id: int, data: StudentExamUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(StudentExam, id)
    if not obj:
        raise HTTPException(404, "StudentExam not found")
    update = data.model_dump(exclude_unset=True)
    scores = update.pop("scores", None)
    for k, v in update.items():
        setattr(obj, k, v)
    if scores is not None:
        # replace scores
        await db.execute(
            delete(StudentExamScore).where(StudentExamScore.exam_id == id)
        )
        for s in scores:
            db.add(StudentExamScore(exam_id=id, subject_id=s["subject_id"], score=s.get("score")))
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/student-exams/{id}", status_code=204, tags=["Student Exams"])
async def delete_exam(id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(StudentExam, id)
    if not obj:
        raise HTTPException(404, "StudentExam not found")
    await db.delete(obj)
    await db.commit()


# ════════════════════════════════════════════════════════════════════════════
# STUDENT PROGRESS
# ════════════════════════════════════════════════════════════════════════════

@router.get("/student-progress", response_model=list[StudentProgressOut], tags=["Student Progress"])
async def list_progress(
    student_id: Optional[int] = Query(None),
    school_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    q = select(StudentProgress)
    if student_id:
        q = q.where(StudentProgress.student_id == student_id)
    if school_id:
        q = q.where(StudentProgress.school_id == school_id)
    result = await db.execute(q.order_by(StudentProgress.academic_year.desc()))
    return result.scalars().all()


@router.post("/student-progress", response_model=StudentProgressOut, status_code=201, tags=["Student Progress"])
async def create_progress(
    data: StudentProgressCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = StudentProgress(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/student-progress/{id}", response_model=StudentProgressOut, tags=["Student Progress"])
async def get_progress(id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(StudentProgress, id)
    if not obj:
        raise HTTPException(404, "StudentProgress not found")
    return obj


@router.patch("/student-progress/{id}", response_model=StudentProgressOut, tags=["Student Progress"])
async def update_progress(
    id: int, data: StudentProgressUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    obj = await db.get(StudentProgress, id)
    if not obj:
        raise HTTPException(404, "StudentProgress not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/student-progress/{id}", status_code=204, tags=["Student Progress"])
async def delete_progress(id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(StudentProgress, id)
    if not obj:
        raise HTTPException(404, "StudentProgress not found")
    await db.delete(obj)
    await db.commit()


# ════════════════════════════════════════════════════════════════════════════
# SCHOOL TYPE SUBJECTS
# ════════════════════════════════════════════════════════════════════════════

@router.get("/school-type-subjects", response_model=list[SchoolTypeSubjectOut], tags=["School Type Subjects"])
async def list_school_type_subjects(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(select(SchoolTypeSubject).order_by(SchoolTypeSubject.school_type))
    return result.scalars().all()


@router.post("/school-type-subjects", response_model=SchoolTypeSubjectOut, status_code=201, tags=["School Type Subjects"])
async def create_school_type_subject(
    data: SchoolTypeSubjectCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    obj = SchoolTypeSubject(school_type=data.school_type)
    db.add(obj)
    await db.flush()  # persist & get ID
    # Capture scalar values before commit (commit expires the object)
    new_id = obj.id
    new_school_type = obj.school_type
    if data.subject_ids:
        await db.execute(
            school_type_subject_subjects.insert(),
            [{"school_type_subject_id": new_id, "subject_id": sid} for sid in data.subject_ids],
        )
    await db.commit()
    # Build response manually — avoid any ORM relationship access (Mapped[list] bug)
    subj_rows = []
    if data.subject_ids:
        res = await db.execute(select(Subject).where(Subject.id.in_(data.subject_ids)))
        subj_rows = [{"id": s.id, "name": s.name} for s in res.scalars().all()]
    return SchoolTypeSubjectOut(id=new_id, school_type=new_school_type, subjects=subj_rows)


@router.get("/school-type-subjects/{id}", response_model=SchoolTypeSubjectOut, tags=["School Type Subjects"])
async def get_school_type_subject(id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(SchoolTypeSubject, id)
    if not obj:
        raise HTTPException(404, "SchoolTypeSubject not found")
    return obj


@router.patch("/school-type-subjects/{id}", response_model=SchoolTypeSubjectOut, tags=["School Type Subjects"])
async def update_school_type_subject(
    id: int, data: SchoolTypeSubjectUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    obj = await db.get(SchoolTypeSubject, id)
    if not obj:
        raise HTTPException(404, "SchoolTypeSubject not found")
    # Capture scalar values before commit
    obj_id = obj.id
    obj_school_type = obj.school_type
    final_subject_ids = data.subject_ids if data.subject_ids is not None else []
    # Replace all subject associations via junction table directly
    await db.execute(
        school_type_subject_subjects.delete().where(
            school_type_subject_subjects.c.school_type_subject_id == obj_id
        )
    )
    if final_subject_ids:
        await db.execute(
            school_type_subject_subjects.insert(),
            [{"school_type_subject_id": obj_id, "subject_id": sid} for sid in final_subject_ids],
        )
    await db.commit()
    # Build response manually — avoid any ORM relationship access (Mapped[list] bug)
    subj_rows = []
    if final_subject_ids:
        res = await db.execute(select(Subject).where(Subject.id.in_(final_subject_ids)))
        subj_rows = [{"id": s.id, "name": s.name} for s in res.scalars().all()]
    return SchoolTypeSubjectOut(id=obj_id, school_type=obj_school_type, subjects=subj_rows)


@router.delete("/school-type-subjects/{id}", status_code=204, tags=["School Type Subjects"])
async def delete_school_type_subject(id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    obj = await db.get(SchoolTypeSubject, id)
    if not obj:
        raise HTTPException(404, "SchoolTypeSubject not found")
    await db.delete(obj)
    await db.commit()
