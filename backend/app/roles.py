"""Role titles and Functionality-matrix permission sets.

Source of truth: docs/role-and-access.md (Functionality sheet).
Keep in sync with frontend/src/constants/roles.ts.
"""

from __future__ import annotations

from collections.abc import Collection

# Lowest → highest
TITLES: list[str] = [
    "Teacher",
    "Cluster Coordinator",
    "Education Coordinator",
    "District Anchor",
    "Regional Head",
    "Admin",
]


def _from(min_title: str) -> frozenset[str]:
    i = TITLES.index(min_title)
    return frozenset(TITLES[i:])


ALL_ROLES: frozenset[str] = frozenset(TITLES)
ADMIN_ONLY: frozenset[str] = frozenset({"Admin"})
CC_PLUS: frozenset[str] = _from("Cluster Coordinator")
EC_PLUS: frozenset[str] = _from("Education Coordinator")

# ── Mutate (Add/Edit/Delete) ──────────────────────────────────────────────────
MANAGE_STUDENTS: frozenset[str] = ALL_ROLES
MANAGE_PROGRESS: frozenset[str] = ALL_ROLES
MANAGE_ADMISSIONS: frozenset[str] = ALL_ROLES
MANAGE_KUTIRS: frozenset[str] = CC_PLUS
MANAGE_VISITS: frozenset[str] = CC_PLUS
MANAGE_SCHOOLS: frozenset[str] = CC_PLUS
MANAGE_EXAM_CENTERS: frozenset[str] = CC_PLUS
MANAGE_GEOGRAPHY: frozenset[str] = EC_PLUS
MANAGE_LOOKUPS: frozenset[str] = ADMIN_ONLY
MANAGE_USERS: frozenset[str] = CC_PLUS
MANAGE_COLUMN_CONFIG: frozenset[str] = ADMIN_ONLY

# ── View restrictions (menu / list API) ───────────────────────────────────────
# Most menus: all roles may View. Exceptions from the matrix:
VIEW_USERS: frozenset[str] = CC_PLUS
VIEW_COLUMN_CONFIG: frozenset[str] = ADMIN_ONLY
VIEW_LOOKUPS: frozenset[str] = ALL_ROLES


def title_index(title: str | None) -> int:
    if title and title in TITLES:
        return TITLES.index(title)
    return -1


def role_allowed(title: str | None, allowed: Collection[str], *, is_superuser: bool = False) -> bool:
    """True if title is in allowed, or caller is Admin / superuser."""
    if is_superuser or title == "Admin":
        return True
    return bool(title) and title in allowed
