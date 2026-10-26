#!/usr/bin/env python3
"""Stage 1 (§3.1) API role × data-scope / IDOR checks — no browser.

Run from anywhere (uses stdlib only):
  python3 backend/scripts/API_testing_matrix.py

Env:
  API_BASE   default http://localhost:8001
  ADMIN_USER default admin
  ADMIN_PASS default admin

Creates/updates fixture users t1 / cc1 / sys (password FixturePass1!) when missing.
Writes/overwrites docs/API_testing_matrix_results.md with Pass/Fail/Skip cells.
Exit code 1 if any Fail (Skip does not fail the process).
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
RESULTS_PATH = REPO_ROOT / "docs" / "API_testing_matrix_results.md"

API_BASE = os.environ.get("API_BASE", "http://localhost:8001").rstrip("/")
ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "admin")
FIXTURE_PASS = "FixturePass1!"

# §3.1 fixture usernames (ADM = bootstrap admin)
T1_USER = "t1"
CC1_USER = "cc1"
SYS_USER = "sys"


@dataclass
class CheckResult:
    check_id: str
    role: str
    expected: str
    actual: str
    status: str  # Pass | Fail | Skip
    note: str = ""
    ts: str = field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))


class ApiClient:
    def __init__(self, base: str):
        self.base = base

    def request(
        self,
        method: str,
        path: str,
        *,
        token: Optional[str] = None,
        json_body: Any = None,
        form: Optional[dict[str, str]] = None,
        timeout: float = 30.0,
    ) -> tuple[int, dict[str, str], Any]:
        url = f"{self.base}{path}"
        headers: dict[str, str] = {}
        data: Optional[bytes] = None
        if form is not None:
            data = urllib.parse.urlencode(form).encode()
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        elif json_body is not None:
            data = json.dumps(json_body).encode()
            headers["Content-Type"] = "application/json"
        if token:
            headers["Authorization"] = f"Bearer {token}"
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read()
                hdrs = {k.lower(): v for k, v in resp.headers.items()}
                body: Any = None
                if raw:
                    try:
                        body = json.loads(raw.decode())
                    except json.JSONDecodeError:
                        body = raw.decode(errors="replace")
                return resp.status, hdrs, body
        except urllib.error.HTTPError as e:
            raw = e.read()
            hdrs = {k.lower(): v for k, v in e.headers.items()} if e.headers else {}
            body = None
            if raw:
                try:
                    body = json.loads(raw.decode())
                except json.JSONDecodeError:
                    body = raw.decode(errors="replace")
            return e.code, hdrs, body
        except urllib.error.URLError as e:
            raise SystemExit(f"API unreachable at {self.base}: {e}") from e

    def login(self, username: str, password: str) -> str:
        code, _, body = self.request(
            "POST",
            "/api/v1/auth/login",
            form={"username": username, "password": password},
        )
        if code != 200 or not isinstance(body, dict) or "access_token" not in body:
            raise SystemExit(f"Login failed for {username!r}: HTTP {code} {body}")
        return body["access_token"]


def deny_ok(code: int) -> bool:
    """IDOR / auth denial: 403 or 404, never success."""
    return code in (403, 404)


def record(
    results: list[CheckResult],
    check_id: str,
    role: str,
    expected: str,
    actual: str,
    ok: bool,
    note: str = "",
    *,
    skip: bool = False,
) -> None:
    if skip:
        status = "Skip"
    else:
        status = "Pass" if ok else "Fail"
    results.append(
        CheckResult(
            check_id=check_id,
            role=role,
            expected=expected,
            actual=actual,
            status=status,
            note=note,
        )
    )
    mark = {"Pass": "✓", "Fail": "✗", "Skip": "○"}[status]
    print(f"  {mark} {check_id} [{role}] {status}: {note or actual}")


def pick_scope_fixture(api: ApiClient, admin_token: str) -> dict[str, Any]:
    """Choose cluster C1 with kutirs K-A, K-B (students) and out-of-scope resource ids."""
    code, _, kutirs = api.request("GET", "/api/v1/kutirs", token=admin_token)
    if code != 200 or not isinstance(kutirs, list):
        raise SystemExit(f"Cannot list kutirs: HTTP {code}")

    # Page through students for kutir occupancy (default limit 25).
    by_k: dict[int, list[dict]] = defaultdict(list)
    offset = 0
    page = 200
    total = None
    while True:
        code, hdrs, students = api.request(
            "GET",
            f"/api/v1/students?limit={page}&offset={offset}",
            token=admin_token,
        )
        if code != 200 or not isinstance(students, list):
            raise SystemExit(f"Cannot list students: HTTP {code}")
        if total is None:
            total = int(hdrs.get("x-total-count") or len(students))
        for s in students:
            kid = s.get("kutir_id")
            if kid is not None:
                by_k[kid].append(s)
        offset += len(students)
        if not students or offset >= total:
            break

    by_c: dict[int, list[dict]] = defaultdict(list)
    for k in kutirs:
        cid = k.get("cluster_id")
        if cid:
            by_c[cid].append(k)

    # Resource maps for out-of-scope IDs
    stu_by_id = {s["id"]: s for ss in by_k.values() for s in ss}

    def all_pages(path: str) -> list[dict]:
        items: list[dict] = []
        off = 0
        while True:
            c, h, body = api.request(
                "GET", f"{path}?limit={page}&offset={off}", token=admin_token
            )
            if c != 200 or not isinstance(body, list):
                # Some list endpoints may not paginate the same way
                if c == 200 and isinstance(body, list) and off == 0:
                    return body
                if off == 0:
                    c2, _, body2 = api.request("GET", path, token=admin_token)
                    if c2 == 200 and isinstance(body2, list):
                        return body2
                break
            items.extend(body)
            tot = int(h.get("x-total-count") or 0)
            off += len(body)
            if not body or (tot and off >= tot) or len(body) < page:
                break
        return items

    exams = all_pages("/api/v1/student-exams")
    progress = all_pages("/api/v1/student-progress")
    # Visits list may be large and unscoped-paginated; one unscoped fetch is enough for an id
    c, _, visits_body = api.request("GET", "/api/v1/kutir-visits", token=admin_token)
    visits = visits_body if c == 200 and isinstance(visits_body, list) else []

    exam_kutir = {}
    for e in exams:
        sid = e.get("student_id")
        kid = stu_by_id.get(sid, {}).get("kutir_id") if sid else None
        if kid is not None:
            exam_kutir[e["id"]] = kid

    prog_kutir = {}
    for p in progress:
        sid = p.get("student_id")
        kid = stu_by_id.get(sid, {}).get("kutir_id") if sid else None
        if kid is not None:
            prog_kutir[p["id"]] = kid

    visit_kutir = {v["id"]: v.get("kutir_id") for v in visits if v.get("id") is not None}

    pick = None
    for cid, ks in by_c.items():
        with_stu = [k for k in ks if by_k.get(k["id"])]
        if len(with_stu) < 2:
            continue
        in_ids = {k["id"] for k in ks}
        out_students = [s for kid, ss in by_k.items() if kid not in in_ids for s in ss]
        if not out_students:
            continue
        ka, kb = with_stu[0], with_stu[1]
        out_s = out_students[0]
        out_exam = next((eid for eid, kid in exam_kutir.items() if kid not in in_ids), None)
        out_prog = next((pid for pid, kid in prog_kutir.items() if kid not in in_ids), None)
        out_visit = next((vid for vid, kid in visit_kutir.items() if kid not in in_ids), None)
        pick = {
            "cluster_id": cid,
            "k_a_id": ka["id"],
            "k_a_name": ka.get("name"),
            "k_b_id": kb["id"],
            "k_b_name": kb.get("name"),
            "in_student_id": by_k[ka["id"]][0]["id"],
            "kb_student_id": by_k[kb["id"]][0]["id"],
            "out_student_id": out_s["id"],
            "out_student_kutir_id": out_s.get("kutir_id"),
            "out_exam_id": out_exam,
            "out_progress_id": out_prog,
            "out_visit_id": out_visit,
            "admin_student_total": total,
            "cluster_kutir_ids": sorted(in_ids),
        }
        # Prefer a pick that has out-of-scope exam + progress + visit
        if out_exam and out_prog and out_visit:
            break

    if not pick:
        raise SystemExit(
            "Cannot find a cluster with ≥2 kutirs that have students plus an out-of-scope student. Seed more geo/students."
        )
    return pick


def find_user(api: ApiClient, token: str, username: str) -> Optional[dict]:
    code, _, users = api.request("GET", "/api/v1/users", token=token)
    if code != 200 or not isinstance(users, list):
        raise SystemExit(f"Cannot list users: HTTP {code}")
    for u in users:
        if u.get("username") == username:
            return u
    return None


def ensure_user(
    api: ApiClient,
    admin_token: str,
    *,
    username: str,
    title: str,
    kutir_ids: Optional[list[int]] = None,
    cluster_ids: Optional[list[int]] = None,
) -> dict:
    existing = find_user(api, admin_token, username)
    payload = {
        "username": username,
        "password": FIXTURE_PASS,
        "title": title,
        "first_name": "Fixture",
        "last_name": username.upper(),
        "is_active": True,
        "kutir_ids": kutir_ids or [],
        "cluster_ids": cluster_ids or [],
        "zone_ids": [],
        "district_ids": [],
        "area_ids": [],
    }
    if existing:
        code, _, body = api.request(
            "PUT",
            f"/api/v1/users/{existing['id']}",
            token=admin_token,
            json_body={
                "title": title,
                "password": FIXTURE_PASS,
                "is_active": True,
                "kutir_ids": kutir_ids if kutir_ids is not None else [],
                "cluster_ids": cluster_ids if cluster_ids is not None else [],
                "zone_ids": [],
                "district_ids": [],
                "area_ids": [],
            },
        )
        if code != 200:
            raise SystemExit(f"Failed updating fixture {username}: HTTP {code} {body}")
        return body if isinstance(body, dict) else existing

    code, _, body = api.request("POST", "/api/v1/users", token=admin_token, json_body=payload)
    if code not in (200, 201):
        raise SystemExit(f"Failed creating fixture {username}: HTTP {code} {body}")
    return body


def list_student_kutir_ids(api: ApiClient, token: str, *, limit: int = 500) -> tuple[list[int], int]:
    code, hdrs, body = api.request(
        "GET", f"/api/v1/students?limit={limit}&offset=0", token=token
    )
    if code != 200 or not isinstance(body, list):
        raise RuntimeError(f"list students HTTP {code}")
    total = int(hdrs.get("x-total-count") or len(body))
    return [s.get("kutir_id") for s in body], total


def run_checks(api: ApiClient, results: list[CheckResult], fx: dict[str, Any], tokens: dict[str, str]) -> None:
    k_a, k_b = fx["k_a_id"], fx["k_b_id"]
    cluster_kutirs = set(fx["cluster_kutir_ids"])
    in_sid = fx["in_student_id"]
    kb_sid = fx["kb_student_id"]
    out_sid = fx["out_student_id"]
    out_exam = fx["out_exam_id"]
    out_prog = fx["out_progress_id"]
    out_visit = fx["out_visit_id"]
    admin_total = fx["admin_student_total"]

    # ── List scope ──────────────────────────────────────────────────────────
    for role, tok in (("T1", tokens["t1"]), ("CC1", tokens["cc1"]), ("ADM", tokens["adm"]), ("SYS", tokens["sys"])):
        try:
            kids, total = list_student_kutir_ids(api, tok)
        except RuntimeError as e:
            record(results, f"{role}_LIST_STUDENTS", role, "scoped list", str(e), False, note=str(e))
            continue

        if role == "T1":
            bad = [k for k in kids if k != k_a]
            ok = total >= 1 and not bad and all(k == k_a for k in kids if k is not None)
            # Total must equal only K-A count (list may be truncated but total header is authoritative)
            # Re-check: every returned row in K-A; total should be < admin_total typically
            record(
                results,
                "T1_LIST_STUDENTS",
                "T1",
                f"only kutir {k_a} (K-A); total reflects K-A",
                f"total={total} sample_kutirs={sorted(set(kids))[:8]}",
                ok and total <= admin_total,
                note=f"K-A={k_a}; out-of-scope rows in page={len(bad)}; admin_total={admin_total}",
            )
        elif role == "CC1":
            bad = [k for k in kids if k not in cluster_kutirs]
            # X-Total-Count for kutir filter (page may be truncated)
            c_a, h_a, _ = api.request(
                "GET", f"/api/v1/students?kutir_id={k_a}&limit=1", token=tok
            )
            c_b, h_b, _ = api.request(
                "GET", f"/api/v1/students?kutir_id={k_b}&limit=1", token=tok
            )
            c_out, h_out, _ = api.request(
                "GET",
                f"/api/v1/students?kutir_id={fx['out_student_kutir_id']}&limit=1",
                token=tok,
            )
            tot_a = int(h_a.get("x-total-count") or 0) if c_a == 200 else -1
            tot_b = int(h_b.get("x-total-count") or 0) if c_b == 200 else -1
            tot_out = int(h_out.get("x-total-count") or 0) if c_out == 200 else -1
            ok = (
                not bad
                and tot_a >= 1
                and tot_b >= 1
                and tot_out == 0
                and total < admin_total
            )
            record(
                results,
                "CC1_LIST_STUDENTS",
                "CC1",
                f"cluster {fx['cluster_id']} only (incl K-A+K-B); out kutir total 0",
                f"total={total} ka={tot_a} kb={tot_b} out={tot_out} bad_rows={len(bad)}",
                ok,
                note=f"C1={fx['cluster_id']} K-A={k_a} K-B={k_b}",
            )
        else:
            # Admin / SysAdmin: unrestricted
            ok = total == admin_total and total > 0
            record(
                results,
                f"{role}_LIST_STUDENTS",
                role,
                f"all rows (total={admin_total})",
                f"total={total}",
                ok,
                note="Unrestricted scope (Admin/SysAdmin)",
            )

    # ── In-scope GET (sanity) ───────────────────────────────────────────────
    for role, tok, sid, label in (
        ("T1", tokens["t1"], in_sid, "K-A student"),
        ("CC1", tokens["cc1"], in_sid, "K-A student"),
        ("CC1", tokens["cc1"], kb_sid, "K-B student"),
    ):
        code, _, _ = api.request("GET", f"/api/v1/students/{sid}", token=tok)
        record(
            results,
            f"{role}_GET_IN_{sid}",
            role,
            "200",
            str(code),
            code == 200,
            note=f"in-scope {label} id={sid}",
        )

    # ── IDOR student / admission / progress / visit ─────────────────────────
    idor_cases = [
        ("T1", tokens["t1"], "STUDENT", f"/api/v1/students/{out_sid}", True, True, True),
        ("CC1", tokens["cc1"], "STUDENT", f"/api/v1/students/{out_sid}", True, True, True),
        ("T1", tokens["t1"], "ADMISSION", f"/api/v1/student-exams/{out_exam}" if out_exam else None, True, True, True),
        ("CC1", tokens["cc1"], "ADMISSION", f"/api/v1/student-exams/{out_exam}" if out_exam else None, True, True, True),
        ("T1", tokens["t1"], "PROGRESS", f"/api/v1/student-progress/{out_prog}" if out_prog else None, True, True, True),
        ("CC1", tokens["cc1"], "PROGRESS", f"/api/v1/student-progress/{out_prog}" if out_prog else None, True, True, True),
        ("T1", tokens["t1"], "VISIT", f"/api/v1/kutir-visits/{out_visit}" if out_visit else None, True, False, True),
        ("CC1", tokens["cc1"], "VISIT", f"/api/v1/kutir-visits/{out_visit}" if out_visit else None, True, True, True),
    ]

    for role, tok, kind, path, do_get, do_patch, do_delete in idor_cases:
        if path is None:
            record(
                results,
                f"{role}_IDOR_{kind}",
                role,
                "403/404 on GET/PATCH/DELETE",
                "n/a",
                False,
                note=f"No out-of-scope {kind.lower()} id in DB",
                skip=True,
            )
            continue

        if do_get:
            code, _, _ = api.request("GET", path, token=tok)
            record(
                results,
                f"{role}_IDOR_{kind}_GET",
                role,
                "403 or 404",
                str(code),
                deny_ok(code),
                note=f"out-of-scope {path}",
            )
        if do_patch:
            # Harmless empty patch — must not succeed on out-of-scope
            code, _, _ = api.request("PATCH", path, token=tok, json_body={})
            record(
                results,
                f"{role}_IDOR_{kind}_PATCH",
                role,
                "403 or 404",
                str(code),
                deny_ok(code),
                note=f"out-of-scope {path}",
            )
        if do_delete:
            code, _, _ = api.request("DELETE", path, token=tok)
            # Must not delete; 403/404 only
            record(
                results,
                f"{role}_IDOR_{kind}_DELETE",
                role,
                "403 or 404 (not 204/200)",
                str(code),
                deny_ok(code),
                note=f"out-of-scope {path} — must not delete",
            )

    # Teacher visit mutate: matrix says view-only — out-of-scope PATCH should deny
    if out_visit:
        code, _, _ = api.request(
            "PATCH",
            f"/api/v1/kutir-visits/{out_visit}",
            token=tokens["t1"],
            json_body={},
        )
        record(
            results,
            "T1_IDOR_VISIT_PATCH",
            "T1",
            "403 or 404 (view-only + scope)",
            str(code),
            deny_ok(code),
            note="Teacher cannot mutate visits (Functionality) and out-of-scope",
        )

    # ── BR-ROLE-1 Deploy ────────────────────────────────────────────────────
    for role, tok, expect_deny in (
        ("T1", tokens["t1"], True),
        ("CC1", tokens["cc1"], True),
        ("ADM", tokens["adm"], True),
        ("SYS", tokens["sys"], False),
    ):
        code, _, body = api.request("GET", "/api/v1/admin/deploy/status", token=tok)
        if expect_deny:
            ok = code == 403
            record(
                results,
                f"{role}_DEPLOY_STATUS",
                role,
                "403",
                str(code),
                ok,
                note="BR-ROLE-1: only SysAdmin may access Deploy",
            )
        else:
            # Auth gate passed if not 403 (200 OK, or 500 if PROJECT_ROOT missing locally)
            ok = code != 403
            note = "BR-ROLE-1: SysAdmin allowed past auth gate"
            if code == 500:
                note += f" (HTTP 500 after auth — local PROJECT_ROOT likely missing: {body!r})"
            record(
                results,
                f"{role}_DEPLOY_STATUS",
                role,
                "not 403 (200 or post-auth error OK)",
                str(code),
                ok,
                note=note,
            )


def write_results_md(
    results: list[CheckResult],
    fx: dict[str, Any],
    fixtures_meta: dict[str, Any],
) -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    passes = sum(1 for r in results if r.status == "Pass")
    fails = sum(1 for r in results if r.status == "Fail")
    skips = sum(1 for r in results if r.status == "Skip")

    lines = [
        "# Pre-Alpha Stage 1 — API role × scope / IDOR matrix results",
        "",
        "Generated by [`backend/scripts/API_testing_matrix.py`](../backend/scripts/API_testing_matrix.py) "
        "(docs/pre-alpha-testing-approach.md §3.1). Re-run the script to refresh this file.",
        "",
        f"**Last run (UTC):** {now}  ",
        f"**API:** `{API_BASE}`  ",
        f"**Counts:** Pass={passes} · Fail={fails} · Skip={skips}",
        "",
        "## Fixture users",
        "",
        "| User | Username | Password | Role | Assignment |",
        "|------|----------|----------|------|------------|",
        f"| T1 | `{T1_USER}` | `{FIXTURE_PASS}` | Teacher | Kutir K-A id={fx['k_a_id']} ({fx.get('k_a_name')}) |",
        f"| CC1 | `{CC1_USER}` | `{FIXTURE_PASS}` | Cluster Coordinator | Cluster C1 id={fx['cluster_id']} (K-A={fx['k_a_id']}, K-B={fx['k_b_id']}) |",
        f"| ADM | `{ADMIN_USER}` | (local `ADMIN_PASSWORD`, default `admin`) | Admin | Unrestricted |",
        f"| SYS | `{SYS_USER}` | `{FIXTURE_PASS}` | SysAdmin | Unrestricted + Deploy |",
        "",
        f"Fixture ensure: {fixtures_meta.get('note', '')}",
        "",
        "## Scope fixture (this run)",
        "",
        "```json",
        json.dumps(
            {
                "cluster_id": fx["cluster_id"],
                "k_a": {"id": fx["k_a_id"], "name": fx.get("k_a_name")},
                "k_b": {"id": fx["k_b_id"], "name": fx.get("k_b_name")},
                "in_student_id": fx["in_student_id"],
                "kb_student_id": fx["kb_student_id"],
                "out_student_id": fx["out_student_id"],
                "out_exam_id": fx["out_exam_id"],
                "out_progress_id": fx["out_progress_id"],
                "out_visit_id": fx["out_visit_id"],
                "admin_student_total": fx["admin_student_total"],
            },
            indent=2,
        ),
        "```",
        "",
        "## Results",
        "",
        "| Check id | Role | Expected | Actual | Status | Note | Timestamp (UTC) |",
        "|----------|------|----------|--------|--------|------|-----------------|",
    ]
    for r in results:
        note = r.note.replace("|", "\\|")
        lines.append(
            f"| `{r.check_id}` | {r.role} | {r.expected} | {r.actual} | **{r.status}** | {note} | {r.ts} |"
        )

    lines += [
        "",
        "## How to run",
        "",
        "```bash",
        "# API must be up on :8001 (e.g. backend/start.sh)",
        "python3 backend/scripts/API_testing_matrix.py",
        "# optional:",
        "# API_BASE=http://localhost:8001 ADMIN_USER=admin ADMIN_PASS=admin python3 backend/scripts/API_testing_matrix.py",
        "```",
        "",
        "No Playwright. Stdlib only. Exit code 1 if any Fail.",
        "",
    ]
    RESULTS_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nWrote {RESULTS_PATH} (Pass={passes} Fail={fails} Skip={skips})")


def main() -> int:
    print(f"API {API_BASE}")
    api = ApiClient(API_BASE)

    # Health: docs or login
    code, _, _ = api.request("GET", "/docs")
    if code != 200:
        raise SystemExit(f"API not healthy (GET /docs → {code}). Start with backend/start.sh")

    admin_token = api.login(ADMIN_USER, ADMIN_PASS)
    print("Logged in as admin; picking scope fixture…")
    fx = pick_scope_fixture(api, admin_token)
    print(
        f"  C1={fx['cluster_id']} K-A={fx['k_a_id']}({fx.get('k_a_name')}) "
        f"K-B={fx['k_b_id']}({fx.get('k_b_name')}) out_student={fx['out_student_id']}"
    )

    print("Ensuring fixture users…")
    t1 = ensure_user(
        api, admin_token, username=T1_USER, title="Teacher", kutir_ids=[fx["k_a_id"]]
    )
    cc1 = ensure_user(
        api,
        admin_token,
        username=CC1_USER,
        title="Cluster Coordinator",
        cluster_ids=[fx["cluster_id"]],
    )
    sysu = ensure_user(api, admin_token, username=SYS_USER, title="SysAdmin")
    fixtures_meta = {
        "note": (
            f"t1 id={t1.get('id')} kutir_ids={t1.get('kutir_ids')}; "
            f"cc1 id={cc1.get('id')} cluster_ids={cc1.get('cluster_ids')}; "
            f"sys id={sysu.get('id')}"
        )
    }
    print(f"  {fixtures_meta['note']}")

    tokens = {
        "adm": admin_token,
        "t1": api.login(T1_USER, FIXTURE_PASS),
        "cc1": api.login(CC1_USER, FIXTURE_PASS),
        "sys": api.login(SYS_USER, FIXTURE_PASS),
    }
    print("Running checks…")
    results: list[CheckResult] = []
    run_checks(api, results, fx, tokens)
    write_results_md(results, fx, fixtures_meta)

    fails = sum(1 for r in results if r.status == "Fail")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
