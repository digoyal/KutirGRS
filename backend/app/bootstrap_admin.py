"""Create the local admin user once if missing. Never rehashes an existing user."""
from __future__ import annotations

import logging

from sqlalchemy import select

from app.auth import hash_password
from app.config import settings
from app.database import AsyncSessionLocal
from app.models.users import User

log = logging.getLogger("kutirgrs.bootstrap")


async def ensure_admin_user() -> None:
    """If ADMIN_PASSWORD is set and username is absent, create the admin once."""
    password = (settings.ADMIN_PASSWORD or "").strip()
    username = (settings.ADMIN_USERNAME or "admin").strip() or "admin"
    if not password:
        return

    async with AsyncSessionLocal() as session:
        existing = await session.execute(select(User).where(User.username == username))
        if existing.scalar_one_or_none() is not None:
            return

        user = User(
            username=username,
            email=settings.ADMIN_EMAIL,
            title="Admin",
            password=hash_password(password),
            is_active=True,
            is_superuser=True,
        )
        session.add(user)
        await session.commit()
        log.info("Created admin user %r (password from ADMIN_PASSWORD; not updated on later starts)", username)
