import CitizenManagementPanel from '../../features/citizens/CitizenManagementPanel'
import RoutePills from '../../components/RoutePills'
import { clearAuthSession } from '../../features/auth/auth.session'
import { cn } from '../../lib/utils'
import { useEffect, useState } from 'react'

export default function CitizenManagementPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const saved = localStorage.getItem('theme-citizen') as 'light' | 'dark' | null
    if (saved) setTheme(saved)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme-citizen', next)
  }

  const handleLogout = () => {
    clearAuthSession()
    window.location.assign('/login')
  }

  return (
    <main
      className={cn(
        'min-h-screen animate-fade-in',
        theme === 'dark'
          ? 'bg-slate-900 text-slate-100'
          : 'bg-[radial-gradient(circle_at_top,_rgba(15,48,66,0.12),_transparent_42%),linear-gradient(180deg,#f8fafc_0%,#eef4f8_100%)] text-slate-900'
      )}
    >
      <header className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pt-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <a
          href="/"
          className={cn(
            'inline-flex items-center gap-3 rounded-full border px-4 py-2 shadow-sm backdrop-blur transition-colors',
            theme === 'dark'
              ? 'border-slate-700 bg-slate-900/90 hover:border-sky-500/30 hover:bg-slate-800'
              : 'border-slate-200 bg-white/90 hover:border-[#0f3042]/20 hover:bg-white'
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f3042] text-sm font-bold text-white shadow-lg shadow-[#0f3042]/15">
            SC
          </div>
          <div className="text-left">
            <p
              className={cn(
                'text-xs font-semibold uppercase tracking-[0.35em]',
                theme === 'dark' ? 'text-sky-300' : 'text-[#0f3042]'
              )}
            >
              SiCoSe
            </p>
            <p
              className={cn(
                'text-sm',
                theme === 'dark' ? 'text-slate-300' : 'text-slate-500'
              )}
            >
              Navegación de evaluación
            </p>
          </div>
        </a>

        <div className="flex flex-wrap items-center gap-3">
          <RoutePills variant={theme === 'dark' ? 'light' : 'dark'} />

          {/* Botón para alternar tema */}
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
          >
            {theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              'inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
              theme === 'dark'
                ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-rose-500/40 hover:text-rose-300'
                : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:text-rose-700'
            )}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* resto igual */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-up">
        <CitizenManagementPanel />
      </section>
    </main>
  )
}