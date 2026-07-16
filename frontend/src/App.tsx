import { lazy, Suspense, useEffect } from 'react'
import { readAuthSession } from './features/auth/auth.session'
import { resolveAppRoute } from './features/auth/auth.routing'
import { ThemeProvider } from './features/theme/theme'

const LandingPage = lazy(() => import('./LandingPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const CitizenManagementPage = lazy(() => import('./pages/citizens/CitizenManagementPage'))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))

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
  const pathname =
    typeof window !== 'undefined'
      ? window.location.pathname.replace(/\/+$/, '') || '/'
      : '/'
  const session = readAuthSession()
  const resolvedRoute = resolveAppRoute(pathname, session)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (resolvedRoute !== pathname) {
      window.location.replace(resolvedRoute)
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
        ) : (
          <LandingPage />
        )}
      </Suspense>
    </ThemeProvider>
  )
}
