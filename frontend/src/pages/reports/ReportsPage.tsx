import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import AppLink from '../../components/AppLink'
import RoutePills from '../../components/RoutePills'
import ThemeToggle from '../../components/ThemeToggle'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { logout } from '../../features/auth/auth.api'
import { clearAuthSession, readAuthSession } from '../../features/auth/auth.session'
import {
  exportMonthlyReport,
  generateMonthlyReport,
  type MonthlyReportRecord,
  type MonthlyReportSummary,
  type ReportExportFormat,
} from '../../features/reports/report.api'
import { useTheme } from '../../features/theme/theme-context'
import { downloadBlob, fetchGeneratedFile, openBlobInNewTab } from '../../lib/download'
import { navigateTo } from '../../lib/navigation'
import { cn } from '../../lib/utils'
import { formatPeriodLabel } from '../../lib/water-billing'

type ActionState =
  | { kind: 'idle' }
  | { kind: 'loading'; label: string }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value))
}

function createCurrentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function buildFileName(report: MonthlyReportRecord, format: ReportExportFormat) {
  return report.archivo_path.split('/').pop() ?? `reporte-${report.periodo}.${format}`
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {value}
          </p>
        </div>
        <span className="rounded-full border border-[#0f3042]/10 bg-[#0f3042]/5 px-3 py-1 text-xs font-semibold text-[#0f3042] dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300">
          {detail}
        </span>
      </CardContent>
    </Card>
  )
}

function extractSummary(report: MonthlyReportRecord | null): MonthlyReportSummary | null {
  return report?.resumen_json ?? null
}

function ReportArtifactPanel({ report }: { report: MonthlyReportRecord }) {
  const summary = extractSummary(report)

  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
        <CardTitle>Último reporte generado</CardTitle>
        <CardDescription>
          {report.titulo} · {formatDate(report.fecha)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Periodo
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">
              {formatPeriodLabel(Number(report.periodo.slice(0, 4)), Number(report.periodo.slice(5)))}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Formato
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">
              {summary?.formato?.toUpperCase() ?? report.formato?.toUpperCase() ?? 'PDF'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Estado
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">
              {report.estado}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              ID
            </p>
            <p className="mt-2 truncate text-xl font-semibold text-slate-950 dark:text-white">
              {report.id}
            </p>
          </div>
        </div>

        {summary ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Recaudado actual"
                value={formatCurrency(summary.recaudadoActual)}
                detail="Mes elegido"
              />
              <SummaryCard
                label="Recaudado anterior"
                value={formatCurrency(summary.recaudadoAnterior)}
                detail={`Periodo ${summary.periodoAnterior}`}
              />
              <SummaryCard
                label="Cartera vencida"
                value={formatCurrency(summary.carteraVencida)}
                detail="Adeudos morosos"
              />
              <SummaryCard
                label="Morosos"
                value={String(summary.morosos)}
                detail="Top vencidos"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
                  Recaudación por servicio
                </div>
                <div className="max-h-96 overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-950/95 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Servicio</th>
                        <th className="px-4 py-3 font-semibold">Pagos</th>
                        <th className="px-4 py-3 font-semibold">Recaudado</th>
                        <th className="px-4 py-3 font-semibold">Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.recaudacionPorServicio.length > 0 ? (
                        summary.recaudacionPorServicio.map((row) => (
                          <tr
                            key={row.servicioId}
                            className="border-t border-slate-100 dark:border-slate-800"
                          >
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                              {row.servicio}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                              {row.pagos}
                            </td>
                            <td className="px-4 py-3 font-semibold text-[#0f3042] dark:text-sky-300">
                              {formatCurrency(row.recaudado)}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                              {formatCurrency(row.promedio)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                          >
                            No hay datos por servicio para este periodo.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
                  Top morosos
                </div>
                <div className="max-h-96 overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-950/95 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Ciudadano</th>
                        <th className="px-4 py-3 font-semibold">Servicio</th>
                        <th className="px-4 py-3 font-semibold">Periodo</th>
                        <th className="px-4 py-3 font-semibold">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.topMorosos.length > 0 ? (
                        summary.topMorosos.map((row) => (
                          <tr
                            key={row.id}
                            className="border-t border-slate-100 dark:border-slate-800"
                          >
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-900 dark:text-white">
                                {row.ciudadano.nombre} {row.ciudadano.apellido}
                              </p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {row.ciudadano.clave_catastral}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                              {row.servicio.nombre}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                              {row.periodo}
                            </td>
                            <td className="px-4 py-3 font-semibold text-[#0f3042] dark:text-sky-300">
                              {formatCurrency(row.monto)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                          >
                            No hay morosos para este periodo.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

async function presentReportArtifact(
  report: MonthlyReportRecord,
  format: ReportExportFormat,
) {
  const response = await fetchGeneratedFile(report.archivo_url)

  if (!response?.ok) {
    throw new Error('No fue posible descargar el archivo generado.')
  }

  const blob = await response.blob()
  const fileName = buildFileName(report, format)

  if (format === 'pdf') {
    openBlobInNewTab(blob, fileName)
  } else {
    downloadBlob(blob, fileName)
  }
}

export default function ReportsPage() {
  const session = readAuthSession()
  const { theme } = useTheme()
  const [period, setPeriod] = useState(() => createCurrentPeriod())
  const currentPeriod = useMemo(() => createCurrentPeriod(), [])
  const [actionState, setActionState] = useState<ActionState>({ kind: 'idle' })
  const [latestReport, setLatestReport] = useState<MonthlyReportRecord | null>(
    null,
  )

  useEffect(() => {
    if (!session) {
      navigateTo('/login', true)
    }
  }, [session])

  const latestSummary = useMemo(
    () => latestReport?.resumen_json ?? null,
    [latestReport],
  )

  const handleLogout = async () => {
    try {
      if (session) {
        await logout(session.token)
      }
    } catch {
      // La sesión local debe cerrarse aunque el backend ya no acepte el token.
    } finally {
      clearAuthSession()
      navigateTo('/login', true)
    }
  }

  const handlePeriodChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPeriod(event.target.value)
    setActionState({ kind: 'idle' })
  }

  const runAction = async (
    label: string,
    runner: (
      token: string,
      selectedPeriod: string,
      formato: ReportExportFormat,
    ) => Promise<MonthlyReportRecord>,
    format: ReportExportFormat = 'pdf',
  ) => {
    if (!session) {
      setActionState({
        kind: 'error',
        message: 'Inicia sesión para generar reportes.',
      })
      return
    }

    setActionState({ kind: 'loading', label })

    try {
      const report = await runner(session.token, period, format)
      const normalizedReport =
        format === 'pdf' || report.formato ? report : { ...report, formato: format }

      setLatestReport(normalizedReport)
      await presentReportArtifact(normalizedReport, format)

      setActionState({
        kind: 'success',
        message:
          format === 'pdf'
            ? `Reporte mensual ${period} listo para abrir o imprimir.`
            : `Exportación ${format.toUpperCase()} del periodo ${period} lista.`,
      })
    } catch (error) {
      setActionState({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No fue posible generar el reporte.',
      })
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
            <p className={cn('text-sm', theme === 'dark' ? 'text-slate-300' : 'text-slate-500')}>
              Reportes
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
          theme === 'dark' ? 'border-slate-800 bg-slate-950/75' : 'border-slate-200/80 bg-white/75',
        )}
      >
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="max-w-3xl space-y-4">
              <p
                className={cn(
                  'text-sm font-semibold uppercase tracking-[0.35em]',
                  theme === 'dark' ? 'text-sky-300' : 'text-slate-500',
                )}
              >
                SiCoSe · Reportes mensuales
              </p>
              <h1
                className={cn(
                  'text-4xl font-semibold tracking-tight sm:text-5xl',
                  theme === 'dark' ? 'text-white' : 'text-slate-950',
                )}
              >
                Genera, exporta e imprime reportes operativos
              </h1>
              <p
                className={cn(
                  'text-base leading-7',
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-600',
                )}
              >
                Esta pantalla centraliza el reporte mensual de recaudación con
                comparativo, cartera vencida, recaudación por servicio y top de
                morosos.
              </p>
            </div>

            <div
              className={cn(
                'rounded-[2rem] border p-5 shadow-sm',
                theme === 'dark' ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-slate-50',
              )}
            >
              <p
                className={cn(
                  'text-sm font-semibold uppercase tracking-[0.3em]',
                  theme === 'dark' ? 'text-sky-300' : 'text-[#0f3042]',
                )}
              >
                Acciones
              </p>
              <ul
                className={cn(
                  'mt-4 space-y-3 text-sm leading-6',
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-600',
                )}
              >
                <li>- Generar reporte mensual en PDF</li>
                <li>- Exportar el mismo periodo en PDF o Excel</li>
                <li>- Abrir e imprimir el archivo descargado</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-up">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Periodo activo"
            value={formatPeriodLabel(Number(period.slice(0, 4)), Number(period.slice(5)))}
            detail="A generar"
          />
          <SummaryCard label="Formatos" value="PDF / XLSX" detail="Soportados" />
          <SummaryCard
            label="Cierre operativo"
            value={latestSummary ? 'Listo' : 'Pendiente'}
            detail="Resumen"
          />
          <SummaryCard
            label="Último estado"
            value={actionState.kind === 'success' ? 'Éxito' : actionState.kind === 'error' ? 'Error' : 'En espera'}
            detail="Acción reciente"
          />
        </div>

        {actionState.kind !== 'idle' ? (
          <Card
            className={cn(
              'mt-6 shadow-sm',
              actionState.kind === 'success'
                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/50'
                : actionState.kind === 'error'
                  ? 'border-rose-200 bg-rose-50'
                  : 'border-sky-200 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950/50',
            )}
          >
            <CardContent
              role={actionState.kind === 'error' ? 'alert' : 'status'}
              aria-live="polite"
              className={cn(
                'p-4 text-sm',
                actionState.kind === 'success'
                  ? 'text-emerald-900 dark:text-emerald-100'
                  : actionState.kind === 'error'
                    ? 'text-rose-800 dark:text-rose-100'
                    : 'text-sky-900 dark:text-sky-100',
              )}
            >
              {actionState.kind === 'loading'
                ? `${actionState.label}...`
                : actionState.message}
            </CardContent>
          </Card>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="overflow-hidden border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
              <CardTitle>Generación y exportación</CardTitle>
              <CardDescription>
                Elige el periodo y ejecuta el reporte mensual que necesites.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="space-y-2">
                <Label htmlFor="period">Periodo</Label>
                <Input
                  id="period"
                  type="month"
                  value={period}
                  onChange={handlePeriodChange}
                  max={currentPeriod}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  onClick={() => runAction('Generando reporte PDF', generateMonthlyReport, 'pdf')}
                  disabled={actionState.kind === 'loading'}
                >
                  {actionState.kind === 'loading' && actionState.label.startsWith('Generando')
                    ? 'Generando...'
                    : 'Generar reporte'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => runAction('Exportando PDF', exportMonthlyReport, 'pdf')}
                  disabled={actionState.kind === 'loading'}
                >
                  {actionState.kind === 'loading' && actionState.label.startsWith('Exportando PDF')
                    ? 'Exportando...'
                    : 'Exportar PDF'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => runAction('Exportando Excel', exportMonthlyReport, 'xlsx')}
                  disabled={actionState.kind === 'loading'}
                  className="sm:col-span-2"
                >
                  {actionState.kind === 'loading' && actionState.label.startsWith('Exportando Excel')
                    ? 'Exportando...'
                    : 'Exportar Excel'}
                </Button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                El reporte integra la recaudación del periodo, la cartera
                vencida, el comparativo contra el mes anterior y los principales
                morosos para facilitar la revisión operativa.
              </div>
            </CardContent>
          </Card>

          {latestReport ? (
            <ReportArtifactPanel report={latestReport} />
          ) : (
            <Card className="border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
              <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
                <CardTitle>Vista previa del resumen</CardTitle>
                <CardDescription>
                  Cuando generes un reporte verás aquí el resumen operativo.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                  Genera el reporte para revisar recaudación por servicio, cartera
                  vencida y los top morosos del periodo seleccionado.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </main>
  )
}
