import CitizenManagementPanel from '../../features/citizens/CitizenManagementPanel'
import RoutePills from '../../components/RoutePills'
import { clearAuthSession } from '../../features/auth/auth.session'

export default function CitizenManagementPage() {
  const handleLogout = () => {
    clearAuthSession()
    window.location.assign('/login')
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,48,66,0.12),_transparent_42%),linear-gradient(180deg,#f8fafc_0%,#eef4f8_100%)] text-slate-900 animate-fade-in">
      <header className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pt-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <a
          href="/"
          className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-4 py-2 shadow-sm backdrop-blur transition-colors hover:border-[#0f3042]/20 hover:bg-white"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f3042] text-sm font-bold text-white shadow-lg shadow-[#0f3042]/15">
            SC
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#0f3042]">
              SiCoSe
            </p>
            <p className="text-sm text-slate-500">Navegación de evaluación</p>
          </div>
        </a>

        <div className="flex flex-wrap items-center gap-3">
          <RoutePills variant="dark" />
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-rose-200 hover:text-rose-700"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <section className="border-b border-slate-200/80 bg-white/75 backdrop-blur animate-fade-up">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <span className="inline-flex items-center rounded-full border border-[#0f3042]/10 bg-[#0f3042]/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#0f3042]">
            ACT-7 - Issue #009
          </span>

          <div className="mt-5 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="max-w-3xl space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
                SiCoSe - Padron digital
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Gestion de ciudadanos con busqueda, edicion y validacion local
              </h1>
              <p className="text-base leading-7 text-slate-600">
                Esta vista centraliza el registro de ciudadanos para revisar
                datos de contacto, editar informacion y validar formularios
                antes de integrarlos con el backend real.
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0f3042]">
                Alcance del bloque
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>- Busqueda por nombre, correo o clave catastral</li>
                <li>- Filtros rapidos por estado del registro</li>
                <li>- Alta, edicion y eliminacion local con validacion</li>
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
