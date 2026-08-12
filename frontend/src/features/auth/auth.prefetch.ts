import { RESOLVED_API_BASE_URL } from '../../lib/api'
import { getCurrentPeriodKey } from '../../lib/water-billing'
import type { AuthSession } from './auth.types'

let loginWarmupStarted = false

function queueIdleTask(task: () => void) {
  if (typeof window === 'undefined') {
    return
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      task()
    }, { timeout: 1500 })
    return
  }

  window.setTimeout(task, 0)
}

function prefetchLandingChunk(session: AuthSession) {
  if (session.user.rol === 'secretaria') {
    void import('../../pages/citizens/CitizenManagementPage').catch(() => undefined)
    return
  }

  void import('../../pages/dashboard/DashboardPage').catch(() => undefined)
}

async function warmBackendHealth() {
  if (!RESOLVED_API_BASE_URL) {
    return
  }

  try {
    await fetch(`${RESOLVED_API_BASE_URL}/api/health`, {
      method: 'GET',
      credentials: 'omit',
      headers: {
        Accept: 'application/json',
      },
    })
  } catch {
    // El calentamiento es oportunista: nunca debe bloquear el login.
  }
}

export function warmLoginExperience() {
  if (loginWarmupStarted || import.meta.env.MODE === 'test') {
    return
  }

  loginWarmupStarted = true

  queueIdleTask(() => {
    void warmBackendHealth()
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
