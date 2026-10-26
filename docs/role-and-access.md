# Role and Access

Source: `Role and Access.xlsx` (sheets **Functionality** and **Data**), added to the repo as [`Role-and-Access.xlsx`](./Role-and-Access.xlsx).

This document is the product matrix for **what each role may do** (functionality) and **which rows they may see** (data scope). Implement Top-10 #9 and future auth work against this matrix; where code disagrees, treat this doc as the intended product rule unless an explicit security exception is recorded.

Roles (left → right, lowest → highest for day-to-day ops):

Teacher · Cluster Coordinator · Education Coordinator · District Anchor · Regional Head · Admin

**SysAdmin** is a separate ops role (not in the day-to-day hierarchy above). **Admin may create SysAdmin users.** SysAdmin sees **every** nav/menu item Admin (or lower) can see — including Users, Geography, Lookups, Column Settings, Import — **plus Deploy**. Admin does **not** see or call Deploy. For **data**, SysAdmin is unrestricted (same as Admin): all districts/clusters/kutirs/students/admissions/progress/visits/users/geography — no assignment filter.

---

## Functionality access

| Menu item | Action | Teacher | Cluster Coordinator | Education Coordinator | District Anchor | Regional Head | Admin | SysAdmin |
|-----------|--------|---------|---------------------|----------------------|-----------------|---------------|-------|----------|
| Students | Add/Edit/Delete | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Students | View | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Kutirs | Add/Edit/Delete | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Kutirs | View | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Progress | Add/Edit/Delete | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Progress | View | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Admissions | Add/Edit/Delete | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Admissions | View | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Kutir Visits | Add/Edit/Delete | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Kutir Visits | View | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Govt. Res. Schools | Add/Edit/Delete | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Govt. Res. Schools | View | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Exam Centers | Add/Edit/Delete | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Exam Centers | View | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Geography (zone, district, area, cluster) | Add/Edit/Delete | No | No | Yes | Yes | Yes | Yes | Yes |
| Geography | View | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Lookups (categories, exam types, etc.) | Add/Edit/Delete | No | No | No | No | No | Yes | Yes |
| Lookups | View | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Users | Add/Edit/Delete | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Users | View | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Column Config | Add/Edit/Delete | No | No | No | No | No | Yes | Yes |
| Column Config | View | No | No | No | No | No | Yes | Yes |
| Deploy | View / Run | No | No | No | No | No | No | Yes |

**View-only examples (by design):** Teacher can view Kutirs / Visits / Schools / Exam Centers / Geography but not mutate them; Teacher cannot view Users or Column Config at all; Admin and SysAdmin may change Lookups and Column Config; only SysAdmin may Deploy (Admin cannot).

---

## Data access (row scope)

| Entity | Teacher | Cluster Coordinator | Education Coordinator | District Anchor | Regional Head | Admin | SysAdmin |
|--------|---------|---------------------|----------------------|-----------------|---------------|-------|----------|
| Students | Assigned Kutir Only | Assigned Cluster Only | Assigned Area Only | Assigned District Only | Assigned Zone Only | All | All |
| Kutirs | Assigned Kutir Only | Assigned Cluster Only | Assigned Area Only | Assigned District Only | Assigned Zone Only | All | All |
| Progress | Assigned Kutir Only | Assigned Cluster Only | Assigned Area Only | Assigned District Only | Assigned Zone Only | All | All |
| Admissions | Assigned Kutir Only | Assigned Cluster Only | Assigned Area Only | Assigned District Only | Assigned Zone Only | All | All |
| Kutir Visits | Assigned Kutir Only | Assigned Cluster Only | Assigned Area Only | Assigned District Only | Assigned Zone Only | All | All |
| Govt. Res. Schools | All | All | All | All | All | All | All |
| Exam Centers | All | All | All | All | All | All | All |
| Geography | Assigned Kutir Only | Assigned Cluster Only | Assigned Area Only | Assigned District Only | Assigned Zone Only | All | All |
| Lookups | All | All | All | All | All | All | All |
| Users | Assigned Kutir Only | Assigned Cluster Only | Assigned Area Only | Assigned District Only | Assigned Zone Only | All | All |

SysAdmin data scope is **All** (unrestricted geo). SysAdmin has full Admin-level menus/APIs; Deploy remains SysAdmin-only.

Schools, Exam Centers, and Lookups are **global catalogs** (all roles see all rows); mutation rights still follow the Functionality sheet.

---

## Notes from initial review (Oct 2026)

1. Spreadsheet typos kept as source intent but cleaned in this markdown: “Functionalty”, “cateogories”.
2. **Conflicts with recent API hardening (audit S2/S3 / PRs #5):** code currently requires **Admin** for school CUD, exam-center CUD, and visit **delete**. This matrix allows Cluster Coordinator and above to Add/Edit/Delete those. Resolve deliberately in a follow-up (either loosen API to match this matrix, or update the matrix if Admin-only was the real product rule).
3. Backend `MANAGER_ROLES` / FE manage buttons (Top-10 #9) should be driven from the Functionality sheet so view-only roles never see dead edit controls.
4. Data sheet matches the geographic `get_scope` model (kutir → cluster → area → district → zone → all).
