import LandingPage from './LandingPage.jsx'
import { ThemeProvider } from './features/theme/theme'
import LoginPage from './pages/auth/LoginPage'
import CitizenManagementPage from './pages/citizens/CitizenManagementPage'
import DashboardPage from './pages/dashboard/DashboardPage'

export default function App() {
  const pathname =
    typeof window !== 'undefined'
      ? window.location.pathname.replace(/\/+$/, '') || '/'
      : '/'

  return (
    <ThemeProvider>
      {pathname === '/login' ? (
        <LoginPage />
      ) : pathname === '/ciudadanos' ? (
        <CitizenManagementPage />
      ) : pathname === '/dashboard' ? (
        <DashboardPage />
      ) : (
        <LandingPage />
      )}
    </ThemeProvider>
  )
}
