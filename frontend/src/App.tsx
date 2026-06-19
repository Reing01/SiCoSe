import LandingPage from './LandingPage.jsx'
import LoginPage from './pages/auth/LoginPage'
import CitizenManagementPage from './pages/citizens/CitizenManagementPage'
import DashboardPage from './pages/dashboard/DashboardPage'

export default function App() {
  const pathname =
    typeof window !== 'undefined'
      ? window.location.pathname.replace(/\/+$/, '') || '/'
      : '/'

  if (pathname === '/login') {
    return <LoginPage />
  }

  if (pathname === '/ciudadanos') {
    return <CitizenManagementPage />
  }

  if (pathname === '/dashboard') {
    return <DashboardPage />
  }

  return <LandingPage />
}
