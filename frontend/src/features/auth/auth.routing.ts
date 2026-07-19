import { canAccessRoute, type AppRoute } from "./authorization";
import { getHomeRouteForRole } from "./auth.session";
import type { AuthSession } from "./auth.types";

function normalizeRoute(pathname: string): AppRoute {
  const normalized = pathname.replace(/\/+$/, "") || "/";

  if (
    normalized === "/login" ||
    normalized === "/dashboard" ||
    normalized === "/ciudadanos" ||
    normalized === "/pagos"
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

  if (route === "/login") {
    return session ? getHomeRouteForRole(session.user.rol) : "/login";
  }

  if (route === "/dashboard" || route === "/ciudadanos" || route === "/pagos") {
    if (!session) {
      return "/login";
    }

    return canAccessRoute(route, session)
      ? route
      : getHomeRouteForRole(session.user.rol);
  }

  return route;
}
