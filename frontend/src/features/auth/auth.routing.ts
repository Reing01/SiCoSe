import { getHomeRouteForRole } from './auth.session'
import type { AuthSession } from './auth.types'

export type AppRoute = '/' | '/login' | '/dashboard' | '/ciudadanos'

function normalizeRoute(pathname: string): AppRoute {
  const normalized = pathname.replace(/\/+$/, '') || '/'

  if (normalized === '/login' || normalized === '/dashboard' || normalized === '/ciudadanos') {
    return normalized
  }

  return '/'
}

function canAccessProtectedRoute(route: Exclude<AppRoute, '/' | '/login'>, session: AuthSession) {
  if (route === '/dashboard') {
    return session.user.rol === 'admin' || session.user.rol === 'tesorero'
  }

  if (route === '/ciudadanos') {
    return session.user.rol === 'admin' || session.user.rol === 'secretaria'
  }

  return false
}

export function resolveAppRoute(pathname: string, session: AuthSession | null): AppRoute {
  const route = normalizeRoute(pathname)

  if (route === '/login') {
    return session ? getHomeRouteForRole(session.user.rol) : '/login'
  }

  if (route === '/dashboard' || route === '/ciudadanos') {
    if (!session) {
      return '/login'
    }

    return canAccessProtectedRoute(route, session) ? route : getHomeRouteForRole(session.user.rol)
  }

  return route
}
