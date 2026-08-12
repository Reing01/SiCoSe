import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useId, useMemo, useState } from 'react'
import { Button } from '../../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useToast } from '../../components/ui/toast-context'
import { cn } from '../../lib/utils'
import { useMediaQuery } from '../../lib/use-media-query'
import {
  MONTHLY_WATER_FEE_MXN,
  buildMonthlyPeriods,
  isWaterServiceName,
  formatPeriodLabel,
} from '../../lib/water-billing'
import { readAuthSession } from '../auth/auth.session'
import {
  fetchCitizenHistory,
  type CitizenHistoryPaymentRecord,
} from './citizen-history.api'
import {
  createCitizen,
  deactivateCitizen,
  fetchCitizenPage,
  updateCitizen,
} from './citizen.api'
import {
  normalizeCitizenForm,
  validateCitizenForm,
} from './citizen-form.validation'
import type {
  CitizenFieldName,
  CitizenFilter,
  CitizenFormValues,
  CitizenPageMetadata,
  CitizenRecord,
} from './citizen.types'

type SubmissionState =
  | { kind: 'idle' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

type StatusTone = 'success' | 'warning' | 'muted'
type MonthlyStatusTone = 'paid' | 'partial' | 'pending' | 'missing'

type SummaryCardProps = {
  label: string
  value: string
  detail: string
}

type CitizenHistoryState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | {
      kind: 'ready'
      citizenId: string
      citizenName: string
      history: {
        adeudos: Array<{
          id: string
          periodo: string
          monto: number
          estado: string
          pagado: boolean
          servicio: {
            nombre: string
          }
        }>
        pagos: CitizenHistoryPaymentRecord[]
      }
    }
  | { kind: 'error'; message: string }

const DEFAULT_FORM_VALUES: CitizenFormValues = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  direccion: '',
  claveCatastral: '',
}

const DEFAULT_TOUCHED: Record<CitizenFieldName, boolean> = {
  nombre: false,
  apellido: false,
  email: false,
  telefono: false,
  direccion: false,
  claveCatastral: false,
}

const FILTER_OPTIONS: Array<{
  value: CitizenFilter
  label: string
}> = [
  { value: 'all', label: 'Todos' },
  { value: 'complete', label: 'Completos' },
  { value: 'attention', label: 'Requieren atencion' },
]

const DEFAULT_PAGE_SIZE = 10

function createEmptyFormValues(): CitizenFormValues {
  return { ...DEFAULT_FORM_VALUES }
}

function recordToFormValues(record: CitizenRecord): CitizenFormValues {
  return {
    nombre: record.nombre,
    apellido: record.apellido,
    email: record.email,
    telefono: record.telefono,
    direccion: record.direccion,
    claveCatastral: record.claveCatastral,
  }
}

function isCitizenComplete(record: CitizenRecord) {
  return record.telefono.trim().length > 0 && record.direccion.trim().length > 0
}

function getCitizenStatus(record: CitizenRecord): {
  tone: StatusTone
  label: string
  detail: string
} {
  if (!record.activo) {
    return {
      tone: 'muted',
      label: 'Inactivo',
      detail: 'Baja logica aplicada',
    }
  }

  if (isCitizenComplete(record)) {
    return {
      tone: 'success',
      label: 'Completo',
      detail: 'Telefono y direccion registrados',
    }
  }

  return {
    tone: 'warning',
    label: 'Requiere atencion',
    detail: 'Faltan datos de contacto',
  }
}

function createEmptyMetadata(): CitizenPageMetadata {
  return {
    total: 0,
    pagina: 1,
    limite: DEFAULT_PAGE_SIZE,
    totalPaginas: 1,
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value)
}

function SummaryCard({ label, value, detail }: SummaryCardProps) {
  return (
    <Card className="border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
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

type MonthlyHistoryRow = {
  key: string
  year: number
  month: number
  monthLabel: string
  expected: number
  paid: number
  pending: number
  paymentCount: number
  tone: MonthlyStatusTone
}

function CitizenMonthlyHistoryPanel({
  selectedCitizen,
  historyState,
}: {
  selectedCitizen: CitizenRecord | null
  historyState: CitizenHistoryState
}) {
  const periods = useMemo(() => buildMonthlyPeriods(2025, 1, new Date()), [])

  const monthlyRows = useMemo<MonthlyHistoryRow[]>(() => {
    if (historyState.kind !== 'ready') {
      return []
    }

    const waterAdeudos = historyState.history.adeudos.filter((adeudo) =>
      isWaterServiceName(adeudo.servicio.nombre),
    )
    const relevantAdeudos = waterAdeudos.length > 0 ? waterAdeudos : historyState.history.adeudos

    const paymentsByPeriod = new Map<string, number>()
    const paymentCountByPeriod = new Map<string, number>()

    for (const payment of historyState.history.pagos) {
      if (waterAdeudos.length > 0 && !isWaterServiceName(payment.adeudo.servicio.nombre)) {
        continue
      }

      const periodKey = payment.adeudo.periodo
      paymentsByPeriod.set(periodKey, (paymentsByPeriod.get(periodKey) ?? 0) + payment.monto)
      paymentCountByPeriod.set(periodKey, (paymentCountByPeriod.get(periodKey) ?? 0) + 1)
    }

    return periods.map((period) => {
      const periodAdeudos = relevantAdeudos.filter((adeudo) => adeudo.periodo === period.key)
      const paid = paymentsByPeriod.get(period.key) ?? 0
      const paymentCount = paymentCountByPeriod.get(period.key) ?? 0
      const expected = MONTHLY_WATER_FEE_MXN
      const pending = Math.max(0, expected - paid)
      const tone: MonthlyStatusTone =
        periodAdeudos.length === 0
          ? 'missing'
          : paid >= expected
            ? 'paid'
            : paid > 0
              ? 'partial'
              : 'pending'

      return {
        key: period.key,
        year: period.year,
        month: period.month,
        monthLabel: period.fullLabel,
        expected,
        paid,
        pending,
        paymentCount,
        tone,
      }
    })
  }, [historyState, periods])

  const groupedRows = useMemo(() => {
    return monthlyRows.reduce<Record<number, MonthlyHistoryRow[]>>((accumulator, row) => {
      accumulator[row.year] ??= []
      accumulator[row.year].push(row)
      return accumulator
    }, {})
  }, [monthlyRows])

  const summary = useMemo(() => {
    const paid = monthlyRows.filter((row) => row.tone === 'paid').length
    const partial = monthlyRows.filter((row) => row.tone === 'partial').length
    const pending = monthlyRows.filter((row) => row.tone === 'pending').length
    const missing = monthlyRows.filter((row) => row.tone === 'missing').length
    const totalPaid = monthlyRows.reduce((sum, row) => sum + row.paid, 0)
    const totalPending = monthlyRows.reduce((sum, row) => sum + row.pending, 0)

    return {
      paid,
      partial,
      pending,
      missing,
      totalPaid,
      totalPending,
    }
  }, [monthlyRows])

  const toneClasses: Record<MonthlyStatusTone, string> = {
    paid: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-200',
    partial: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-200',
    pending: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-200',
    missing: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  }

  if (!selectedCitizen) {
    return (
      <Card className="border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
          <CardTitle>Historial mensual 2025-2026</CardTitle>
          <CardDescription>
            Selecciona un ciudadano para ver su calendario de pagos.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
            El panel mostrara cada mes desde enero de 2025 hasta el mes actual,
            con la cuota de agua de {formatCurrency(MONTHLY_WATER_FEE_MXN)} por
            mes.
          </div>
        </CardContent>
      </Card>
    )
  }

  if (historyState.kind === 'loading') {
    return (
      <Card className="border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
          <CardTitle>Historial mensual 2025-2026</CardTitle>
          <CardDescription>Cargando meses pagados y pendientes...</CardDescription>
        </CardHeader>
        <CardContent className="p-5 text-sm text-slate-600 dark:text-slate-300">
          Buscando movimientos del ciudadano seleccionado.
        </CardContent>
      </Card>
    )
  }

  if (historyState.kind === 'error') {
    return (
      <Card className="border-rose-200 bg-rose-50 shadow-sm">
        <CardHeader className="border-b border-rose-100 bg-rose-50">
          <CardTitle>Historial mensual 2025-2026</CardTitle>
          <CardDescription className="text-rose-700">
            No fue posible cargar la información mensual.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 text-sm text-rose-800">
          {historyState.message}
        </CardContent>
      </Card>
    )
  }

  if (historyState.kind !== 'ready') {
    return null
  }

  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Historial mensual 2025-2026</CardTitle>
            <CardDescription className="mt-1">
              {historyState.citizenName} · {formatPeriodLabel(2025, 1)} hasta{' '}
              {formatPeriodLabel(new Date().getFullYear(), new Date().getMonth() + 1)}
            </CardDescription>
          </div>
          <span className="rounded-full border border-[#0f3042]/10 bg-[#0f3042]/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#0f3042] dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300">
            {formatCurrency(MONTHLY_WATER_FEE_MXN)} / mes
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            label="Meses pagados"
            value={String(summary.paid)}
            detail="Cubiertos"
          />
          <SummaryCard
            label="Pagos parciales"
            value={String(summary.partial)}
            detail="En proceso"
          />
          <SummaryCard
            label="Meses pendientes"
            value={String(summary.pending)}
            detail="Saldo abierto"
          />
          <SummaryCard
            label="Meses sin carga"
            value={String(summary.missing)}
            detail="Sin adeudo"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Total estimado pagado
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
              {formatCurrency(summary.totalPaid)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Total estimado pendiente
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
              {formatCurrency(summary.totalPending)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Cuota mensual
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
              {formatCurrency(MONTHLY_WATER_FEE_MXN)}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {Object.keys(groupedRows)
            .map(Number)
            .sort((left, right) => left - right)
            .map((year) => (
              <section key={year} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                    {year}
                  </h3>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {groupedRows[year].length} meses
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {groupedRows[year].map((row) => (
                    <article
                      key={row.key}
                      className={cn(
                        'rounded-2xl border p-4 shadow-sm',
                        toneClasses[row.tone],
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-80">
                            {row.monthLabel}
                          </p>
                          <p className="mt-2 text-lg font-semibold">
                            {formatCurrency(row.expected)}
                          </p>
                        </div>
                        <span className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]">
                          {row.tone === 'paid'
                            ? 'Pagado'
                            : row.tone === 'partial'
                              ? 'Parcial'
                              : row.tone === 'pending'
                                ? 'Pendiente'
                                : 'Sin carga'}
                        </span>
                      </div>
                      <div className="mt-4 space-y-1 text-sm">
                        <p>Pagado: {formatCurrency(row.paid)}</p>
                        <p>Pendiente: {formatCurrency(row.pending)}</p>
                        <p>Movimientos: {row.paymentCount}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function CitizenManagementPanel() {
  const isCompactLayout = useMediaQuery('(max-width: 639px)')
  const searchId = useId()
  const nombreId = useId()
  const apellidoId = useId()
  const emailId = useId()
  const telefonoId = useId()
  const direccionId = useId()
  const claveCatastralId = useId()
  const statusId = useId()
  const { addToast } = useToast()

  const [citizens, setCitizens] = useState<CitizenRecord[]>([])
  const [metadata, setMetadata] = useState<CitizenPageMetadata>(
    createEmptyMetadata,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingCitizenId, setDeletingCitizenId] = useState<string | null>(
    null,
  )
  const [reloadKey, setReloadKey] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeFilter, setActiveFilter] = useState<CitizenFilter>('all')
  const [selectedCitizenId, setSelectedCitizenId] = useState<string | null>(
    null,
  )
  const [values, setValues] = useState<CitizenFormValues>(createEmptyFormValues)
  const [touched, setTouched] =
    useState<Record<CitizenFieldName, boolean>>(DEFAULT_TOUCHED)
  const [submissionState, setSubmissionState] = useState<SubmissionState>({
    kind: 'idle',
  })
  const [historyState, setHistoryState] = useState<CitizenHistoryState>({
    kind: 'idle',
  })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim())
      setCurrentPage(1)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    const session = readAuthSession()
    const selectedCitizen =
      selectedCitizenId == null
        ? null
        : (citizens.find((record) => record.id === selectedCitizenId) ?? null)

    if (!session || !selectedCitizen) {
      setHistoryState({ kind: 'idle' })
      return
    }

    let cancelled = false
    setHistoryState({ kind: 'loading' })

    fetchCitizenHistory(session.token, selectedCitizen.id)
      .then((history) => {
        if (cancelled) {
          return
        }

        setHistoryState({
          kind: 'ready',
          citizenId: selectedCitizen.id,
          citizenName: `${selectedCitizen.nombre} ${selectedCitizen.apellido}`.trim(),
          history: {
            adeudos: history.adeudos.map((adeudo) => ({
              id: adeudo.id,
              periodo: adeudo.periodo,
              monto: adeudo.monto,
              estado: adeudo.estado,
              pagado: adeudo.pagado,
              servicio: {
                nombre: adeudo.servicio.nombre,
              },
            })),
            pagos: history.pagos,
          },
        })
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setHistoryState({
          kind: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'No fue posible cargar el historial mensual.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [citizens, selectedCitizenId])

  useEffect(() => {
    const session = readAuthSession()

    if (!session) {
      setIsLoading(false)
      setLoadError('Inicia sesión para consultar el padrón de ciudadanos.')
      return
    }

    let cancelled = false
    setIsLoading(true)
    setLoadError(null)

    fetchCitizenPage(session.token, {
      pagina: currentPage,
      limite: DEFAULT_PAGE_SIZE,
      nombre: debouncedSearchTerm,
      incluirInactivos: true,
    })
      .then(({ records, metadata: nextMetadata }) => {
        if (!cancelled) {
          setCitizens(records)
          setMetadata(nextMetadata)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'No fue posible cargar el padrón de ciudadanos.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [currentPage, debouncedSearchTerm, reloadKey])

  const selectedCitizen =
    selectedCitizenId == null
      ? null
      : (citizens.find((record) => record.id === selectedCitizenId) ?? null)

  const fieldErrors = validateCitizenForm(values)
  const visibleCitizens = citizens.filter((record) => {
    const status = isCitizenComplete(record)
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'complete' && status && record.activo) ||
      (activeFilter === 'attention' && !status && record.activo)

    return matchesFilter
  })

  const activeCitizens = citizens.filter((record) => record.activo)
  const inactiveCitizens = citizens.length - activeCitizens.length
  const completeCitizens = activeCitizens.filter(isCitizenComplete)
  const attentionCitizens = activeCitizens.length - completeCitizens.length
  const hasVisibleErrors = Boolean(
    (touched.nombre && fieldErrors.nombre) ||
    (touched.apellido && fieldErrors.apellido) ||
    (touched.email && fieldErrors.email) ||
    (touched.telefono && fieldErrors.telefono) ||
    (touched.direccion && fieldErrors.direccion) ||
    (touched.claveCatastral && fieldErrors.claveCatastral),
  )

  const handleFieldChange =
    (field: CitizenFieldName) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value

      setValues((current) => ({
        ...current,
        [field]: nextValue,
      }))

      if (submissionState.kind !== 'idle') {
        setSubmissionState({ kind: 'idle' })
      }
    }

  const handleFieldBlur = (field: CitizenFieldName) => () => {
    setTouched((current) => ({
      ...current,
      [field]: true,
    }))
  }

  const resetForm = (message?: string) => {
    setSelectedCitizenId(null)
    setValues(createEmptyFormValues())
    setTouched(DEFAULT_TOUCHED)
    setSubmissionState(
      message
        ? {
            kind: 'success',
            message,
          }
        : { kind: 'idle' },
    )
  }

  const handleSelectCitizen = (record: CitizenRecord) => {
    setSelectedCitizenId(record.id)
    setValues(recordToFormValues(record))
    setTouched(DEFAULT_TOUCHED)
    setSubmissionState({ kind: 'idle' })
  }

  const handleDeleteCitizen = async (record: CitizenRecord) => {
    const session = readAuthSession()

    if (!session) {
      addToast({
        tone: 'warning',
        title: 'Sesión requerida',
        message: 'Inicia sesión para eliminar ciudadanos.',
      })
      return
    }

    if (
      !window.confirm(
        `¿Desactivar a ${record.nombre} ${record.apellido} del padrón?`,
      )
    ) {
      return
    }

    setDeletingCitizenId(record.id)

    try {
      await deactivateCitizen(session.token, record.id)
      setCitizens((current) =>
        current.map((citizen) =>
          citizen.id === record.id ? { ...citizen, activo: false } : citizen,
        ),
      )

      const message = 'Ciudadano eliminado correctamente.'

      if (selectedCitizenId === record.id) {
        resetForm(message)
      } else {
        setSubmissionState({ kind: 'success', message })
      }

      addToast({ tone: 'success', title: 'Ciudadano eliminado', message })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible eliminar al ciudadano.'

      setSubmissionState({ kind: 'error', message })
      addToast({ tone: 'warning', title: 'No se pudo eliminar', message })
    } finally {
      setDeletingCitizenId(null)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedValues = normalizeCitizenForm(values)
    const nextTouched: Record<CitizenFieldName, boolean> = {
      nombre: true,
      apellido: true,
      email: true,
      telefono: true,
      direccion: true,
      claveCatastral: true,
    }

    setTouched(nextTouched)

    const nextErrors = validateCitizenForm(normalizedValues)

    if (Object.keys(nextErrors).length > 0) {
      setSubmissionState({
        kind: 'error',
        message: 'Corrige los campos marcados para continuar.',
      })
      addToast({
        tone: 'warning',
        title: 'Formulario con pendientes',
        message: 'Completa los campos obligatorios antes de guardar.',
      })
      return
    }

    const session = readAuthSession()

    if (!session) {
      setSubmissionState({
        kind: 'error',
        message: 'Inicia sesión para guardar ciudadanos.',
      })
      return
    }

    const existingCitizen =
      selectedCitizenId == null
        ? null
        : (citizens.find((record) => record.id === selectedCitizenId) ?? null)
    const isEditing = existingCitizen !== null
    setIsSaving(true)

    try {
      const savedCitizen =
        isEditing && existingCitizen
          ? await updateCitizen(
              session.token,
              existingCitizen.id,
              normalizedValues,
            )
          : await createCitizen(session.token, normalizedValues)

      setCitizens((current) =>
        isEditing
          ? current.map((record) =>
              record.id === savedCitizen.id ? savedCitizen : record,
            )
          : [...current, savedCitizen],
      )
      setSelectedCitizenId(savedCitizen.id)
      setValues(recordToFormValues(savedCitizen))
      setTouched(DEFAULT_TOUCHED)

      const successMessage = isEditing
        ? 'Ciudadano actualizado correctamente.'
        : 'Ciudadano creado correctamente.'

      setSubmissionState({ kind: 'success', message: successMessage })
      addToast({
        tone: 'success',
        title: isEditing ? 'Ciudadano actualizado' : 'Ciudadano creado',
        message: successMessage,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible guardar al ciudadano.'

      setSubmissionState({ kind: 'error', message })
      addToast({ tone: 'warning', title: 'No se pudo guardar', message })
    } finally {
      setIsSaving(false)
    }
  }

  const statusToneClasses: Record<StatusTone, string> = {
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-200',
    warning:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-200',
    muted:
      'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total ciudadanos"
          value={String(metadata.total)}
          detail="Padrón real"
        />
        <SummaryCard
          label="Perfiles completos"
          value={String(completeCitizens.length)}
          detail="Contacto listo"
        />
        <SummaryCard
          label="Requieren atencion"
          value={String(attentionCitizens)}
          detail="Faltan datos"
        />
        <SummaryCard
          label="Inactivos"
          value={String(inactiveCitizens)}
          detail="Baja logica"
        />
      </div>

      <div className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#0f3042] dark:text-sky-300">
              Busqueda y filtros
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Busca por nombre, apellido, correo, direccion o clave catastral y
              filtra los ciudadanos que necesitan revision.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={activeFilter === option.value ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
                onClick={() => setActiveFilter(option.value)}
                aria-pressed={activeFilter === option.value}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-2">
            <Label htmlFor={searchId} className="sr-only">
              Buscar ciudadano
            </Label>
            <Input
              id={searchId}
              type="search"
              placeholder="Buscar por nombre, correo o clave catastral"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => resetForm()}>
              Nuevo ciudadano
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSearchTerm('')
                setActiveFilter('all')
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>
            Mostrando {visibleCitizens.length} de {metadata.total} registros
          </span>
          <span>
            Pagina {metadata.pagina} de {Math.max(metadata.totalPaginas, 1)}
          </span>
          {debouncedSearchTerm ? (
            <span>Busqueda: {debouncedSearchTerm}</span>
          ) : null}
          <span className="hidden h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 sm:inline-flex" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-slate-900/90">
          <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
            <CardTitle>Padron de ciudadanos</CardTitle>
            <CardDescription>
              Selecciona un registro para editarlo o elimina un ciudadano cuando
              ya no forme parte del padrón.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isCompactLayout && (<div className="space-y-3 p-4">
              {isLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                  Cargando padrón de ciudadanos...
                </div>
              ) : null}

              {!isLoading && loadError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
                  <p role="alert">{loadError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => setReloadKey((current) => current + 1)}
                  >
                    Reintentar
                  </Button>
                </div>
              ) : null}

              {!isLoading && !loadError && visibleCitizens.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                  No se encontraron ciudadanos con los filtros actuales.
                </div>
              ) : null}

              {!isLoading &&
                !loadError &&
                visibleCitizens.map((record) => {
                  const status = getCitizenStatus(record)
                  const isSelected = selectedCitizenId === record.id

                  return (
                    <article
                      key={record.id}
                      className={cn(
                        'rounded-2xl border p-4 shadow-sm',
                        isSelected && 'border-[#f97316] bg-[#f97316]/5 dark:border-[#f97316]/40 dark:bg-[#f97316]/10',
                        !record.activo &&
                          'bg-slate-50 text-slate-500 opacity-80 dark:bg-slate-950/60 dark:text-slate-400',
                        record.activo
                          ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/90'
                          : '',
                      )}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-base font-semibold text-slate-950 dark:text-white">
                              {record.nombre} {record.apellido}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {record.id}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'rounded-full border px-3 py-1 text-[11px] font-semibold',
                              statusToneClasses[status.tone],
                            )}
                          >
                            {status.label}
                          </span>
                        </div>

                        <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <p>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              Correo:
                            </span>{' '}
                            {record.email}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              Teléfono:
                            </span>{' '}
                            {record.telefono || 'Sin telefono'}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              Dirección:
                            </span>{' '}
                            {record.direccion || 'Sin direccion'}
                          </p>
                          <p className="font-mono text-xs font-semibold text-[#0f3042] dark:text-sky-300">
                            {record.claveCatastral}
                          </p>
                          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {status.detail}
                          </p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!record.activo}
                            onClick={() => handleSelectCitizen(record)}
                            aria-label={`Editar ${record.nombre} ${record.apellido}`}
                            className="w-full"
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={deletingCitizenId === record.id || !record.activo}
                            onClick={() => handleDeleteCitizen(record)}
                            aria-label={`Eliminar ${record.nombre} ${record.apellido}`}
                            className="w-full"
                          >
                            {!record.activo
                              ? 'Inactivo'
                              : deletingCitizenId === record.id
                                ? 'Eliminando...'
                                : 'Eliminar'}
                          </Button>
                        </div>
                      </div>
                    </article>
                  )
                })}
            </div>)}

            {!isCompactLayout && (<div className="overflow-x-auto">
              <table className="min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-950/80 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Ciudadano
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Contacto
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Direccion
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Clave catastral
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Estado
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-16 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        Cargando padrón de ciudadanos...
                      </td>
                    </tr>
                  ) : null}

                  {!isLoading && loadError ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <p
                          role="alert"
                          className="text-sm font-medium text-rose-600 dark:text-rose-300"
                        >
                          {loadError}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => setReloadKey((current) => current + 1)}
                        >
                          Reintentar
                        </Button>
                      </td>
                    </tr>
                  ) : null}

                  {!isLoading &&
                    !loadError &&
                    visibleCitizens.map((record) => {
                      const status = getCitizenStatus(record)
                      const isSelected = selectedCitizenId === record.id

                      return (
                        <tr
                          key={record.id}
                          className={cn(
                            'border-b border-slate-100 last:border-b-0 dark:border-slate-800',
                            isSelected && 'bg-[#f97316]/5 dark:bg-[#f97316]/10',
                            !record.activo &&
                              'bg-slate-50 text-slate-500 opacity-80 dark:bg-slate-950/60 dark:text-slate-400',
                          )}
                        >
                          <td className="px-5 py-4 align-top">
                            <p className="font-semibold text-slate-950 dark:text-white">
                              {record.nombre} {record.apellido}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {record.id}
                            </p>
                            <button
                              type="button"
                              className="mt-2 text-xs font-semibold text-[#0f3042] transition-colors hover:text-[#f97316] disabled:cursor-not-allowed disabled:text-slate-400 dark:text-sky-300 dark:hover:text-orange-300"
                              onClick={() => handleSelectCitizen(record)}
                              disabled={!record.activo}
                            >
                              Editar registro
                            </button>
                          </td>
                          <td className="px-5 py-4 align-top text-slate-600 dark:text-slate-300">
                            <p>{record.email}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {record.telefono || 'Sin telefono'}
                            </p>
                          </td>
                          <td className="px-5 py-4 align-top text-slate-600 dark:text-slate-300">
                            {record.direccion || (
                              <span className="text-slate-400 dark:text-slate-500">
                                Sin direccion
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 align-top font-mono text-xs font-semibold text-[#0f3042] dark:text-sky-300">
                            {record.claveCatastral}
                          </td>
                          <td className="px-5 py-4 align-top">
                            <span
                              className={cn(
                                'inline-flex rounded-full border px-3 py-1 text-xs font-semibold',
                                statusToneClasses[status.tone],
                              )}
                            >
                              {status.label}
                            </span>
                            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                              {status.detail}
                            </p>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!record.activo}
                                onClick={() => handleSelectCitizen(record)}
                                aria-label={`Editar ${record.nombre} ${record.apellido}`}
                              >
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={deletingCitizenId === record.id || !record.activo}
                                onClick={() => handleDeleteCitizen(record)}
                                aria-label={`Eliminar ${record.nombre} ${record.apellido}`}
                              >
                                {!record.activo
                                  ? 'Inactivo'
                                  : deletingCitizenId === record.id
                                    ? 'Eliminando...'
                                    : 'Eliminar'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}

                  {!isLoading && !loadError && visibleCitizens.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-16 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        No se encontraron ciudadanos con los filtros actuales.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>)}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {metadata.total === 0
                ? 'No hay paginas disponibles'
                : `Registros ${(metadata.pagina - 1) * metadata.limite + 1}-${Math.min(
                    metadata.pagina * metadata.limite,
                    metadata.total,
                  )}`}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoading || metadata.pagina <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoading || metadata.pagina >= metadata.totalPaginas}
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(metadata.totalPaginas, page + 1),
                  )
                }
              >
                Siguiente
              </Button>
            </div>
          </CardFooter>
        </Card>

        <Card className="overflow-hidden border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-slate-900/90">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex h-full flex-col"
          >
            <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>
                    {selectedCitizen ? 'Editar ciudadano' : 'Nuevo ciudadano'}
                  </CardTitle>
                  <CardDescription className="mt-1 max-w-md">
                    {selectedCitizen
                      ? 'Ajusta la información del registro seleccionado y guarda los cambios.'
                      : 'Llena el formulario para registrar un nuevo ciudadano en el padrón.'}
                  </CardDescription>
                </div>
                <span className="rounded-full border border-[#0f3042]/10 bg-[#0f3042]/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#0f3042] dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300">
                  {selectedCitizen ? selectedCitizen.id : 'Modo alta'}
                </span>
              </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-5">
              {submissionState.kind !== 'idle' ? (
                <div
                  id={statusId}
                  role={submissionState.kind === 'error' ? 'alert' : 'status'}
                  aria-live="polite"
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-sm leading-6',
                    submissionState.kind === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-100'
                      : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-100',
                  )}
                >
                  {submissionState.message}
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                Los campos marcados con * son obligatorios. Los demas se pueden
                dejar vacíos, pero conviene completarlos para tener un padrón
                más útil.
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={nombreId}>Nombre *</Label>
                  <Input
                    id={nombreId}
                    value={values.nombre}
                    onChange={handleFieldChange('nombre')}
                    onBlur={handleFieldBlur('nombre')}
                    placeholder="Mariana"
                    aria-invalid={Boolean(touched.nombre && fieldErrors.nombre)}
                    aria-describedby={
                      touched.nombre && fieldErrors.nombre
                        ? `${nombreId}-error`
                        : undefined
                    }
                  />
                  {touched.nombre && fieldErrors.nombre ? (
                    <p
                      id={`${nombreId}-error`}
                      className="text-sm text-rose-600 dark:text-rose-300"
                    >
                      {fieldErrors.nombre}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={apellidoId}>Apellido *</Label>
                  <Input
                    id={apellidoId}
                    value={values.apellido}
                    onChange={handleFieldChange('apellido')}
                    onBlur={handleFieldBlur('apellido')}
                    placeholder="Lopez Torres"
                    aria-invalid={Boolean(
                      touched.apellido && fieldErrors.apellido,
                    )}
                    aria-describedby={
                      touched.apellido && fieldErrors.apellido
                        ? `${apellidoId}-error`
                        : undefined
                    }
                  />
                  {touched.apellido && fieldErrors.apellido ? (
                    <p
                      id={`${apellidoId}-error`}
                      className="text-sm text-rose-600 dark:text-rose-300"
                    >
                      {fieldErrors.apellido}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={emailId}>Correo electronico *</Label>
                  <Input
                    id={emailId}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={values.email}
                    onChange={handleFieldChange('email')}
                    onBlur={handleFieldBlur('email')}
                    placeholder="mariana.lopez@sicose.mx"
                    aria-invalid={Boolean(touched.email && fieldErrors.email)}
                    aria-describedby={
                      touched.email && fieldErrors.email
                        ? `${emailId}-error`
                        : undefined
                    }
                  />
                  {touched.email && fieldErrors.email ? (
                    <p
                      id={`${emailId}-error`}
                      className="text-sm text-rose-600 dark:text-rose-300"
                    >
                      {fieldErrors.email}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={telefonoId}>Telefono (opcional)</Label>
                  <Input
                    id={telefonoId}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={values.telefono}
                    onChange={handleFieldChange('telefono')}
                    onBlur={handleFieldBlur('telefono')}
                    placeholder="222 111 0101"
                    aria-invalid={Boolean(
                      touched.telefono && fieldErrors.telefono,
                    )}
                    aria-describedby={
                      touched.telefono && fieldErrors.telefono
                        ? `${telefonoId}-error`
                        : undefined
                    }
                  />
                  {touched.telefono && fieldErrors.telefono ? (
                    <p
                      id={`${telefonoId}-error`}
                      className="text-sm text-rose-600 dark:text-rose-300"
                    >
                      {fieldErrors.telefono}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={claveCatastralId}>Clave catastral *</Label>
                  <Input
                    id={claveCatastralId}
                    value={values.claveCatastral}
                    onChange={handleFieldChange('claveCatastral')}
                    onBlur={handleFieldBlur('claveCatastral')}
                    placeholder="SDC-72810-001"
                    aria-invalid={Boolean(
                      touched.claveCatastral && fieldErrors.claveCatastral,
                    )}
                    aria-describedby={
                      touched.claveCatastral && fieldErrors.claveCatastral
                        ? `${claveCatastralId}-error`
                        : undefined
                    }
                  />
                  {touched.claveCatastral && fieldErrors.claveCatastral ? (
                    <p
                      id={`${claveCatastralId}-error`}
                      className="text-sm text-rose-600 dark:text-rose-300"
                    >
                      {fieldErrors.claveCatastral}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={direccionId}>Direccion (opcional)</Label>
                  <Input
                    id={direccionId}
                    value={values.direccion}
                    onChange={handleFieldChange('direccion')}
                    onBlur={handleFieldBlur('direccion')}
                    placeholder="Av. Hidalgo 14"
                    aria-invalid={Boolean(
                      touched.direccion && fieldErrors.direccion,
                    )}
                    aria-describedby={
                      touched.direccion && fieldErrors.direccion
                        ? `${direccionId}-error`
                        : undefined
                    }
                  />
                  {touched.direccion && fieldErrors.direccion ? (
                    <p
                      id={`${direccionId}-error`}
                      className="text-sm text-rose-600 dark:text-rose-300"
                    >
                      {fieldErrors.direccion}
                    </p>
                  ) : null}
                </div>
              </div>

              <div
                className={cn(
                  'rounded-2xl border px-4 py-4',
                  hasVisibleErrors
                    ? 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/60'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60',
                )}
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedCitizen
                    ? 'Registro listo para ser actualizado'
                    : 'Formulario preparado para crear un ciudadano'}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  El formulario prioriza una experiencia clara y evita guardar
                  datos incompletos antes de continuar.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSaving}
              >
                {isSaving
                  ? 'Guardando...'
                  : selectedCitizen
                    ? 'Guardar cambios'
                    : 'Crear ciudadano'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => resetForm()}
              >
                Limpiar formulario
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <CitizenMonthlyHistoryPanel
          selectedCitizen={selectedCitizen}
          historyState={historyState}
        />
      </div>
    </section>
  )
}
