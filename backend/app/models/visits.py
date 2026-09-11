from datetime import date as date_type
from typing import Optional

from sqlalchemy import (
    Boolean, Date, ForeignKey, Integer, SmallInteger,
    String, Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class KutirVisit(Base, TimestampMixin):
    __tablename__ = "kutir_visits"
    __table_args__ = (
        UniqueConstraint("kutir_id", "visit_date", name="uq_visit_per_kutir_per_day"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kutir_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("kutirs.id", ondelete="CASCADE"), nullable=False
    )
    visited_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    visit_date: Mapped[date_type] = mapped_column(Date, nullable=False)

    # ── Attendance & implementation ──────────────────────────────────────────
    avg_attendance_last_week: Mapped[int] = mapped_column(Integer, nullable=False)
    follow_timetable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    follow_monthly_plan: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    timetable_plan_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Topics being taught ──────────────────────────────────────────────────
    math_topics_pre: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    math_topics_upper: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    english_topics_pre: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    english_topics_upper: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Time slot utilization ────────────────────────────────────────────────
    timeslot_utilization: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    timeslot_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── GRS preparation ──────────────────────────────────────────────────────
    grs_prep_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Registers & materials ────────────────────────────────────────────────
    # Matched / Not Matched
    physical_vs_registered: Mapped[str] = mapped_column(String(15), nullable=False)
    workbook_percentage: Mapped[int] = mapped_column(Integer, nullable=False)
    # Upto Date / Partial Upto Date / Not Uptodate
    workbook_completion: Mapped[str] = mapped_column(String(20), nullable=False)
    # Sufficient / Lacking / More than required
    book_availability: Mapped[str] = mapped_column(String(25), nullable=False)

    # ── Ratings 1–5 ──────────────────────────────────────────────────────────
    cleanliness: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    hindi_proficiency: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    english_proficiency: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    maths_proficiency: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    evs_proficiency: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    reasoning_proficiency: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    material_management: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    kutir_performance: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    # ── Registers & Documents Available ─────────────────────────────────────
    reg_admission_forms: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reg_attendance_students: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reg_daily_activity: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reg_observation: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reg_students_data: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reg_attendance_teachers: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reg_students_documents: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── Regular students ─────────────────────────────────────────────────────
    regular_students: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # ── Time slot activities ─────────────────────────────────────────────────
    timeslot_bal_sabha: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    timeslot_sports: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    timeslot_yoga: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    timeslot_value_ed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    timeslot_gk_map: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── Visit photo ──────────────────────────────────────────────────────────
    visit_photo: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)

    final_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Relationships ────────────────────────────────────────────────────────
    kutir: Mapped[object] = relationship("Kutir", lazy="selectin")
    visited_by: Mapped[Optional[object]] = relationship("User", lazy="selectin")
