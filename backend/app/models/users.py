"""
User model with role-based access and geo assignments.

Title (role) maps 1-to-1 with which geo M2M table is used:
  Admin                 → no geo restriction
  Zonal Head            → user_zones
  District Anchor       → user_districts
  Education Coordinator → user_areas
  Cluster Coordinator   → user_clusters
  Teacher               → user_kutirs
"""
from typing import Optional
from sqlalchemy import String, Boolean, Integer, Table, Column, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin

# ── Association tables (M2M) ──────────────────────────────────────────────────

user_zones = Table(
    "user_zones",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("zone_id", Integer, ForeignKey("zones.id", ondelete="CASCADE"), primary_key=True),
)

user_districts = Table(
    "user_districts",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("district_id", Integer, ForeignKey("districts.id", ondelete="CASCADE"), primary_key=True),
)

user_areas = Table(
    "user_areas",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("area_id", Integer, ForeignKey("areas.id", ondelete="CASCADE"), primary_key=True),
)

user_clusters = Table(
    "user_clusters",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("cluster_id", Integer, ForeignKey("clusters.id", ondelete="CASCADE"), primary_key=True),
)

user_kutirs = Table(
    "user_kutirs",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("kutir_id", Integer, ForeignKey("kutirs.id", ondelete="CASCADE"), primary_key=True),
)


# ── User model ────────────────────────────────────────────────────────────────

TITLE_CHOICES = [
    "Teacher",
    "Cluster Coordinator",
    "Education Coordinator",
    "District Anchor",
    "Zonal Head",
    "Admin",
]


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    email: Mapped[Optional[str]] = mapped_column(String(254), nullable=True, unique=True)
    first_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # role
    password: Mapped[str] = mapped_column(String(128), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Geo assignments
    assigned_zones: Mapped[list] = relationship(
        "Zone", secondary=user_zones, lazy="selectin"
    )
    assigned_districts: Mapped[list] = relationship(
        "District", secondary=user_districts, lazy="selectin"
    )
    assigned_areas: Mapped[list] = relationship(
        "Area", secondary=user_areas, lazy="selectin"
    )
    assigned_clusters: Mapped[list] = relationship(
        "Cluster", secondary=user_clusters, lazy="selectin"
    )
    assigned_kutirs: Mapped[list] = relationship(
        "Kutir", secondary=user_kutirs, lazy="selectin"
    )

    @property
    def full_name(self) -> str:
        parts = [self.first_name, self.last_name]
        return " ".join(p for p in parts if p) or self.username

    @property
    def is_admin(self) -> bool:
        return self.is_superuser or self.title == "Admin"

    def __repr__(self):
        return f"<User {self.username} ({self.title})>"
