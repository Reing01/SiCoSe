import { API_BASE_URL } from '../../lib/api'

let loginWarmupStarted = false

function prefetchProtectedChunks() {
  void import('../../pages/dashboard/DashboardPage').catch(() => undefined)
  void import('../../pages/citizens/CitizenManagementPage').catch(() => undefined)
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
  prefetchProtectedChunks()
}
