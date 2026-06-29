import { useState } from 'react'
import { readAuthSession } from '../features/auth/auth.session'
import { cn } from '../lib/utils'

const ROUTES = [
  { href: '/', label: 'Inicio' },
  { href: '/login', label: 'Login' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/ciudadanos', label: 'Ciudadanos' },
] as const

type RoutePillsProps = {
  className?: string
  variant?: 'light' | 'dark'
  ariaLabel?: string
}

function getCurrentPath() {
  if (typeof window === 'undefined') {
    return '/'
  }

  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'

  return pathname === '/login' || pathname === '/ciudadanos' || pathname === '/dashboard'
    ? pathname
    : '/'
}

function getVisibleRoutes() {
  const session = readAuthSession()

  if (!session) {
    return ROUTES.filter((route) => route.href === '/' || route.href === '/login')
  }

  if (session.user.rol === 'secretaria') {
    return ROUTES.filter((route) => route.href !== '/dashboard')
  }

  if (session.user.rol === 'tesorero') {
    return ROUTES.filter((route) => route.href !== '/ciudadanos')
  }

  return ROUTES
}

const VARIANT_CLASSES = {
  light: {
    idle:
      'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white',
    active:
      'border-[#f97316]/60 bg-[#f97316] text-white shadow-lg shadow-orange-500/20',
  },
  dark: {
    idle:
      'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
    active:
      'border-[#f97316]/25 bg-[#f97316]/10 text-[#0f3042] shadow-sm shadow-orange-200',
  },
} as const

export default function RoutePills({
  className,
  variant = 'dark',
  ariaLabel = 'Navegacion de pantallas',
}: RoutePillsProps) {
  const currentPath = getCurrentPath()
  const routes = getVisibleRoutes()
  const styles = VARIANT_CLASSES[variant]
  const [isOpen, setIsOpen] = useState(false)
  const buttonClasses =
    variant === 'light'
      ? 'border-white/10 bg-white/5 text-white hover:bg-white/10'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  const menuClasses =
    variant === 'light'
      ? 'border-white/10 bg-[#0a2535]'
      : 'border-slate-200 bg-white'

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]/30 sm:hidden',
          buttonClasses,
        )}
        onClick={() => setIsOpen((current) => !current)}
        aria-label={
          isOpen ? 'Cerrar menu de navegacion' : 'Abrir menu de navegacion'
        }
        aria-expanded={isOpen}
      >
        <span className="sr-only">Menu</span>
        <span className="flex flex-col gap-1">
          <span className="h-0.5 w-5 rounded-full bg-current" />
          <span className="h-0.5 w-5 rounded-full bg-current" />
          <span className="h-0.5 w-5 rounded-full bg-current" />
        </span>
      </button>

      <nav
        aria-label={ariaLabel}
        className={cn(
          'hidden flex-wrap gap-2 sm:flex',
          isOpen &&
            cn(
              'absolute right-0 top-12 z-30 flex min-w-48 flex-col rounded-2xl border p-2 shadow-xl sm:static sm:min-w-0 sm:flex-row sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none',
              menuClasses,
            ),
        )}
      >
        {routes.map((route) => {
          const isActive = currentPath === route.href

          return (
            <a
              key={route.href}
              href={route.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-11 items-center rounded-full border px-3 py-2 text-xs font-semibold transition-colors',
                isActive ? styles.active : styles.idle,
                isOpen && 'justify-center',
              )}
            >
              {route.label}
            </a>
          )
        })}
      </nav>
    </div>
  )
}
