from sqlalchemy import String, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class AppSetting(Base):
    """Generic key/value store for app-wide configuration (e.g. field visibility config)."""
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(200), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
