import { useEffect } from 'react'
import AppLink from '../../components/AppLink'
import BrandMark from '../../components/BrandMark'
import RoutePills from '../../components/RoutePills'
import ThemeToggle from '../../components/ThemeToggle'
import LoginForm from '../../features/auth/LoginForm'
import { LOGIN_COPY } from '../../features/auth/auth.copy'
import { login } from '../../features/auth/auth.api'
import {
  getHomeRouteForRole,
  persistAuthSession,
  readAuthSession,
} from '../../features/auth/auth.session'
import {
  warmPostLoginExperience,
} from '../../features/auth/auth.prefetch'
import type { LoginRequest } from '../../features/auth/auth.types'
import { navigateTo } from '../../lib/navigation'

const highlights = [
  {
    title: 'Cobro de agua',
    description:
      'Entra al flujo de cobranza y consulta solo lo necesario para registrar pagos.',
  },
  {
    title: 'Búsqueda directa',
    description:
      'Localiza al ciudadano por nombre o clave catastral sin navegar por módulos ajenos.',
  },
  {
    title: 'Comprobante listo',
    description:
      'Abre, imprime y conserva el comprobante del pago sin pasos intermedios.',
  },
] as const

const loginSteps = [
  {
    step: '01',
    title: 'Localiza al ciudadano',
    description: 'Busca por nombre, correo o clave catastral en segundos.',
  },
  {
    step: '02',
    title: 'Confirma el adeudo',
    description: 'Revisa meses pagados, pendientes y el monto exacto.',
  },
  {
    step: '03',
    title: 'Registra y entrega',
    description: 'Guarda el pago y genera el comprobante sin salir del flujo.',
  },
] as const

const signals = [
  'Cobro de agua',
  'Búsqueda paginada',
  'Comprobante PDF',
  'Modo claro/oscuro',
] as const

export default function LoginPage() {
  useEffect(() => {
    const session = readAuthSession()

    if (session) {
      navigateTo(getHomeRouteForRole(session.user.rol), true)
      return
    }
  }, [])

  const handleLogin = async (credentials: LoginRequest) => {
    const response = await login(credentials)

    persistAuthSession(response.data)
    if (typeof window !== 'undefined') {
      window.setTimeout(() => warmPostLoginExperience(response.data), 0)
    } else {
      warmPostLoginExperience(response.data)
    }

    return {
      message: LOGIN_COPY.success,
      redirectTo: getHomeRouteForRole(response.data.user.rol),
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06131f] text-white animate-fade-in">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,48,66,0.28),_transparent_40%),linear-gradient(135deg,#06131f_0%,#0f3042_45%,#081a28_100%)]" />
      <div className="absolute -left-20 top-12 h-72 w-72 rounded-full bg-[#f97316]/15 blur-3xl" />
      <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-7xl flex-col gap-4 px-4 pt-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <AppLink
          href="/"
          className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur transition-colors hover:bg-white/10"
        >
          <BrandMark />
          <div className="text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#f97316]">
              SiCoSe
            </p>
            <p className="text-sm text-slate-300">Cobro de agua</p>
          </div>
        </AppLink>

        <div className="flex flex-wrap items-center gap-3">
          <ThemeToggle className="border-white/10 bg-white/5 text-white hover:bg-white/10" />
          <RoutePills variant="light" />
        </div>
      </header>

      <div className="relative mx-auto grid min-h-screen max-w-7xl gap-10 px-4 pb-10 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-12">
        <section className="flex flex-col justify-center gap-8 animate-fade-up">
          <div className="max-w-2xl space-y-6">
            <div className="space-y-4">
              <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-sky-200/80">
                Acceso seguro
              </p>
              <p className="text-sm font-medium uppercase tracking-[0.35em] text-sky-200/80">
                SiCoSe · Sistema de cobro de agua
              </p>
              <h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Acceso directo al panel de cobranza de agua
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Inicia sesión para buscar al ciudadano, registrar el pago y
                generar el comprobante sin salir del flujo principal.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {highlights.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10 backdrop-blur transition-transform duration-300 hover:-translate-y-0.5 hover:bg-white/10"
              >
                <h2 className="text-sm font-semibold text-white">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {item.description}
                </p>
              </article>
            ))}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10 backdrop-blur sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#f97316]">
                  Flujo guiado
                </p>
                <h2 className="text-lg font-semibold text-white sm:text-xl">
                  Todo el acceso, en tres pasos
                </h2>
              </div>
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200">
                Optimizado para móvil y escritorio
              </span>
            </div>

            <ol className="mt-5 grid gap-3 sm:grid-cols-3">
              {loginSteps.map((item) => (
                <li
                  key={item.step}
                  className="rounded-2xl border border-white/10 bg-[#071725]/70 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/80">
                    {item.step}
                  </p>
                  <h3 className="mt-3 text-sm font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {item.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-wrap gap-3">
            {signals.map((signal) => (
              <span
                key={signal}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200"
              >
                {signal}
              </span>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center animate-scale-in">
          <div className="w-full max-w-lg">
            <LoginForm onSubmit={handleLogin} />
          </div>
        </section>
      </div>
    </main>
  )
}
