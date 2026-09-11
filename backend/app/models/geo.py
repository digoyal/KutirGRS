"""
Geographic hierarchy: Zone → District → Area → Cluster

Also includes ExamCenter (belongs to a District).
"""
from typing import Optional
from sqlalchemy import String, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin

STATE_CHOICES = ["Madhya Pradesh", "Jharkhand", "Chhattisgarh"]


class Zone(Base, TimestampMixin):
    __tablename__ = "zones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)

    zonal_head_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    districts: Mapped[list["District"]] = relationship(
        "District", back_populates="zone", cascade="all, delete-orphan"
    )
    zonal_head: Mapped[Optional["User"]] = relationship("User", foreign_keys=[zonal_head_id])  # type: ignore[name-defined]

    def __repr__(self):
        return f"<Zone {self.name}>"


class District(Base, TimestampMixin):
    __tablename__ = "districts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    zone_id: Mapped[int] = mapped_column(ForeignKey("zones.id"), nullable=False)

    district_anchor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    zone: Mapped["Zone"] = relationship("Zone", back_populates="districts")
    district_anchor: Mapped[Optional["User"]] = relationship("User", foreign_keys=[district_anchor_id])  # type: ignore[name-defined]
    areas: Mapped[list["Area"]] = relationship(
        "Area", back_populates="district", cascade="all, delete-orphan"
    )
    exam_centers: Mapped[list["ExamCenter"]] = relationship(
        "ExamCenter", back_populates="district", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<District {self.name}>"


class Area(Base, TimestampMixin):
    __tablename__ = "areas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    district_id: Mapped[int] = mapped_column(ForeignKey("districts.id"), nullable=False)

    education_coordinator_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    district: Mapped["District"] = relationship("District", back_populates="areas")
    education_coordinator: Mapped[Optional["User"]] = relationship("User", foreign_keys=[education_coordinator_id])  # type: ignore[name-defined]
    clusters: Mapped[list["Cluster"]] = relationship(
        "Cluster", back_populates="area", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Area {self.name}>"


class Cluster(Base, TimestampMixin):
    __tablename__ = "clusters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    area_id: Mapped[int] = mapped_column(ForeignKey("areas.id"), nullable=False)

    cluster_coordinator_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    area: Mapped["Area"] = relationship("Area", back_populates="clusters")
    cluster_coordinator: Mapped[Optional["User"]] = relationship("User", foreign_keys=[cluster_coordinator_id])  # type: ignore[name-defined]

    def __repr__(self):
        return f"<Cluster {self.name}>"


class ExamCenter(Base, TimestampMixin):
    __tablename__ = "exam_centers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    district_id: Mapped[Optional[int]] = mapped_column(ForeignKey("districts.id"), nullable=True)
    street: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="Madhya Pradesh")
    pincode: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    district: Mapped[Optional["District"]] = relationship("District", back_populates="exam_centers")

    def __repr__(self):
        return f"<ExamCenter {self.name}>"
