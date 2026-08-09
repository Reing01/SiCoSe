import { useEffect } from 'react'
import RoutePills from '../../components/RoutePills'
import AppLink from '../../components/AppLink'
import ThemeToggle from '../../components/ThemeToggle'
import CitizenManagementPanel from '../../features/citizens/CitizenManagementPanel'
import { logout } from '../../features/auth/auth.api'
import {
  clearAuthSession,
  readAuthSession,
} from '../../features/auth/auth.session'
import { useTheme } from '../../features/theme/theme-context'
import { navigateTo } from '../../lib/navigation'
import { cn } from '../../lib/utils'

export default function CitizenManagementPage() {
  const { theme } = useTheme()
  const session = readAuthSession()

  useEffect(() => {
    if (!session) {
      navigateTo('/login', true)
    }
  }, [session])

  const handleLogout = async () => {
    const currentSession = readAuthSession()

    try {
      if (currentSession) {
        await logout(currentSession.token)
      }
    } catch {
      // La sesión local debe cerrarse aunque el backend ya no acepte el token.
    } finally {
      clearAuthSession()
      navigateTo('/login', true)
    }
  }

  return (
    <main
      className={cn(
        'min-h-screen animate-fade-in',
        theme === 'dark'
          ? 'bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.9),_transparent_42%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-slate-100'
          : 'bg-[radial-gradient(circle_at_top,_rgba(15,48,66,0.12),_transparent_42%),linear-gradient(180deg,#f8fafc_0%,#eef4f8_100%)] text-slate-900',
      )}
    >
      <header className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pt-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <AppLink
          href="/"
          className={cn(
            'inline-flex items-center gap-3 rounded-full border px-4 py-2 shadow-sm backdrop-blur transition-colors',
            theme === 'dark'
              ? 'border-slate-700 bg-slate-900/90 hover:border-sky-500/30 hover:bg-slate-800'
              : 'border-slate-200 bg-white/90 hover:border-[#0f3042]/20 hover:bg-white',
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f3042] text-sm font-bold text-white shadow-lg shadow-[#0f3042]/15">
            SC
          </div>
          <div className="text-left">
            <p
              className={cn(
                'text-xs font-semibold uppercase tracking-[0.35em]',
                theme === 'dark' ? 'text-sky-300' : 'text-[#0f3042]',
              )}
            >
              SiCoSe
            </p>
            <p
              className={cn(
                'text-sm',
                theme === 'dark' ? 'text-slate-300' : 'text-slate-500',
              )}
            >
              Navegación principal
            </p>
          </div>
        </AppLink>

        <div className="flex flex-wrap items-center gap-3">
          <RoutePills variant={theme === 'dark' ? 'light' : 'dark'} />
          <ThemeToggle />

          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              'inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
              theme === 'dark'
                ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-rose-500/40 hover:text-rose-300'
                : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:text-rose-700',
            )}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <section
        className={cn(
          'border-b backdrop-blur animate-fade-up',
          theme === 'dark'
            ? 'border-slate-800 bg-slate-950/75'
            : 'border-slate-200/80 bg-white/75',
        )}
      >
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mt-5 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="max-w-3xl space-y-4">
              <p
                className={cn(
                  'text-sm font-semibold uppercase tracking-[0.35em]',
                  theme === 'dark' ? 'text-sky-300' : 'text-slate-500',
                )}
              >
                SiCoSe - Padrón digital
              </p>
              <h1
                className={cn(
                  'text-4xl font-semibold tracking-tight sm:text-5xl',
                  theme === 'dark' ? 'text-white' : 'text-slate-950',
                )}
              >
                Gestión de ciudadanos con búsqueda, edición y control de datos
              </h1>
              <p
                className={cn(
                  'text-base leading-7',
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-600',
                )}
              >
                Esta vista centraliza el registro de ciudadanos para revisar
                datos de contacto, editar información y mantener el padrón en
                orden antes de publicarlos en el panel.
              </p>
            </div>

            <div
              className={cn(
                'rounded-[2rem] border p-5 shadow-sm',
                theme === 'dark'
                  ? 'border-slate-800 bg-slate-900/90'
                  : 'border-slate-200 bg-slate-50',
              )}
            >
              <p
                className={cn(
                  'text-sm font-semibold uppercase tracking-[0.3em]',
                  theme === 'dark' ? 'text-sky-300' : 'text-[#0f3042]',
                )}
              >
                Alcance del bloque
              </p>
              <ul
                className={cn(
                  'mt-4 space-y-3 text-sm leading-6',
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-600',
                )}
              >
                <li>- Búsqueda por nombre, correo o clave catastral</li>
                <li>- Filtros rápidos por estado del registro</li>
                <li>- Alta, edición y eliminación con control de campos</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-up">
        <CitizenManagementPanel />
      </section>
    </main>
  )
}
