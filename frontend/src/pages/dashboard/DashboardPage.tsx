import { useEffect, useMemo, useState } from 'react'
import AppLink from '../../components/AppLink'
import BrandMark from '../../components/BrandMark'
import ThemeToggle from '../../components/ThemeToggle'
import RoutePills from '../../components/RoutePills'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { clearAuthSession, readAuthSession } from '../../features/auth/auth.session'
import { logout } from '../../features/auth/auth.api'
import {
  consumePrefetchedDashboardMetrics,
  exportMonthlyReport,
  fetchDashboardMetrics,
} from '../../features/dashboard/dashboard.api'
import type { DashboardMetrics } from '../../features/dashboard/dashboard.types'
import { fetchGeneratedFile } from '../../lib/download'
import { cn } from '../../lib/utils'
import { navigateTo } from '../../lib/navigation'
import { useTheme } from '../../features/theme/theme-context'

type LoadState = { kind: 'loading' } | { kind: 'ready'; metrics: DashboardMetrics } | { kind: 'error'; message: string }

type KpiTone = 'green' | 'yellow' | 'red' | 'blue'

type KpiCard = {
  label: string
  value: string
  detail: string
  tone: KpiTone
  icon: string
}

type ExportFormat = 'pdf' | 'xlsx'
type ExportStatus = {
  tone: 'success' | 'error'
  message: string
}

const DASHBOARD_LOAD_ERROR_MESSAGE =
  'No fue posible cargar la información del panel. Intenta de nuevo.'
const DASHBOARD_EXPORT_ERROR_MESSAGE =
  'No fue posible generar la exportación. Intenta de nuevo.'

const dashboardWorkflow = [
  {
    step: '01',
    title: 'Consulta métricas',
    description:
      'Revisa la recaudación del agua, cobertura y morosidad del periodo seleccionado.',
  },
  {
    step: '02',
    title: 'Exporta el corte',
    description:
      'Descarga el resumen en PDF o Excel para compartirlo o analizarlo.',
  },
  {
    step: '03',
    title: 'Da seguimiento',
    description:
      'Usa el histórico para comparar avances con el mes anterior.',
  },
] as const

const dashboardSignals = [
  'Cobranza de agua',
  'Cobertura',
  'Morosidad',
  'PDF / XLSX',
] as const

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 2,
})

const percentFormatter = new Intl.NumberFormat('es-MX', {
  maximumFractionDigits: 2,
})

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

function formatPercent(value: number) {
  return `${percentFormatter.format(value)}%`
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getCoverageTone(value: number): KpiTone {
  if (value >= 80) {
    return 'green'
  }

  if (value >= 50) {
    return 'yellow'
  }

  return 'red'
}

function getDebtorTone(value: number): KpiTone {
  if (value === 0) {
    return 'green'
  }

  if (value <= 5) {
    return 'yellow'
  }

  return 'red'
}

function buildCards(metrics: DashboardMetrics): KpiCard[] {
  return [
    {
      label: 'Recaudado del agua',
      value: formatCurrency(metrics.totalRecaudadoMes),
      detail: `${metrics.pagosRegistradosMes} pagos registrados`,
      tone: metrics.totalRecaudadoMes > 0 ? 'green' : 'yellow',
      icon: '$',
    },
    {
      label: 'Cobertura',
      value: formatPercent(metrics.porcentajeCobertura),
      detail: `${metrics.adeudosPagadosMes} de ${metrics.totalAdeudosMes} adeudos`,
      tone: getCoverageTone(metrics.porcentajeCobertura),
      icon: '%',
    },
    {
      label: 'Pendiente del agua',
      value:
        metrics.totalPendienteMes === null
          ? 'No disponible'
          : formatCurrency(metrics.totalPendienteMes),
      detail:
        metrics.totalPendienteMes === null
          ? 'Monto pendiente no disponible en esta vista'
          : 'Monto pendiente por cobrar',
      tone:
        metrics.totalPendienteMes === null
          ? 'yellow'
          : metrics.totalPendienteMes === 0
            ? 'green'
            : 'red',
      icon: 'P',
    },
    {
      label: 'Morosos',
      value: String(metrics.numeroMorosos),
      detail: 'Ciudadanos con adeudo de agua pendiente',
      tone: getDebtorTone(metrics.numeroMorosos),
      icon: '!',
    },
    {
      label: 'Pagos capturados',
      value: String(metrics.pagosRegistradosMes),
      detail: `Periodo ${metrics.periodo}`,
      tone: metrics.pagosRegistradosMes > 0 ? 'blue' : 'yellow',
      icon: '#',
    },
    {
      label: 'Vs mes anterior',
      value: formatPercent(metrics.comparativoMesAnterior),
      detail: `Mes anterior ${formatCurrency(metrics.variacion.montoMesAnterior)}`,
      tone: metrics.variacion.color === 'verde' ? 'green' : metrics.variacion.color === 'rojo' ? 'red' : 'yellow',
      icon: '=',
    },
  ]
}

function TrendArrow({ direction }: { direction: DashboardMetrics['variacion']['direccion'] }) {
  if (direction === 'estable') {
    return <span className="h-1.5 w-5 rounded-full bg-amber-500" aria-hidden="true" />
  }

  return (
    <span
      className={cn(
        'h-0 w-0 border-x-[6px] border-x-transparent',
        direction === 'mejora' ? 'border-b-[10px] border-b-emerald-600' : 'border-t-[10px] border-t-rose-600',
      )}
      aria-hidden="true"
    />
  )
}

function RevenueLineChart({ metrics, theme }: { metrics: DashboardMetrics; theme: 'light' | 'dark' }) {
  const values = metrics.historicoRecaudacion
  const max = Math.max(...values.map((point) => point.total), 1)
  const points = values.map((point, index) => {
    const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100
    const y = 90 - (point.total / max) * 75
    return { ...point, x, y }
  })
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <Card className={cn('shadow-sm', theme === 'dark' ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200/80 bg-white/95')}>
      <CardHeader className="space-y-2 p-4 sm:p-5">
        <CardTitle>Recaudación histórica del agua</CardTitle>
        <CardDescription>Últimos 6 meses registrados.</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
        <svg viewBox="0 0 100 100" className="h-52 w-full overflow-visible sm:h-64" role="img" aria-label="Gráfica de recaudación de los últimos 6 meses">
          <polyline points={polyline} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point) => (
            <g key={point.periodo}>
              <circle cx={point.x} cy={point.y} r="2.5" className="fill-[#0f3042] dark:fill-sky-300" />
              <text x={point.x} y="98" textAnchor="middle" className="fill-slate-500 text-[4px]">
                {point.periodo.slice(5)}
              </text>
            </g>
          ))}
        </svg>
      </CardContent>
    </Card>
  )
}

function MetricCard({ card, theme }: { card: KpiCard; theme: 'light' | 'dark' }) {
  const toneClasses: Record<KpiTone, string> = {
    green:
      theme === 'dark'
        ? 'border-emerald-900/60 bg-emerald-950/60 text-emerald-200'
        : 'border-emerald-200 bg-emerald-50 text-emerald-800',
    yellow:
      theme === 'dark'
        ? 'border-amber-900/60 bg-amber-950/60 text-amber-200'
        : 'border-amber-200 bg-amber-50 text-amber-800',
    red:
      theme === 'dark' ? 'border-rose-900/60 bg-rose-950/60 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-800',
    blue: theme === 'dark' ? 'border-sky-900/60 bg-sky-950/60 text-sky-200' : 'border-sky-200 bg-sky-50 text-sky-800',
  }

  return (
    <Card
      className={cn(
        'shadow-sm',
        theme === 'dark' ? 'border-slate-800 bg-slate-900/90 text-slate-100' : 'border-slate-200/80 bg-white/95',
      )}
    >
      <CardContent className="flex min-h-32 items-start justify-between gap-3 p-4 sm:min-h-40 sm:gap-4 sm:p-5">
        <div>
          <p
            className={cn(
              'text-xs font-semibold uppercase tracking-[0.25em]',
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500',
            )}
          >
            {card.label}
          </p>
          <p
            className={cn(
              'mt-2.5 text-2xl font-semibold tracking-tight sm:mt-3 sm:text-3xl',
              theme === 'dark' ? 'text-white' : 'text-slate-950',
            )}
          >
            {card.value}
          </p>
          <p className={cn('mt-2.5 text-sm leading-6 sm:mt-3', theme === 'dark' ? 'text-slate-300' : 'text-slate-600')}>
            {card.detail}
          </p>
        </div>
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold sm:h-11 sm:w-11 sm:text-base',
            toneClasses[card.tone],
          )}
          aria-hidden="true"
        >
          {card.icon}
        </span>
      </CardContent>
    </Card>
  )
}

function DashboardContent({
  metrics,
  onExport,
  exportFormat,
  exportStatus,
  period,
  onPeriodChange,
  currentPeriod,
  theme,
}: {
  metrics: DashboardMetrics
  onExport: (format: ExportFormat) => void
  exportFormat: ExportFormat | null
  exportStatus: ExportStatus | null
  period: string
  onPeriodChange: (period: string) => void
  currentPeriod: string
  theme: 'light' | 'dark'
}) {
  const cards = useMemo(() => buildCards(metrics), [metrics])

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="grid gap-3 lg:grid-cols-[1.08fr_0.92fr]">
        <Card
          className={cn(
            'shadow-sm',
            theme === 'dark'
              ? 'border-slate-800 bg-slate-900/90 text-slate-100'
              : 'border-slate-200/80 bg-white/95',
          )}
        >
          <CardHeader className="space-y-2 border-b border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60 sm:p-5">
            <CardTitle>Resumen del periodo</CardTitle>
            <CardDescription>
              Una vista corta para entender el comportamiento del mes antes de
              exportar o revisar el detalle.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                Periodo
              </p>
              <p className="mt-1.5 text-base font-semibold text-slate-950 dark:text-white sm:mt-2 sm:text-lg">
                {metrics.periodo}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                Cobertura
              </p>
              <p className="mt-1.5 text-base font-semibold text-slate-950 dark:text-white sm:mt-2 sm:text-lg">
                {formatPercent(metrics.porcentajeCobertura)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                Recaudado
              </p>
              <p className="mt-1.5 text-base font-semibold text-slate-950 dark:text-white sm:mt-2 sm:text-lg">
                {formatCurrency(metrics.totalRecaudadoMes)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                Morosos
              </p>
              <p className="mt-1.5 text-base font-semibold text-slate-950 dark:text-white sm:mt-2 sm:text-lg">
                {metrics.numeroMorosos}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'shadow-sm',
            theme === 'dark'
              ? 'border-slate-800 bg-slate-900/90 text-slate-100'
              : 'border-slate-200/80 bg-white/95',
          )}
        >
          <CardHeader className="space-y-2 border-b border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60 sm:p-5">
            <CardTitle>Flujo guiado</CardTitle>
            <CardDescription>
              El panel te lleva de la lectura de métricas a la exportación en
              tres pasos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              {dashboardSignals.map((signal) => (
                <span
                  key={signal}
                  className={cn(
                    'inline-flex min-w-max snap-start items-center rounded-full border px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.22em] sm:text-xs sm:tracking-[0.25em]',
                    theme === 'dark'
                      ? 'border-white/10 bg-white/5 text-slate-200'
                      : 'border-slate-200 bg-white text-slate-600',
                  )}
                >
                  {signal}
                </span>
              ))}
            </div>
            <div className="grid gap-2 sm:gap-3">
              {dashboardWorkflow.map((step) => (
                <article
                  key={step.step}
                  className={cn(
                    'rounded-2xl border p-3.5 sm:p-4',
                    theme === 'dark'
                      ? 'border-slate-800 bg-slate-950/60'
                      : 'border-slate-200 bg-slate-50',
                  )}
                >
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[#f97316] sm:text-xs sm:tracking-[0.35em]">
                    {step.step}
                  </p>
                  <h2 className="mt-1.5 text-sm font-semibold text-slate-950 dark:text-white">
                    {step.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-5 text-slate-600 dark:text-slate-300 sm:leading-6">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card
        className={cn(
          'shadow-sm animate-scale-in',
          theme === 'dark' ? 'border-slate-800 bg-slate-900/90 text-slate-100' : 'border-slate-200/80 bg-white/95',
        )}
      >
        <CardContent className="flex flex-col gap-3 p-4 sm:gap-4 sm:p-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p
              className={cn(
                'text-xs font-semibold uppercase tracking-[0.22em] sm:text-sm sm:tracking-[0.25em]',
                theme === 'dark' ? 'text-sky-300' : 'text-[#0f3042]',
              )}
            >
              Exportaciones
            </p>
            <p className={cn('text-sm', theme === 'dark' ? 'text-slate-300' : 'text-slate-600')}>
              Descarga el periodo {metrics.periodo} en PDF institucional o como Excel para análisis.
            </p>
            {exportStatus ? (
              <p
                role={exportStatus.tone === 'error' ? 'alert' : 'status'}
                aria-live="polite"
                className={cn(
                  'text-sm font-medium',
                  exportStatus.tone === 'success' &&
                    (theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'),
                  exportStatus.tone === 'error' &&
                    (theme === 'dark' ? 'text-rose-300' : 'text-rose-700'),
                )}
              >
                {exportStatus.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Input
              type="month"
              value={period}
              onChange={(event) => onPeriodChange(event.target.value)}
              max={currentPeriod}
              className="h-11 w-full sm:w-44"
              aria-label="Filtrar periodo"
            />
            <Button type="button" variant="outline" onClick={() => onExport('pdf')} disabled={exportFormat !== null} className="w-full sm:w-auto">
              {exportFormat === 'pdf' ? 'Generando documento...' : 'Exportar PDF'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => onExport('xlsx')} disabled={exportFormat !== null} className="w-full sm:w-auto">
              {exportFormat === 'xlsx' ? 'Generando documento...' : 'Exportar Excel'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard key={card.label} card={card} theme={theme} />
        ))}
      </div>

      <RevenueLineChart metrics={metrics} theme={theme} />

      <Card
        className={cn(
          'shadow-sm',
          theme === 'dark' ? 'border-slate-800 bg-slate-900/90 text-slate-100' : 'border-slate-200/80 bg-white/95',
        )}
      >
        <CardHeader className="space-y-2 p-4 sm:p-5">
          <CardTitle className={cn('text-xl', theme === 'dark' ? 'text-white' : 'text-slate-950')}>
            Comparativo mensual
          </CardTitle>
          <CardDescription className={cn(theme === 'dark' ? 'text-slate-300' : 'text-slate-600')}>
            Periodo {metrics.periodo} actualizado para este panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 sm:p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold',
                  metrics.variacion.color === 'verde' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
                  metrics.variacion.color === 'rojo' && 'border-rose-200 bg-rose-50 text-rose-800',
                  metrics.variacion.color === 'amarillo' && 'border-amber-200 bg-amber-50 text-amber-800',
                )}
              >
                <TrendArrow direction={metrics.variacion.direccion} />
                {metrics.variacion.direccion}
              </span>
              <span className={cn('text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                {formatPercent(metrics.comparativoMesAnterior)} contra el mes anterior
              </span>
            </div>
            <p className={cn('text-sm leading-6', theme === 'dark' ? 'text-slate-300' : 'text-slate-600')}>
              Última actualización: {formatDateTime(metrics.ultimaActualizacion)}
            </p>
          </div>

          <div
            className={cn(
              'rounded-xl border px-4 py-3 text-left md:text-right',
              theme === 'dark' ? 'border-slate-700 bg-slate-950/60' : 'border-slate-200 bg-slate-50',
            )}
          >
            <p
              className={cn(
                'text-xs font-semibold uppercase tracking-[0.25em]',
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500',
              )}
            >
              Estado
            </p>
            <p className={cn('mt-2 text-sm font-semibold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
              Informacion disponible
            </p>
            <p className={cn('mt-1 text-xs', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
              Periodo {metrics.periodo}
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

export default function DashboardPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null)
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const currentPeriod = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])
  const { theme } = useTheme()

  useEffect(() => {
    if (!readAuthSession()) {
      navigateTo('/login', true)
    }
  }, [])

  const handleLogout = async () => {
    const session = readAuthSession()

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

  const handleExport = async (format: ExportFormat) => {
    const session = readAuthSession()

    if (!session || state.kind !== 'ready') {
      setExportStatus({
        tone: 'error',
        message: 'Inicia sesión para exportar reportes.',
      })
      return
    }

    setExportStatus(null)
    setExportFormat(format)

    try {
      const exportResult = await exportMonthlyReport(session.token, state.metrics.periodo, format)
      const fileResponse = await fetchGeneratedFile(exportResult.archivo_url, session.token)

      if (!fileResponse?.ok) {
        throw new Error('No fue posible descargar el archivo generado.')
      }

      const blob = await fileResponse.blob()
      const blobUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = exportResult.archivo_path.split('/').pop() ?? `reporte-${format}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(blobUrl)
      setExportStatus({
        tone: 'success',
        message: `Exportación ${format === 'pdf' ? 'PDF' : 'Excel'} lista para ${exportResult.periodo}.`,
      })
    } catch {
      setExportStatus({
        tone: 'error',
        message: DASHBOARD_EXPORT_ERROR_MESSAGE,
      })
    } finally {
      setExportFormat(null)
    }
  }

  useEffect(() => {
    const session = readAuthSession()

    if (!session) {
      setState({
        kind: 'error',
        message: 'Inicia sesión para consultar el dashboard.',
      })
      return
    }

    const prefetchedMetrics = consumePrefetchedDashboardMetrics(
      session.token,
      selectedPeriod,
    )

    if (prefetchedMetrics) {
      setState({ kind: 'ready', metrics: prefetchedMetrics })
      return
    }

    setState({ kind: 'loading' })

    fetchDashboardMetrics(session.token, selectedPeriod)
      .then((metrics) => {
        setState({ kind: 'ready', metrics })
      })
      .catch(() => {
        setState({
          kind: 'error',
          message: DASHBOARD_LOAD_ERROR_MESSAGE,
        })
      })
  }, [selectedPeriod])

  return (
    <main
      className={cn(
        'min-h-screen animate-fade-in',
        theme === 'dark'
          ? 'bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.9),_transparent_42%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-slate-100'
          : 'bg-[linear-gradient(180deg,#f8fafc_0%,#eef4f8_100%)] text-slate-900',
      )}
    >
      <header className="mx-auto grid max-w-7xl gap-3 px-3 pt-3 sm:px-6 sm:pt-5 lg:flex lg:items-center lg:justify-between lg:px-8">
        <AppLink
          href="/"
          className={cn(
            'flex w-full items-center gap-3 rounded-2xl px-4 py-2 shadow-sm backdrop-blur transition-colors sm:rounded-full',
            theme === 'dark'
              ? 'border border-slate-700 bg-slate-900/90 hover:border-sky-500/30 hover:bg-slate-800'
              : 'border border-slate-200 bg-white/90 hover:border-[#0f3042]/20 hover:bg-white',
          )}
        >
          <BrandMark />
          <div className="text-left">
            <p
              className={cn(
                'text-xs font-semibold uppercase tracking-[0.35em]',
                theme === 'dark' ? 'text-sky-300' : 'text-[#0f3042]',
              )}
            >
              SiCoSe
            </p>
            <p className={cn('text-sm', theme === 'dark' ? 'text-slate-300' : 'text-slate-500')}>Panel financiero</p>
          </div>
        </AppLink>

        <div className="grid w-full grid-cols-[auto_auto_minmax(0,1fr)] gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center lg:flex-nowrap">
          <RoutePills variant={theme === 'dark' ? 'light' : 'dark'} />
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              'inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:w-auto',
              theme === 'dark'
                ? 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-rose-500/40 hover:text-rose-300'
                : 'border border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:text-rose-700',
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
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em]',
              theme === 'dark'
                ? 'border border-sky-500/20 bg-sky-500/10 text-sky-300'
                : 'border border-[#0f3042]/10 bg-[#0f3042]/5 text-[#0f3042]',
            )}
          >
            Dashboard
          </span>
          <div className="mt-4 max-w-3xl space-y-2 sm:mt-5 sm:space-y-3">
              <h1
                className={cn(
                  'text-2xl font-semibold tracking-tight sm:text-5xl',
                  theme === 'dark' ? 'text-white' : 'text-slate-950',
                )}
              >
                Situación financiera del cobro de agua
              </h1>
            <p className={cn('text-sm leading-6 sm:text-base sm:leading-7', theme === 'dark' ? 'text-slate-300' : 'text-slate-600')}>
              KPIs de recaudación, cobertura y morosidad del agua para la planeación de la junta auxiliar.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl animate-fade-up px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {state.kind === 'loading' ? (
          <Card
            className={cn(
              'shadow-sm animate-scale-in',
              theme === 'dark' ? 'border-slate-800 bg-slate-900/90 text-slate-100' : 'border-slate-200/80 bg-white/95',
            )}
          >
            <CardContent className={cn('p-6 text-sm', theme === 'dark' ? 'text-slate-300' : 'text-slate-600')}>
              Cargando métricas...
            </CardContent>
          </Card>
        ) : null}

        {state.kind === 'error' ? (
          <Card className="border-rose-200 bg-rose-50 shadow-sm animate-scale-in" role="alert" aria-live="polite">
            <CardContent className="flex flex-col gap-4 p-6 text-sm font-medium text-rose-800">
              <p>{state.message}</p>
              <button
                type="button"
                onClick={() => navigateTo('/login', true)}
                className="inline-flex min-h-11 w-fit items-center rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
              >
                Ir al login
              </button>
            </CardContent>
          </Card>
        ) : null}

        {state.kind === 'ready' ? (
          <DashboardContent
            metrics={state.metrics}
            onExport={handleExport}
            exportFormat={exportFormat}
            exportStatus={exportStatus}
            period={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            currentPeriod={currentPeriod}
            theme={theme}
          />
        ) : null}
      </section>
    </main>
  )
}
