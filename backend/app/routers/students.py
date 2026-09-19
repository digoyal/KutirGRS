"""
Students, StudentExams, StudentExamScores, StudentProgress
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, File
from sqlalchemy import select, delete, func
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user, require_admin, get_scope
from app.models.students import (
    Student, StudentExam, StudentExamScore, StudentProgress,
)
from app.models.kutirs import Kutir
from app.models.geo import Cluster, Area
from app.models.lookups import Subject
from app.schemas.students import (
    StudentCreate, StudentUpdate, StudentOut,
    StudentExamCreate, StudentExamUpdate, StudentExamOut,
    StudentProgressCreate, StudentProgressUpdate, StudentProgressOut,
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
    response: Response,
    kutir_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    cluster_id: Optional[int] = Query(None),
    gender: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    name_only: Optional[bool] = Query(False),
    limit: Optional[int] = Query(25),
    offset: Optional[int] = Query(0),
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    # ── Build base WHERE (shared by count + data queries) ──
    def _apply_filters(q):
        needs_geo = district_id is not None or cluster_id is not None
        if needs_geo:
            q = (q
                 .join(Kutir, Student.kutir_id == Kutir.id)
                 .join(Cluster, Kutir.cluster_id == Cluster.id)
                 .join(Area, Cluster.area_id == Area.id))
        if scope is not None:
            q = q.where(Student.kutir_id.in_(scope))
        if kutir_id:
            q = q.where(Student.kutir_id == kutir_id)
        if cluster_id:
            q = q.where(Kutir.cluster_id == cluster_id)
        elif district_id:
            q = q.where(Area.district_id == district_id)
        if gender:
            q = q.where(Student.gender == gender)
        if search:
            term = f"%{search}%"
            if name_only:
                q = q.where(
                    (Student.first_name.ilike(term)) |
                    (Student.last_name.ilike(term))
                )
            else:
                q = q.where(
                    (Student.first_name.ilike(term)) |
                    (Student.last_name.ilike(term)) |
                    (Student.phone.ilike(term)) |
                    (Student.father_name.ilike(term))
                )
        return q

    # ── Total count (always) ──
    count_q = _apply_filters(select(func.count()).select_from(Student))
    total = (await db.execute(count_q)).scalar_one()
    response.headers["X-Total-Count"] = str(total)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"

    # ── Data ──
    data_q = _apply_filters(select(Student)).order_by(Student.last_name, Student.first_name)
    if not name_only:
        data_q = data_q.limit(limit).offset(offset)
    result = await db.execute(data_q)
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
async def get_student(
    id: int,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    obj = await db.get(Student, id)
    if not obj:
        raise HTTPException(404, "Student not found")
    if scope is not None and obj.kutir_id not in scope:
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
async def delete_student(id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
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
    response: Response,
    student_id: Optional[int] = Query(None),
    school_id: Optional[int] = Query(None),
    school_start_year: Optional[int] = Query(None),
    kutir_id: Optional[int] = Query(None),
    cluster_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    admitted: Optional[bool] = Query(None),
    limit: Optional[int] = Query(25),
    offset: Optional[int] = Query(0),
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    def _apply_filters(q):
        needs_student = (
            scope is not None or kutir_id is not None or
            cluster_id is not None or district_id is not None
        )
        if needs_student:
            q = q.join(Student, StudentExam.student_id == Student.id)
        if scope is not None:
            q = q.where(Student.kutir_id.in_(scope))
        if kutir_id:
            q = q.where(Student.kutir_id == kutir_id)
        if cluster_id is not None or district_id is not None:
            q = (q.join(Kutir, Student.kutir_id == Kutir.id)
                  .join(Cluster, Kutir.cluster_id == Cluster.id)
                  .join(Area, Cluster.area_id == Area.id))
            if cluster_id:
                q = q.where(Kutir.cluster_id == cluster_id)
            elif district_id:
                q = q.where(Area.district_id == district_id)
        if student_id:
            q = q.where(StudentExam.student_id == student_id)
        if school_id:
            q = q.where(StudentExam.school_id == school_id)
        if school_start_year:
            q = q.where(StudentExam.school_start_year == school_start_year)
        if admitted is not None:
            q = q.where(StudentExam.admitted == admitted)
        return q

    count_q = _apply_filters(select(func.count()).select_from(StudentExam))
    total = (await db.execute(count_q)).scalar_one()
    response.headers["X-Total-Count"] = str(total)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"

    data_q = _apply_filters(
        select(StudentExam).options(selectinload(StudentExam.scores))
    ).order_by(StudentExam.school_start_year.desc())
    if student_id is None and admitted is not True:
        data_q = data_q.limit(limit).offset(offset)
    result = await db.execute(data_q)
    return result.scalars().all()


@router.post("/student-exams", response_model=StudentExamOut, status_code=201, tags=["Student Exams"])
async def create_exam(
    data: StudentExamCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    scores = data.scores
    exam_data = data.model_dump(exclude={"scores"})
    # Prevent double-admission: student can only be admitted to one school
    if exam_data.get("admitted"):
        existing_admitted = await db.execute(
            select(StudentExam).where(
                StudentExam.student_id == exam_data["student_id"],
                StudentExam.admitted == True,
            )
        )
        if existing_admitted.scalars().first():
            raise HTTPException(409, "This student is already admitted to another school.")

    exam = StudentExam(**exam_data)
    db.add(exam)
    try:
        await db.flush()  # get exam.id
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "An admission record for this student, school type, and year already exists.")

    for s in scores:
        db.add(StudentExamScore(exam_id=exam.id, subject_id=s.subject_id, score=s.score))

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "An admission record for this student, school type, and year already exists.")
    await db.refresh(exam)
    return exam


@router.get("/student-exams/{id}", response_model=StudentExamOut, tags=["Student Exams"])
async def get_exam(
    id: int,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    obj = await db.get(StudentExam, id)
    if not obj:
        raise HTTPException(404, "StudentExam not found")
    if scope is not None:
        student = await db.get(Student, obj.student_id)
        if not student or student.kutir_id not in scope:
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

    # Prevent double-admission: if setting admitted=True, ensure no other record is admitted
    if update.get("admitted") is True:
        existing_admitted = await db.execute(
            select(StudentExam).where(
                StudentExam.student_id == obj.student_id,
                StudentExam.admitted == True,
                StudentExam.id != id,
            )
        )
        if existing_admitted.scalars().first():
            raise HTTPException(409, "This student is already admitted to another school. A student can only be admitted to one school.")

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
async def delete_exam(id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
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
    response: Response,
    student_id: Optional[int] = Query(None),
    school_id: Optional[int] = Query(None),
    academic_year: Optional[int] = Query(None),
    kutir_id: Optional[int] = Query(None),
    cluster_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    admitted: Optional[bool] = Query(None),
    limit: Optional[int] = Query(25),
    offset: Optional[int] = Query(0),
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    def _apply_filters(q):
        needs_student = (
            scope is not None or kutir_id is not None or
            cluster_id is not None or district_id is not None
        )
        if needs_student:
            q = q.join(Student, StudentProgress.student_id == Student.id)
        if scope is not None:
            q = q.where(Student.kutir_id.in_(scope))
        if kutir_id:
            q = q.where(Student.kutir_id == kutir_id)
        if cluster_id is not None or district_id is not None:
            q = (q.join(Kutir, Student.kutir_id == Kutir.id)
                  .join(Cluster, Kutir.cluster_id == Cluster.id)
                  .join(Area, Cluster.area_id == Area.id))
            if cluster_id:
                q = q.where(Kutir.cluster_id == cluster_id)
            elif district_id:
                q = q.where(Area.district_id == district_id)
        if student_id:
            q = q.where(StudentProgress.student_id == student_id)
        if school_id:
            q = q.where(StudentProgress.school_id == school_id)
        if academic_year:
            q = q.where(StudentProgress.academic_year == academic_year)
        return q

    count_q = _apply_filters(select(func.count()).select_from(StudentProgress))
    total = (await db.execute(count_q)).scalar_one()
    response.headers["X-Total-Count"] = str(total)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"

    data_q = _apply_filters(select(StudentProgress)).order_by(StudentProgress.academic_year.desc())
    if student_id is None:
        data_q = data_q.limit(limit).offset(offset)
    result = await db.execute(data_q)
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
async def get_progress(
    id: int,
    db: AsyncSession = Depends(get_db),
    scope: Optional[set[int]] = Depends(get_scope),
):
    obj = await db.get(StudentProgress, id)
    if not obj:
        raise HTTPException(404, "StudentProgress not found")
    if scope is not None:
        student = await db.get(Student, obj.student_id)
        if not student or student.kutir_id not in scope:
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
async def delete_progress(id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await db.get(StudentProgress, id)
    if not obj:
        raise HTTPException(404, "StudentProgress not found")
    await db.delete(obj)
    await db.commit()


