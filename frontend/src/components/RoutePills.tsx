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
  ariaLabel = 'Navegación de pantallas',
}: RoutePillsProps) {
  const currentPath = getCurrentPath()
  const styles = VARIANT_CLASSES[variant]

  return (
    <nav aria-label={ariaLabel} className={cn('flex flex-wrap gap-2', className)}>
      {ROUTES.map((route) => {
        const isActive = currentPath === route.href

        return (
          <a
            key={route.href}
            href={route.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              isActive ? styles.active : styles.idle,
            )}
          >
            {route.label}
          </a>
        )
      })}
    </nav>
  )
}
