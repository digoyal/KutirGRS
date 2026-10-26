/**
 * Role titles and Functionality-matrix permission helpers.
 * Source of truth: docs/role-and-access.md
 * Keep in sync with backend/app/roles.py.
 */

/** Day-to-day roles (lowest → highest). SysAdmin is Deploy + global data. */
export const OPERATIONAL_TITLES = [
  "Teacher",
  "Cluster Coordinator",
  "Education Coordinator",
  "District Anchor",
  "Regional Head",
  "Admin",
] as const;

export const SYSADMIN = "SysAdmin" as const;

/** Full assignable list (Admin may create SysAdmin). */
export const TITLES = [...OPERATIONAL_TITLES, SYSADMIN] as const;

export type RoleTitle = (typeof TITLES)[number];
export type OperationalTitle = (typeof OPERATIONAL_TITLES)[number];

function from(minTitle: OperationalTitle): readonly OperationalTitle[] {
  const i = OPERATIONAL_TITLES.indexOf(minTitle);
  return OPERATIONAL_TITLES.slice(i);
}

/** Day-to-day entities: operational roles + SysAdmin (global data). */
export const ALL_ROLES: readonly RoleTitle[] = [...OPERATIONAL_TITLES, SYSADMIN];
export const ADMIN_ONLY: readonly RoleTitle[] = ["Admin"];
export const SYSADMIN_ONLY: readonly RoleTitle[] = [SYSADMIN];
export const CC_PLUS: readonly RoleTitle[] = [...from("Cluster Coordinator"), SYSADMIN];
export const EC_PLUS: readonly RoleTitle[] = [...from("Education Coordinator"), SYSADMIN];

/** Mutate (Add/Edit/Delete) — Functionality sheet */
export const MANAGE_STUDENTS = ALL_ROLES;
export const MANAGE_PROGRESS = ALL_ROLES;
export const MANAGE_ADMISSIONS = ALL_ROLES;
export const MANAGE_KUTIRS = CC_PLUS;
export const MANAGE_VISITS = CC_PLUS;
export const MANAGE_SCHOOLS = CC_PLUS;
export const MANAGE_EXAM_CENTERS = CC_PLUS;
export const MANAGE_GEOGRAPHY = EC_PLUS;
export const MANAGE_LOOKUPS = ADMIN_ONLY;
export const MANAGE_USERS = CC_PLUS;
export const MANAGE_COLUMN_CONFIG = ADMIN_ONLY;
export const MANAGE_DEPLOY = SYSADMIN_ONLY;

/** View restrictions */
export const VIEW_USERS = CC_PLUS;
export const VIEW_COLUMN_CONFIG = ADMIN_ONLY;
export const VIEW_LOOKUPS = ALL_ROLES;
export const VIEW_DEPLOY = SYSADMIN_ONLY;

export function hasRole(
  title: string | null | undefined,
  allowed: readonly string[],
): boolean {
  return !!title && allowed.includes(title);
}

export function isAdmin(title: string | null | undefined): boolean {
  return title === "Admin";
}

export function isSysAdmin(title: string | null | undefined): boolean {
  return title === SYSADMIN;
}

/** Unrestricted geo / list / picker scope (Admin or SysAdmin). */
export function hasGlobalDataScope(title: string | null | undefined): boolean {
  return title === "Admin" || title === SYSADMIN;
}

export function canManageStudents(title: string | null | undefined): boolean {
  return hasRole(title, MANAGE_STUDENTS);
}
export function canManageProgress(title: string | null | undefined): boolean {
  return hasRole(title, MANAGE_PROGRESS);
}
export function canManageAdmissions(title: string | null | undefined): boolean {
  return hasRole(title, MANAGE_ADMISSIONS);
}
export function canManageKutirs(title: string | null | undefined): boolean {
  return hasRole(title, MANAGE_KUTIRS);
}
export function canManageVisits(title: string | null | undefined): boolean {
  return hasRole(title, MANAGE_VISITS);
}
export function canManageSchools(title: string | null | undefined): boolean {
  return hasRole(title, MANAGE_SCHOOLS);
}
export function canManageExamCenters(title: string | null | undefined): boolean {
  return hasRole(title, MANAGE_EXAM_CENTERS);
}
export function canManageGeography(title: string | null | undefined): boolean {
  return hasRole(title, MANAGE_GEOGRAPHY);
}
export function canManageLookups(title: string | null | undefined): boolean {
  return hasRole(title, MANAGE_LOOKUPS);
}

/** Lookups mutate: Admin title or API is_admin (superuser). */
export function canManageLookupsUser(user: {
  title?: string | null;
  is_admin?: boolean;
} | null | undefined): boolean {
  return canManageLookups(user?.title) || !!user?.is_admin;
}
export function canManageUsers(title: string | null | undefined): boolean {
  return hasRole(title, MANAGE_USERS);
}
export function canManageColumnConfig(title: string | null | undefined): boolean {
  return hasRole(title, MANAGE_COLUMN_CONFIG);
}
export function canManageDeploy(title: string | null | undefined): boolean {
  return hasRole(title, MANAGE_DEPLOY);
}

export function canViewUsers(title: string | null | undefined): boolean {
  return hasRole(title, VIEW_USERS);
}
export function canViewColumnConfig(title: string | null | undefined): boolean {
  return hasRole(title, VIEW_COLUMN_CONFIG);
}
export function canViewLookups(title: string | null | undefined): boolean {
  return hasRole(title, VIEW_LOOKUPS);
}
export function canViewDeploy(title: string | null | undefined): boolean {
  return hasRole(title, VIEW_DEPLOY);
}

/**
 * Titles the actor may assign (strictly below their own).
 * Admin may assign any title including SysAdmin.
 */
export function assignableTitles(actorTitle: string | null | undefined): string[] {
  if (actorTitle === "Admin") return [...TITLES];
  const i = TITLES.indexOf(actorTitle as RoleTitle);
  if (i <= 0) return [];
  return TITLES.slice(0, i) as unknown as string[];
}
