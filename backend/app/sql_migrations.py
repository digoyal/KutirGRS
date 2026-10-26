"""Apply numbered SQL migrations under backend/scripts/ with a ledger table.

Schema changes ship as ``NNN_*.sql`` only (no Alembic). Deploy and
``python -m app.sql_migrations`` apply pending files in order and record
each basename in ``schema_migrations``.

Bootstrap (first create of the ledger):
  If the DB already looks initialized (e.g. ``users`` exists), seed the
  ledger with every current ``NNN_*.sql`` filename as applied so Deploy does
  not re-run scripts that were applied manually before the ledger existed.
  If the DB is empty, leave the ledger empty and apply all scripts.
  After ``restore_db.sh`` applies every file, call ``--sync-ledger`` (or a
  normal run) so the ledger matches disk without re-executing SQL.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import make_url, text
from sqlalchemy.ext.asyncio import AsyncConnection, create_async_engine

from app.config import settings

SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"
LEDGER_TABLE = "schema_migrations"
NUMBERED_SQL = re.compile(r"^(\d{3})_.+\.sql$")


@dataclass(frozen=True)
class ApplyResult:
    created_ledger: bool
    seeded: list[str]
    applied: list[str]
    pending_before: list[str]
    dry_run: bool


def list_numbered_scripts(scripts_dir: Path | None = None) -> list[Path]:
    """Return ``NNN_*.sql`` paths sorted by numeric prefix then name."""
    root = scripts_dir or SCRIPTS_DIR
    found: list[tuple[int, str, Path]] = []
    for path in root.iterdir():
        if not path.is_file():
            continue
        m = NUMBERED_SQL.match(path.name)
        if not m:
            continue
        found.append((int(m.group(1)), path.name, path))
    found.sort(key=lambda t: (t[0], t[1]))
    return [p for _, _, p in found]


def _async_database_url() -> str:
    url = make_url(settings.DATABASE_URL)
    if url.drivername in ("postgresql", "postgres"):
        url = url.set(drivername="postgresql+asyncpg")
    return url.render_as_string(hide_password=False)


def _psql_env_and_args() -> tuple[dict[str, str], list[str]]:
    """Build env + argv for ``psql`` from DATABASE_URL (same idea as restore_db.sh)."""
    url = make_url(settings.DATABASE_URL)
    env = os.environ.copy()
    if url.password is not None:
        env["PGPASSWORD"] = url.password
    host = url.host or "localhost"
    port = str(url.port or 5432)
    user = url.username or "postgres"
    database = (url.database or "kutirgrs_v2").lstrip("/")
    args = [
        "psql",
        "-h", host,
        "-p", port,
        "-U", user,
        "-d", database,
        "-v", "ON_ERROR_STOP=1",
        "-q",
    ]
    return env, args


async def _ledger_exists(conn: AsyncConnection) -> bool:
    row = await conn.execute(
        text(
            """
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = :name
            """
        ),
        {"name": LEDGER_TABLE},
    )
    return row.first() is not None


async def _users_table_exists(conn: AsyncConnection) -> bool:
    row = await conn.execute(
        text(
            """
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'users'
            """
        )
    )
    return row.first() is not None


async def _create_ledger(conn: AsyncConnection) -> None:
    await conn.execute(
        text(
            f"""
            CREATE TABLE {LEDGER_TABLE} (
                filename   TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
    )


async def _seed_ledger(conn: AsyncConnection, filenames: list[str]) -> None:
    for name in filenames:
        await conn.execute(
            text(
                f"""
                INSERT INTO {LEDGER_TABLE} (filename)
                VALUES (:filename)
                ON CONFLICT (filename) DO NOTHING
                """
            ),
            {"filename": name},
        )


async def _applied_filenames(conn: AsyncConnection) -> set[str]:
    result = await conn.execute(text(f"SELECT filename FROM {LEDGER_TABLE}"))
    return {row[0] for row in result.fetchall()}


async def _record_applied(conn: AsyncConnection, filename: str) -> None:
    await conn.execute(
        text(
            f"""
            INSERT INTO {LEDGER_TABLE} (filename)
            VALUES (:filename)
            ON CONFLICT (filename) DO NOTHING
            """
        ),
        {"filename": filename},
    )


def _run_sql_file(path: Path) -> None:
    env, args = _psql_env_and_args()
    proc = subprocess.run(
        [*args, "-f", str(path)],
        env=env,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "").strip() or f"exit {proc.returncode}"
        raise RuntimeError(f"psql failed on {path.name}: {detail}")


async def ensure_ledger_and_pending(
    conn: AsyncConnection,
    scripts: list[Path],
    *,
    sync_only: bool = False,
) -> tuple[bool, list[str], list[Path]]:
    """
    Ensure ledger exists; return (created_ledger, seeded_names, pending_paths).

    On first create: if ``users`` exists, seed all current script names (existing
    DB). Otherwise leave empty so a greenfield DB can apply every file.
    ``sync_only`` always records every script name without applying (restore).
    """
    created = False
    seeded: list[str] = []
    names = [p.name for p in scripts]

    if not await _ledger_exists(conn):
        await _create_ledger(conn)
        created = True
        if sync_only or await _users_table_exists(conn):
            await _seed_ledger(conn, names)
            seeded = list(names)

    if sync_only and not created:
        # Ledger already existed — fill any missing filenames (e.g. after restore).
        applied = await _applied_filenames(conn)
        missing = [n for n in names if n not in applied]
        if missing:
            await _seed_ledger(conn, missing)
            seeded.extend(missing)

    applied = await _applied_filenames(conn)
    pending = [p for p in scripts if p.name not in applied]
    return created, seeded, pending


async def _preview_pending(
    conn: AsyncConnection, scripts: list[Path]
) -> tuple[bool, list[str], list[Path]]:
    """Read-only preview: what create/seed/apply would do (no writes)."""
    names = [p.name for p in scripts]
    if not await _ledger_exists(conn):
        if await _users_table_exists(conn):
            return True, list(names), []
        return True, [], list(scripts)
    applied = await _applied_filenames(conn)
    return False, [], [p for p in scripts if p.name not in applied]


async def apply_pending_sql(
    *,
    dry_run: bool = False,
    sync_only: bool = False,
    scripts_dir: Path | None = None,
) -> ApplyResult:
    scripts = list_numbered_scripts(scripts_dir)
    engine = create_async_engine(_async_database_url(), echo=False)
    created = False
    seeded: list[str] = []
    pending: list[Path] = []
    applied: list[str] = []

    try:
        if dry_run:
            async with engine.connect() as conn:
                created, seeded, pending = await _preview_pending(conn, scripts)
            return ApplyResult(
                created_ledger=created,
                seeded=seeded,
                applied=[],
                pending_before=[p.name for p in pending],
                dry_run=True,
            )

        async with engine.begin() as conn:
            created, seeded, pending = await ensure_ledger_and_pending(
                conn, scripts, sync_only=sync_only
            )

        if sync_only:
            return ApplyResult(
                created_ledger=created,
                seeded=seeded,
                applied=[],
                pending_before=[p.name for p in pending],
                dry_run=False,
            )

        for path in pending:
            _run_sql_file(path)
            async with engine.begin() as conn:
                await _record_applied(conn, path.name)
            applied.append(path.name)
    finally:
        await engine.dispose()

    return ApplyResult(
        created_ledger=created,
        seeded=seeded,
        applied=applied,
        pending_before=[p.name for p in pending],
        dry_run=False,
    )


def _print_result(result: ApplyResult) -> None:
    prefix = "Would create" if result.dry_run else "Created"
    seed_prefix = "Would seed" if result.dry_run else "Seeded"
    if result.created_ledger:
        print(f"{prefix} ledger table `{LEDGER_TABLE}`")
    if result.seeded:
        print(
            f"{seed_prefix} {len(result.seeded)} existing script(s) as applied (no re-run)"
        )
    if result.dry_run:
        if result.pending_before:
            print(f"Pending ({len(result.pending_before)}):")
            for name in result.pending_before:
                print(f"  {name}")
        else:
            print("No pending numbered SQL migrations")
        return
    if result.applied:
        print(f"Applied {len(result.applied)} migration(s):")
        for name in result.applied:
            print(f"  {name}")
    else:
        print("No pending numbered SQL migrations")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Apply pending backend/scripts/NNN_*.sql via schema_migrations ledger"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Create/seed ledger if needed, list pending files, do not apply",
    )
    parser.add_argument(
        "--list-pending",
        action="store_true",
        help="Same as --dry-run",
    )
    parser.add_argument(
        "--sync-ledger",
        action="store_true",
        help="Create ledger and record all current NNN_*.sql as applied (no SQL run)",
    )
    args = parser.parse_args(argv)
    dry_run = args.dry_run or args.list_pending
    sync_only = args.sync_ledger

    try:
        result = asyncio.run(
            apply_pending_sql(dry_run=dry_run, sync_only=sync_only)
        )
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    _print_result(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
