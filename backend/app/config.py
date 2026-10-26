import json
from typing import Annotated, Any, List, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


def _parse_origins(value: Any) -> List[str]:
    """Accept JSON lists, comma-separated, or unquoted [a,b] shell exports."""
    if value is None:
        return []
    if isinstance(value, list):
        return [str(x).strip().strip("'\"") for x in value if str(x).strip()]
    s = str(value).strip()
    if not s:
        return []
    if s.startswith("["):
        try:
            parsed = json.loads(s)
            if isinstance(parsed, list):
                return [str(x).strip().strip("'\"") for x in parsed if str(x).strip()]
        except json.JSONDecodeError:
            inner = s.strip("[] \t")
            return [p.strip().strip("'\"") for p in inner.split(",") if p.strip()]
    return [p.strip().strip("'\"") for p in s.split(",") if p.strip()]


class Settings(BaseSettings):
    # ignore extra keys in .env (legacy); ADMIN_* below are first-class for local bootstrap
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/kutirgrs_v2"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    APP_ENV: str = "development"
    # NoDecode: parent shells often export broken unquoted lists that crash json.loads.
    ALLOWED_ORIGINS: Annotated[List[str], NoDecode] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    MEDIA_DIR: str = "media"

    # Local bootstrap only — create missing admin; never overwrite an existing hash on start.
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: Optional[str] = None
    ADMIN_EMAIL: str = "admin@kutirgrs.local"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def _coerce_origins(cls, v: Any) -> List[str]:
        if isinstance(v, list):
            return v
        return _parse_origins(v)

    @property
    def is_dev(self) -> bool:
        return self.APP_ENV == "development"


settings = Settings()
