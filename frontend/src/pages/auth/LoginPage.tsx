import { useEffect } from 'react'
import LoginForm from '../../features/auth/LoginForm'
import { login } from '../../features/auth/auth.api'
import { getHomeRouteForRole, persistAuthSession, readAuthSession } from '../../features/auth/auth.session'
import type { LoginRequest } from '../../features/auth/auth.types'
import RoutePills from '../../components/RoutePills'

const highlights = [
  {
    title: 'Acceso por roles',
    description:
      'El panel se prepara para administrar cuentas de tesorería, administración y secretaría.',
  },
  {
    title: 'Acceso seguro',
    description:
      'La pantalla acompaña el acceso con validacion clara y una experiencia consistente.',
  },
  {
    title: 'Experiencia mobile-first',
    description:
      'La composición responde bien en tablet y celular sin perder contraste ni jerarquía.',
  },
]

const signals = ['JWT', 'RBAC', 'Auditoría', 'Responsive']

export default function LoginPage() {
  useEffect(() => {
    const session = readAuthSession()

    if (session) {
      window.location.replace(getHomeRouteForRole(session.user.rol))
    }
  }, [])

  const handleLogin = async (credentials: LoginRequest) => {
    const response = await login(credentials)

    persistAuthSession(response.data)

    return {
      message: 'Sesion iniciada correctamente.',
      redirectTo: getHomeRouteForRole(response.data.user.rol),
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06131f] text-white animate-fade-in">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#06131f_0%,#0f3042_45%,#081a28_100%)]" />
      <div className="absolute -left-20 top-12 h-72 w-72 rounded-full bg-[#f97316]/15 blur-3xl" />
      <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-7xl flex-col gap-4 px-4 pt-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <a
          href="/"
          className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur transition-colors hover:bg-white/10"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f97316] text-sm font-bold text-white shadow-lg shadow-[#f97316]/20">
            SC
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#f97316]">
              SiCoSe
            </p>
            <p className="text-sm text-slate-300">Navegación principal</p>
          </div>
        </a>

        <RoutePills variant="light" />
      </header>

      <div className="relative mx-auto grid min-h-screen max-w-7xl gap-10 px-4 pb-10 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-12">
        <section className="flex flex-col justify-center gap-8 animate-fade-up">
          <div className="max-w-2xl space-y-6">


            <div className="space-y-4">
              <p className="text-sm font-medium uppercase tracking-[0.35em] text-sky-200/80">
                SiCoSe · Sistema de Cobro de Servicios
              </p>
              <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Acceso seguro al panel principal de la junta auxiliar
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                La pantalla de login concentra una experiencia clara para
                entrar al sistema, validar credenciales y preparar el salto a
                los módulos protegidos sin sacrificar legibilidad ni enfoque.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {highlights.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10 backdrop-blur"
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
