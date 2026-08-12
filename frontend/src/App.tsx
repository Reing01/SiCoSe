import { lazy, Suspense, useEffect } from 'react'
import { readAuthSession } from './features/auth/auth.session'
import { resolveAppRoute } from './features/auth/auth.routing'
import { ThemeProvider } from './features/theme/theme'
import { navigateTo, useAppPathname } from './lib/navigation'
import { startOfflineSync } from './lib/api'

const LandingPage = lazy(() => import('./LandingPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const CitizenManagementPage = lazy(() => import('./pages/citizens/CitizenManagementPage'))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const PaymentsPage = lazy(() => import('./pages/payments/PaymentsPage'))
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'))
const UsersPage = lazy(() => import('./pages/users/UsersPage'))

function AppFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center bg-slate-950 text-white"
    >
      Cargando interfaz...
    </div>
  )
}

export default function App() {
  const pathname = useAppPathname()
  const session = readAuthSession()
  const sessionToken = session?.token ?? null
  const resolvedRoute = resolveAppRoute(pathname, session)

  useEffect(() => {
    if (!sessionToken) {
      return undefined
    }

    const stopOfflineSync = startOfflineSync()

    return stopOfflineSync
  }, [sessionToken])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (resolvedRoute !== pathname) {
      navigateTo(resolvedRoute, true)
    }
  }, [pathname, resolvedRoute])

  return (
    <ThemeProvider>
      <Suspense fallback={<AppFallback />}>
        {resolvedRoute === '/login' ? (
          <LoginPage />
        ) : resolvedRoute === '/ciudadanos' ? (
          <CitizenManagementPage />
        ) : resolvedRoute === '/dashboard' ? (
          <DashboardPage />
        ) : resolvedRoute === '/pagos' ? (
          <PaymentsPage />
        ) : resolvedRoute === '/reportes' ? (
          <ReportsPage />
        ) : resolvedRoute === '/usuarios' ? (
          <UsersPage />
        ) : (
          <LandingPage />
        )}
      </Suspense>
    </ThemeProvider>
  )
}
