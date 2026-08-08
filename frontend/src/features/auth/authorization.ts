import type { AuthRole, AuthSession } from "./auth.types";

export const APP_ROUTES = [
  "/",
  "/login",
  "/dashboard",
  "/ciudadanos",
  "/pagos",
  "/reportes",
  "/usuarios",
] as const;

export type AppRoute = (typeof APP_ROUTES)[number];
export type ProtectedAppRoute = Extract<
  AppRoute,
  "/dashboard" | "/ciudadanos" | "/pagos" | "/reportes" | "/usuarios"
>;

export const ROLE_ROUTE_PERMISSIONS: Record<
  AuthRole,
  readonly ProtectedAppRoute[]
> = {
  admin: ["/dashboard", "/ciudadanos", "/pagos", "/reportes", "/usuarios"],
  tesorero: ["/dashboard", "/pagos", "/reportes"],
  secretaria: ["/ciudadanos"],
};

export function isKnownAuthRole(role: string): role is AuthRole {
  return role === "admin" || role === "tesorero" || role === "secretaria";
}

export function canAccessRoute(route: ProtectedAppRoute, session: AuthSession) {
  return ROLE_ROUTE_PERMISSIONS[session.user.rol].includes(route);
}

export function getVisibleProtectedRoutes(session: AuthSession) {
  return ROLE_ROUTE_PERMISSIONS[session.user.rol];
}
