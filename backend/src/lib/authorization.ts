import type { UserRole } from "../types/auth.js";

export const USER_ROLES = [
  "admin",
  "tesorero",
  "secretaria",
] as const satisfies readonly UserRole[];

export const PROTECTED_RESOURCES = [
  "dashboard",
  "ciudadanos",
  "reportes",
  "cobranza",
] as const;

export type ProtectedResource = (typeof PROTECTED_RESOURCES)[number];

export const ROLE_PERMISSIONS: Record<UserRole, readonly ProtectedResource[]> =
  {
    admin: PROTECTED_RESOURCES,
    tesorero: ["cobranza", "dashboard", "reportes"],
    secretaria: ["ciudadanos"],
  };

export function isKnownRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

export function canAccessResource(role: UserRole, resource: ProtectedResource) {
  return ROLE_PERMISSIONS[role].includes(resource);
}
