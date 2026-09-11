from datetime import date as date_type
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean, Column, Date, ForeignKey, Integer, Numeric,
    SmallInteger, String, Table, Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin

# ── M2M: SchoolTypeSubject ↔ Subject ────────────────────────────────────────
school_type_subject_subjects = Table(
    "school_type_subject_subjects", Base.metadata,
    Column("school_type_subject_id", Integer,
           ForeignKey("school_type_subjects.id", ondelete="CASCADE"), primary_key=True),
    Column("subject_id", Integer,
           ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True),
)


class SchoolTypeSubject(Base):
    """Maps a school type to the subjects used in its entrance exam."""
    __tablename__ = "school_type_subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    school_type: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)

    subjects: Mapped[list] = relationship(
        "Subject", secondary=school_type_subject_subjects, lazy="selectin"
    )


# ── Student ──────────────────────────────────────────────────────────────────
class Student(Base, TimestampMixin):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kutir_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("kutirs.id", ondelete="SET NULL"), nullable=True
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    photo: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    gender: Mapped[str] = mapped_column(String(10), nullable=False)   # Boy / Girl
    dob: Mapped[Optional[date_type]] = mapped_column(Date, nullable=True)
    street: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    pincode: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(254), nullable=True)
    father_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    mother_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    category_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    sub_category_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("sub_categories.id", ondelete="SET NULL"), nullable=True
    )
    alt_contact_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    alt_contact_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Document flags
    aadhaar: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    category_cert: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    birth_cert: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    residence_proof: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    medical: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    kutir: Mapped[Optional[object]] = relationship("Kutir", lazy="selectin")
    category: Mapped[Optional[object]] = relationship(
        "Category", foreign_keys=[category_id], lazy="selectin"
    )
    sub_category: Mapped[Optional[object]] = relationship(
        "SubCategory", foreign_keys=[sub_category_id], lazy="selectin"
    )
    exams: Mapped[list] = relationship(
        "StudentExam", back_populates="student", cascade="all, delete-orphan"
    )
    progress_records: Mapped[list] = relationship(
        "StudentProgress", back_populates="student", cascade="all, delete-orphan"
    )


# ── StudentExam ──────────────────────────────────────────────────────────────
class StudentExam(Base, TimestampMixin):
    __tablename__ = "student_exams"
    __table_args__ = (
        UniqueConstraint("student_id", "school_id", "school_start_year",
                         name="uq_student_school_year"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    school_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False
    )
    school_start_year: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    # Admission pipeline flags
    eligible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    form_received: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    applied: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    appeared: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    selected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    admitted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    admitted_school_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("schools.id", ondelete="SET NULL"), nullable=True
    )
    no_admit_reason_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("no_admit_reasons.id", ondelete="SET NULL"), nullable=True
    )
    exam_category_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("exam_categories.id", ondelete="SET NULL"), nullable=True
    )
    application_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    exam_center_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("exam_centers.id", ondelete="SET NULL"), nullable=True
    )
    roll_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    no_exam_reason_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("no_exam_reasons.id", ondelete="SET NULL"), nullable=True
    )

    # Legacy per-subject score columns (kept for data compatibility)
    math: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    english: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    reasoning: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    evs: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)

    # Relationships
    student: Mapped[object] = relationship("Student", back_populates="exams")
    school: Mapped[object] = relationship(
        "GovtResidentialSchool", foreign_keys=[school_id], lazy="selectin"
    )
    admitted_school: Mapped[Optional[object]] = relationship(
        "GovtResidentialSchool", foreign_keys=[admitted_school_id], lazy="selectin"
    )
    scores: Mapped[list] = relationship(
        "StudentExamScore", back_populates="exam",
        cascade="all, delete-orphan", lazy="selectin"
    )


# ── StudentExamScore ─────────────────────────────────────────────────────────
class StudentExamScore(Base):
    __tablename__ = "student_exam_scores"
    __table_args__ = (
        UniqueConstraint("exam_id", "subject_id", name="uq_exam_subject"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    exam_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("student_exams.id", ondelete="CASCADE"), nullable=False
    )
    subject_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False
    )
    score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)

    exam: Mapped[object] = relationship("StudentExam", back_populates="scores")
    subject: Mapped[object] = relationship("Subject", lazy="selectin")


# ── StudentProgress ──────────────────────────────────────────────────────────
class StudentProgress(Base, TimestampMixin):
    __tablename__ = "student_progress"
    __table_args__ = (
        UniqueConstraint("student_id", "school_id", "academic_year",
                         name="uq_student_school_academic_year"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    school_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False
    )
    academic_year: Mapped[int] = mapped_column(Integer, nullable=False)
    grade: Mapped[int] = mapped_column(Integer, nullable=False)   # 6–12
    is_enrolled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    exit_reason: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    previous_year_percentage: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    student: Mapped[object] = relationship("Student", back_populates="progress_records")
    school: Mapped[object] = relationship("GovtResidentialSchool", lazy="selectin")
