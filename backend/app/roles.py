"""Role titles and Functionality-matrix permission sets.

Source of truth: docs/role-and-access.md (Functionality sheet).
Keep in sync with frontend/src/constants/roles.ts.
"""

from __future__ import annotations

from collections.abc import Collection

# Day-to-day roles (lowest → highest). SysAdmin is separate (Deploy only).
OPERATIONAL_TITLES: list[str] = [
    "Teacher",
    "Cluster Coordinator",
    "Education Coordinator",
    "District Anchor",
    "Regional Head",
    "Admin",
]

SYSADMIN = "SysAdmin"

# Full assignable title list (Admin may create SysAdmin)
TITLES: list[str] = [*OPERATIONAL_TITLES, SYSADMIN]


def _from(min_title: str) -> frozenset[str]:
    i = OPERATIONAL_TITLES.index(min_title)
    return frozenset(OPERATIONAL_TITLES[i:])


ALL_ROLES: frozenset[str] = frozenset(OPERATIONAL_TITLES)
ADMIN_ONLY: frozenset[str] = frozenset({"Admin"})
SYSADMIN_ONLY: frozenset[str] = frozenset({SYSADMIN})
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
MANAGE_DEPLOY: frozenset[str] = SYSADMIN_ONLY

# ── View restrictions (menu / list API) ───────────────────────────────────────
VIEW_USERS: frozenset[str] = CC_PLUS
VIEW_COLUMN_CONFIG: frozenset[str] = ADMIN_ONLY
VIEW_LOOKUPS: frozenset[str] = ALL_ROLES
VIEW_DEPLOY: frozenset[str] = SYSADMIN_ONLY


def title_index(title: str | None) -> int:
    if title and title in TITLES:
        return TITLES.index(title)
    return -1


def role_allowed(title: str | None, allowed: Collection[str], *, is_superuser: bool = False) -> bool:
    """True if title is in allowed, or caller is Admin / superuser.

    Exception: SysAdmin-only sets (e.g. Deploy) never grant via Admin bypass.
    """
    if allowed and set(allowed) <= SYSADMIN_ONLY:
        return bool(title) and title in allowed
    if is_superuser or title == "Admin":
        return True
    return bool(title) and title in allowed
