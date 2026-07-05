import { useEffect } from 'react'
import LandingPage from './LandingPage.jsx'
import { readAuthSession } from './features/auth/auth.session'
import { resolveAppRoute } from './features/auth/auth.routing'
import { ThemeProvider } from './features/theme/theme'
import LoginPage from './pages/auth/LoginPage'
import CitizenManagementPage from './pages/citizens/CitizenManagementPage'
import DashboardPage from './pages/dashboard/DashboardPage'

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
      {resolvedRoute === '/login' ? (
        <LoginPage />
      ) : resolvedRoute === '/ciudadanos' ? (
        <CitizenManagementPage />
      ) : resolvedRoute === '/dashboard' ? (
        <DashboardPage />
      ) : (
        <LandingPage />
      )}
    </ThemeProvider>
  )
}
