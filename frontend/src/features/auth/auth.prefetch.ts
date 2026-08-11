import { API_BASE_URL } from '../../lib/api'
import { getCurrentPeriodKey } from '../../lib/water-billing'
import { prefetchDashboardMetrics } from '../dashboard/dashboard.api'
import type { AuthSession } from './auth.types'

let loginWarmupStarted = false

function prefetchLandingChunk(session: AuthSession) {
  if (session.user.rol === 'secretaria') {
    void import('../../pages/citizens/CitizenManagementPage').catch(() => undefined)
    return
  }

  void import('../../pages/dashboard/DashboardPage').catch(() => undefined)
}

async function warmBackendHealth() {
  if (!API_BASE_URL) {
    return
  }

  try {
    await fetch(`${API_BASE_URL}/api/health`, {
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

  void warmBackendHealth()
}

export function warmPostLoginExperience(session: AuthSession) {
  if (import.meta.env.MODE === 'test') {
    return
  }

  prefetchLandingChunk(session)

  if (session.user.rol === 'secretaria') {
    return
  }

  prefetchDashboardMetrics(session.token, getCurrentPeriodKey())
}
