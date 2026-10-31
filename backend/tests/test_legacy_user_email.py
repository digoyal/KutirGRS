import asyncio
from unittest.mock import AsyncMock, Mock

import pytest
from pydantic import ValidationError

from app.models import donors, kutirs, lookups, schools, students, visits  # noqa: F401 — load ORM relationship targets as startup does
from app.models.users import User
from app.routers.users import _attach_geo_batch
from app.schemas.users import UserCreate, UserOut, UserUpdate


def test_legacy_user_can_be_read_and_listed_without_email():
    user = User(id=1, username="legacy", email=None, is_active=True, is_superuser=False)
    assert UserOut.model_validate(user).email is None
    db = Mock()
    db.execute = AsyncMock(return_value=Mock(all=lambda: []))
    rows = asyncio.run(_attach_geo_batch(db, [user]))
    assert rows[0]["id"] == 1 and rows[0]["email"] is None
    assert rows[0]["zone_ids"] == []


@pytest.mark.parametrize("schema", [UserCreate, UserUpdate])
@pytest.mark.parametrize("email", [None, "", "   ", "\t\n"])
def test_new_and_edited_users_still_require_email(schema, email):
    with pytest.raises(ValidationError):
        schema.model_validate({"username": "test", "password": "unused", "email": email})


@pytest.mark.parametrize("schema", [UserCreate, UserUpdate])
def test_real_email_can_be_added_to_legacy_user(schema):
    user = schema.model_validate({"username": "test", "password": "unused", "email": " user@example.invalid "})
    assert user.email == "user@example.invalid"
