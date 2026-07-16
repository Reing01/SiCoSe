import { useEffect, useMemo, useState } from 'react'
import ThemeToggle from '../../components/ThemeToggle'
import RoutePills from '../../components/RoutePills'
import { Button } from '../../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import { clearAuthSession, readAuthSession } from '../../features/auth/auth.session'
import { exportMonthlyReport, fetchDashboardMetrics } from '../../features/dashboard/dashboard.api'
import type { DashboardMetrics } from '../../features/dashboard/dashboard.types'
import { cn } from '../../lib/utils'
import { useTheme } from '../../features/theme/theme'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; metrics: DashboardMetrics }
  | { kind: 'error'; message: string }

type KpiTone = 'green' | 'yellow' | 'red' | 'blue'

type KpiCard = {
  label: string
  value: string
  detail: string
  tone: KpiTone
  icon: string
}

type ExportFormat = 'pdf' | 'xlsx'

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
      label: 'Recaudado este mes',
      value: formatCurrency(metrics.totalRecaudadoMes),
      detail: `${metrics.pagosRegistradosMes} pagos registrados`,
      tone: metrics.totalRecaudadoMes > 0 ? 'green' : 'yellow',
      icon: '$',
    },
    {
      label: 'Cobertura',
      value: formatPercent(metrics.porcentajeCobertura),
      detail: `${metrics.totalAdeudosMes} adeudos del periodo`,
      tone: getCoverageTone(metrics.porcentajeCobertura),
      icon: '%',
    },
    {
      label: 'Morosos',
      value: String(metrics.numeroMorosos),
      detail: 'Ciudadanos con adeudo pendiente',
      tone: getDebtorTone(metrics.numeroMorosos),
      icon: '!',
    },
    {
      label: 'Vs mes anterior',
      value: formatPercent(metrics.comparativoMesAnterior),
      detail: `Mes anterior ${formatCurrency(metrics.variacion.montoMesAnterior)}`,
      tone:
        metrics.variacion.color === 'verde'
          ? 'green'
          : metrics.variacion.color === 'rojo'
            ? 'red'
            : 'yellow',
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
        direction === 'mejora'
          ? 'border-b-[10px] border-b-emerald-600'
          : 'border-t-[10px] border-t-rose-600',
      )}
      aria-hidden="true"
    />
  )
}

function MetricCard({
  card,
  theme,
}: {
  card: KpiCard
  theme: 'light' | 'dark'
}) {
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
      theme === 'dark'
        ? 'border-rose-900/60 bg-rose-950/60 text-rose-200'
        : 'border-rose-200 bg-rose-50 text-rose-800',
    blue:
      theme === 'dark'
        ? 'border-sky-900/60 bg-sky-950/60 text-sky-200'
        : 'border-sky-200 bg-sky-50 text-sky-800',
  }

  return (
    <Card
      className={cn(
        'shadow-sm',
        theme === 'dark'
          ? 'border-slate-800 bg-slate-900/90 text-slate-100'
          : 'border-slate-200/80 bg-white/95',
      )}
    >
      <CardContent className="flex min-h-40 items-start justify-between gap-4 p-5">
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
              'mt-3 text-3xl font-semibold tracking-tight',
              theme === 'dark' ? 'text-white' : 'text-slate-950',
            )}
          >
            {card.value}
          </p>
          <p
            className={cn(
              'mt-3 text-sm leading-6',
              theme === 'dark' ? 'text-slate-300' : 'text-slate-600',
            )}
          >
            {card.detail}
          </p>
        </div>
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-base font-bold',
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
  exportMessage,
  theme,
}: {
  metrics: DashboardMetrics
  onExport: (format: ExportFormat) => void
  exportFormat: ExportFormat | null
  exportMessage: string | null
  theme: 'light' | 'dark'
}) {
  const cards = useMemo(() => buildCards(metrics), [metrics])

  return (
    <section className="space-y-6">
      <Card
        className={cn(
          'shadow-sm animate-scale-in',
          theme === 'dark'
            ? 'border-slate-800 bg-slate-900/90 text-slate-100'
            : 'border-slate-200/80 bg-white/95',
        )}
      >
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p
              className={cn(
                'text-sm font-semibold uppercase tracking-[0.25em]',
                theme === 'dark' ? 'text-sky-300' : 'text-[#0f3042]',
              )}
            >
              Exportaciones
            </p>
            <p className={cn('text-sm', theme === 'dark' ? 'text-slate-300' : 'text-slate-600')}>
              Descarga el periodo {metrics.periodo} en PDF institucional o como Excel para análisis.
            </p>
            {exportMessage ? (
              <p
                className={cn(
                  'text-sm font-medium',
                  theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700',
                )}
              >
                {exportMessage}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onExport('pdf')}
              disabled={exportFormat !== null}
            >
              {exportFormat === 'pdf' ? 'Generando PDF...' : 'Exportar PDF'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onExport('xlsx')}
              disabled={exportFormat !== null}
            >
              {exportFormat === 'xlsx' ? 'Generando Excel...' : 'Exportar Excel'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard key={card.label} card={card} theme={theme} />
        ))}
      </div>

      <Card
        className={cn(
          'shadow-sm',
          theme === 'dark'
            ? 'border-slate-800 bg-slate-900/90 text-slate-100'
            : 'border-slate-200/80 bg-white/95',
        )}
      >
        <CardHeader>
          <CardTitle className={cn('text-xl', theme === 'dark' ? 'text-white' : 'text-slate-950')}>
            Comparativo mensual
          </CardTitle>
          <CardDescription className={cn(theme === 'dark' ? 'text-slate-300' : 'text-slate-600')}>
            Periodo {metrics.periodo} actualizado para este panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold',
                  metrics.variacion.color === 'verde' &&
                    'border-emerald-200 bg-emerald-50 text-emerald-800',
                  metrics.variacion.color === 'rojo' &&
                    'border-rose-200 bg-rose-50 text-rose-800',
                  metrics.variacion.color === 'amarillo' &&
                    'border-amber-200 bg-amber-50 text-amber-800',
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
              Ultima actualizacion: {formatDateTime(metrics.ultimaActualizacion)}
            </p>
          </div>

          <div
            className={cn(
              'rounded-xl border px-4 py-3 text-right',
              theme === 'dark'
                ? 'border-slate-700 bg-slate-950/60'
                : 'border-slate-200 bg-slate-50',
            )}
          >
            <p
              className={cn(
                'text-xs font-semibold uppercase tracking-[0.25em]',
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500',
              )}
            >
              Cache
            </p>
            <p className={cn('mt-2 text-sm font-semibold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>
              {metrics.cache.hit ? 'Redis activo' : 'Actualizado'}
            </p>
            <p className={cn('mt-1 text-xs', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
              TTL {metrics.cache.ttlSegundos}s
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
  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const { theme } = useTheme()

  const handleLogout = () => {
    clearAuthSession()
    window.location.assign('/login')
  }

  const handleExport = async (format: ExportFormat) => {
    const session = readAuthSession()

    if (!session || state.kind !== 'ready') {
      setExportMessage('Inicia sesión para exportar reportes.')
      return
    }

    setExportMessage(null)
    setExportFormat(format)

    try {
      const exportResult = await exportMonthlyReport(session.token, state.metrics.periodo, format)
      const anchor = document.createElement('a')
      anchor.href = exportResult.archivo_url
      anchor.download = exportResult.archivo_path.split('/').pop() ?? `reporte-${format}`
      anchor.target = '_blank'
      anchor.rel = 'noreferrer'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setExportMessage(
        `Exportación ${format === 'pdf' ? 'PDF' : 'Excel'} lista para ${exportResult.periodo}.`,
      )
    } catch (error) {
      setExportMessage(
        error instanceof Error ? error.message : 'No fue posible generar la exportación.',
      )
    } finally {
      setExportFormat(null)
    }
  }

  useEffect(() => {
    const session = readAuthSession()

    if (!session) {
      setState({
        kind: 'error',
        message: 'Inicia sesion para consultar el dashboard.',
      })
      return
    }

    fetchDashboardMetrics(session.token)
      .then((metrics) => {
        setState({ kind: 'ready', metrics })
      })
      .catch((error: unknown) => {
        setState({
          kind: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'No fue posible cargar las metricas.',
        })
      })
  }, [])

  return (
    <main
      className={cn(
        'min-h-screen animate-fade-in',
        theme === 'dark'
          ? 'bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.9),_transparent_42%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-slate-100'
          : 'bg-[linear-gradient(180deg,#f8fafc_0%,#eef4f8_100%)] text-slate-900',
      )}
    >
      <header className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pt-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <a
          href="/"
          className={cn(
            'inline-flex items-center gap-3 rounded-full px-4 py-2 shadow-sm backdrop-blur transition-colors',
            theme === 'dark'
              ? 'border border-slate-700 bg-slate-900/90 hover:border-sky-500/30 hover:bg-slate-800'
              : 'border border-slate-200 bg-white/90 hover:border-[#0f3042]/20 hover:bg-white',
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f3042] text-sm font-bold text-white shadow-lg shadow-[#0f3042]/15">
            SC
          </div>
          <div className="text-left">
            <p className={cn('text-xs font-semibold uppercase tracking-[0.35em]', theme === 'dark' ? 'text-sky-300' : 'text-[#0f3042]')}>
              SiCoSe
            </p>
            <p className={cn('text-sm', theme === 'dark' ? 'text-slate-300' : 'text-slate-500')}>
              Panel financiero
            </p>
          </div>
        </a>

        <div className="flex flex-wrap items-center gap-3">
          <RoutePills variant={theme === 'dark' ? 'light' : 'dark'} />
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              'inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold transition-colors',
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
          theme === 'dark'
            ? 'border-slate-800 bg-slate-950/75'
            : 'border-slate-200/80 bg-white/75',
        )}
      >
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
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
          <div className="mt-5 max-w-3xl space-y-3">
            <h1 className={cn('text-4xl font-semibold tracking-tight sm:text-5xl', theme === 'dark' ? 'text-white' : 'text-slate-950')}>
              Situacion financiera del mes
            </h1>
            <p className={cn('text-base leading-7', theme === 'dark' ? 'text-slate-300' : 'text-slate-600')}>
              KPIs de recaudacion, cobertura y morosidad para la planeacion de
              la junta auxiliar.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-up">
        {state.kind === 'loading' ? (
          <Card
            className={cn(
              'shadow-sm animate-scale-in',
              theme === 'dark'
                ? 'border-slate-800 bg-slate-900/90 text-slate-100'
                : 'border-slate-200/80 bg-white/95',
            )}
          >
            <CardContent className={cn('p-6 text-sm', theme === 'dark' ? 'text-slate-300' : 'text-slate-600')}>
              Cargando metricas...
            </CardContent>
          </Card>
        ) : null}

        {state.kind === 'error' ? (
          <Card className="border-rose-200 bg-rose-50 shadow-sm animate-scale-in" role="alert" aria-live="polite">
            <CardContent className="flex flex-col gap-4 p-6 text-sm font-medium text-rose-800">
              <p>{state.message}</p>
              <button
                type="button"
                onClick={() => window.location.assign('/login')}
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
            exportMessage={exportMessage}
            theme={theme}
          />
        ) : null}
      </section>
    </main>
  )
}
