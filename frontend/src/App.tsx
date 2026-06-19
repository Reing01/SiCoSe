import LandingPage from './LandingPage.jsx'
import LoginPage from './pages/auth/LoginPage'
import CitizenManagementPage from './pages/citizens/CitizenManagementPage'
import { ToastProvider } from './components/ui/toast'

export default function App() {
  const pathname =
    typeof window !== 'undefined'
      ? window.location.pathname.replace(/\/+$/, '') || '/'
      : '/'

  let page = <LandingPage />

  if (pathname === '/login') {
    page = <LoginPage />
  }

  if (pathname === '/ciudadanos') {
    page = <CitizenManagementPage />
  }

  return <ToastProvider>{page}</ToastProvider>
}
