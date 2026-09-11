from typing import Optional
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin

SCHOOL_TYPE_CHOICES = [
    "EMRS", "JNV", "KSP", "MRS", "GNV", "KGBV",
    "SportsBoys", "SportsGirls", "Other",
]
STATE_CHOICES = ["Madhya Pradesh", "Jharkhand", "Chhattisgarh"]


class GovtResidentialSchool(Base, TimestampMixin):
    __tablename__ = "schools"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    school_type: Mapped[str] = mapped_column(String(20), nullable=False)
    street: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    district_id: Mapped[Optional[int]] = mapped_column(ForeignKey("districts.id"), nullable=True)
    state: Mapped[str] = mapped_column(String(50), nullable=False, default="Madhya Pradesh")
    pincode: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    district: Mapped[Optional["District"]] = relationship("District", foreign_keys=[district_id])  # type: ignore[name-defined]

    def __repr__(self):
        return f"<GovtResidentialSchool {self.name} ({self.school_type})>"
