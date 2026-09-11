from typing import Optional
from sqlalchemy import String, Integer, SmallInteger, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin

KUTIR_TYPE_CHOICES = ["Seva Kutir", "Shiksha Kutir", "Non-Kutir"]
STATE_CHOICES = ["Madhya Pradesh", "Jharkhand", "Chhattisgarh"]


class Kutir(Base, TimestampMixin):
    __tablename__ = "kutirs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    kutir_type: Mapped[str] = mapped_column(String(20), nullable=False, default="Seva Kutir")

    # Geography
    cluster_id: Mapped[int] = mapped_column(ForeignKey("clusters.id"), nullable=False)
    # Denormalised district for quick filtering (mirrors Django model)
    district_id: Mapped[Optional[int]] = mapped_column(ForeignKey("districts.id"), nullable=True)

    # Address
    village: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    street: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    state: Mapped[str] = mapped_column(String(50), nullable=False, default="Madhya Pradesh")
    pincode: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    # Associations
    teacher_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    donor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("donors.id"), nullable=True)

    # Stats
    enrollment_5th: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    enrollment_8th: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)

    # Relationships
    cluster: Mapped["Cluster"] = relationship("Cluster", foreign_keys=[cluster_id])  # type: ignore[name-defined]
    district: Mapped[Optional["District"]] = relationship("District", foreign_keys=[district_id])  # type: ignore[name-defined]
    teacher: Mapped[Optional["User"]] = relationship("User", foreign_keys=[teacher_id])  # type: ignore[name-defined]
    donor: Mapped[Optional["Donor"]] = relationship("Donor", foreign_keys=[donor_id])  # type: ignore[name-defined]

    def __repr__(self):
        return f"<Kutir {self.name}>"
