"""
Lookup / reference tables — all small, rarely change.

  Category        – student category (e.g. OBC, SC)
  SubCategory     – sub-division of Category
  ExamCategory    – type of exam
  NoExamReason    – why a student didn't sit an exam
  NoAdmitReason   – why a selected student wasn't admitted
  Subject         – academic subject
  ExamCenter      – venue where exams are held
"""
from typing import Optional
from sqlalchemy import String, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    sub_categories: Mapped[list["SubCategory"]] = relationship(
        "SubCategory", back_populates="category", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Category {self.name}>"


class SubCategory(Base, TimestampMixin):
    __tablename__ = "sub_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False)

    category: Mapped["Category"] = relationship("Category", back_populates="sub_categories")

    def __repr__(self):
        return f"<SubCategory {self.name}>"


class ExamCategory(Base, TimestampMixin):
    __tablename__ = "exam_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    def __repr__(self):
        return f"<ExamCategory {self.name}>"


class NoExamReason(Base, TimestampMixin):
    __tablename__ = "no_exam_reasons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    reason: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)

    def __repr__(self):
        return f"<NoExamReason {self.reason}>"


class NoAdmitReason(Base, TimestampMixin):
    __tablename__ = "no_admit_reasons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    reason: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)

    def __repr__(self):
        return f"<NoAdmitReason {self.reason}>"


class Subject(Base, TimestampMixin):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    def __repr__(self):
        return f"<Subject {self.name}>"


# ── ExamType / SchoolType ─────────────────────────────────────────────────────

from sqlalchemy import Table, Column

exam_type_school_types = Table(
    "exam_type_school_types", Base.metadata,
    Column("exam_type_id",   Integer, ForeignKey("exam_types.id",   ondelete="CASCADE"), primary_key=True),
    Column("school_type_id", Integer, ForeignKey("school_types.id", ondelete="CASCADE"), primary_key=True),
)


class ExamType(Base, TimestampMixin):
    __tablename__ = "exam_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)

    school_types: Mapped[list["SchoolType"]] = relationship(
        "SchoolType", secondary=exam_type_school_types, back_populates="exam_types"
    )

    def __repr__(self):
        return f"<ExamType {self.name}>"


class SchoolType(Base, TimestampMixin):
    __tablename__ = "school_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)

    exam_types: Mapped[list["ExamType"]] = relationship(
        "ExamType", secondary=exam_type_school_types, back_populates="school_types"
    )

    def __repr__(self):
        return f"<SchoolType {self.name}>"
