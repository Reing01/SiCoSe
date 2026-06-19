import { useEffect, useMemo, useState } from 'react'
import RoutePills from '../../components/RoutePills'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import { readAuthSession } from '../../features/auth/auth.session'
import { fetchDashboardMetrics } from '../../features/dashboard/dashboard.api'
import type { DashboardMetrics } from '../../features/dashboard/dashboard.types'
import { cn } from '../../lib/utils'

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

function MetricCard({ card }: { card: KpiCard }) {
  const toneClasses: Record<KpiTone, string> = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    yellow: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-rose-200 bg-rose-50 text-rose-800',
    blue: 'border-sky-200 bg-sky-50 text-sky-800',
  }

  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-sm">
      <CardContent className="flex min-h-40 items-start justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            {card.label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {card.value}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">{card.detail}</p>
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

function DashboardContent({ metrics }: { metrics: DashboardMetrics }) {
  const cards = useMemo(() => buildCards(metrics), [metrics])

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard key={card.label} card={card} />
        ))}
      </div>

      <Card className="border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Comparativo mensual</CardTitle>
          <CardDescription>
            Periodo {metrics.periodo} actualizado desde el backend operativo.
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
              <span className="text-sm text-slate-500">
                {formatPercent(metrics.comparativoMesAnterior)} contra el mes anterior
              </span>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              Ultima actualizacion: {formatDateTime(metrics.ultimaActualizacion)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Cache
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {metrics.cache.hit ? 'Redis activo' : 'Actualizado'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4f8_100%)] text-slate-900">
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
            <p className="text-sm text-slate-500">Panel financiero</p>
          </div>
        </a>

        <RoutePills variant="dark" />
      </header>

      <section className="border-b border-slate-200/80 bg-white/75 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <span className="inline-flex items-center rounded-full border border-[#0f3042]/10 bg-[#0f3042]/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#0f3042]">
            Dashboard
          </span>
          <div className="mt-5 max-w-3xl space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Situacion financiera del mes
            </h1>
            <p className="text-base leading-7 text-slate-600">
              KPIs de recaudacion, cobertura y morosidad para la planeacion de
              la junta auxiliar.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {state.kind === 'loading' ? (
          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardContent className="p-6 text-sm text-slate-600">
              Cargando metricas...
            </CardContent>
          </Card>
        ) : null}

        {state.kind === 'error' ? (
          <Card className="border-rose-200 bg-rose-50 shadow-sm">
            <CardContent className="p-6 text-sm font-medium text-rose-800">
              {state.message}
            </CardContent>
          </Card>
        ) : null}

        {state.kind === 'ready' ? <DashboardContent metrics={state.metrics} /> : null}
      </section>
    </main>
  )
}
