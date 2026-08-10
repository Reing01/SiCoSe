import type { AppRoute } from "./authorization";
import { getHomeRouteForRole } from "./auth.session";
import type { AuthSession } from "./auth.types";

function normalizeRoute(pathname: string): AppRoute {
  const normalized = pathname.replace(/\/+$/, "") || "/";

  if (
    normalized === "/login" ||
    normalized === "/pagos" ||
    normalized === "/dashboard" ||
    normalized === "/ciudadanos" ||
    normalized === "/reportes" ||
    normalized === "/usuarios"
  ) {
    return normalized;
  }

  return "/";
}

export function resolveAppRoute(
  pathname: string,
  session: AuthSession | null,
): AppRoute {
  const route = normalizeRoute(pathname);

  if (!session) {
    return "/login";
  }

  if (route === "/login" || route === "/") {
    return getHomeRouteForRole(session.user.rol);
  }

  if (route === "/pagos") {
    return "/pagos";
  }

  return "/pagos";
}
