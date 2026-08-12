import { getCurrentPeriodKey } from '../../lib/water-billing'
import type { AuthSession } from './auth.types'

function prefetchLandingChunk(session: AuthSession) {
  if (session.user.rol === 'secretaria') {
    void import('../../pages/citizens/CitizenManagementPage').catch(() => undefined)
    return
  }

  void import('../../pages/dashboard/DashboardPage').catch(() => undefined)
}

export function warmLoginExperience() {
  if (import.meta.env.MODE === 'test') {
    return
  }

  queueMicrotask(() => {
    void import('../../pages/dashboard/DashboardPage').catch(() => undefined)
    void import('../../pages/citizens/CitizenManagementPage').catch(() => undefined)
  })
}

export function warmPostLoginExperience(session: AuthSession) {
  if (import.meta.env.MODE === 'test') {
    return
  }

  prefetchLandingChunk(session)

  if (session.user.rol === 'secretaria') {
    return
  }

  void import('../dashboard/dashboard.api')
    .then(({ prefetchDashboardMetrics }) =>
      prefetchDashboardMetrics(session.token, getCurrentPeriodKey()),
    )
    .catch(() => undefined)
}
