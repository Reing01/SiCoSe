import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import RoutePills from '../../components/RoutePills'
import AppLink from '../../components/AppLink'
import BrandMark from '../../components/BrandMark'
import ThemeToggle from '../../components/ThemeToggle'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { logout } from '../../features/auth/auth.api'
import { clearAuthSession, readAuthSession } from '../../features/auth/auth.session'
import { fetchCitizenPage } from '../../features/citizens/citizen.api'
import { fetchCitizenHistory, type CitizenHistoryPaymentRecord } from '../../features/citizens/citizen-history.api'
import type { CitizenPageMetadata, CitizenRecord } from '../../features/citizens/citizen.types'
import { useTheme } from '../../features/theme/theme-context'
import {
  fetchPaymentReceiptBlob,
  fetchPendingDebts,
  registerPayment,
  type PendingDebtRecord,
  type PaymentRecord,
} from '../../features/payments/payment.api'
import { fetchGeneratedFile, openBlobInNewTab } from '../../lib/download'
import {
  MONTHLY_WATER_FEE_MXN,
  buildMonthlyPeriods,
  isWaterServiceName,
  formatPeriodLabel,
} from '../../lib/water-billing'
import { navigateTo } from '../../lib/navigation'
import { cn } from '../../lib/utils'
import { useMediaQuery } from '../../lib/use-media-query'

type PaymentMethod = 'efectivo' | 'transferencia'
type MonthlyStatusTone = 'paid' | 'partial' | 'pending' | 'missing'

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; debts: PendingDebtRecord[]; totalPending: number }
  | { kind: 'error'; message: string }

type CitizenSearchState =
  | { kind: 'loading'; records: CitizenRecord[]; metadata: CitizenPageMetadata }
  | { kind: 'ready'; records: CitizenRecord[]; metadata: CitizenPageMetadata }
  | { kind: 'error'; message: string; records: CitizenRecord[]; metadata: CitizenPageMetadata }

type HistoryState =
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
          vencimiento: string
          servicio: {
            nombre: string
          }
        }>
        pagos: CitizenHistoryPaymentRecord[]
      }
    }
  | { kind: 'error'; message: string }

type MonthlyPaymentRow = {
  key: string
  year: number
  month: number
  label: string
  expected: number
  paid: number
  pending: number
  paymentCount: number
  tone: MonthlyStatusTone
}

type PaymentReceiptAttachment = {
  id: string
  paymentId: string
  paymentLabel: string
  period: string
  amount: number
  date: string
  fileName: string
  mimeType: string | null
  url: string
}

const paymentWorkflow = [
  {
    step: '01',
    title: 'Busca al ciudadano',
    description:
      'Localiza por nombre, correo o clave catastral con búsqueda paginada.',
  },
  {
    step: '02',
    title: 'Confirma el adeudo',
    description:
      'Revisa los meses pendientes y el monto exacto del periodo actual.',
  },
  {
    step: '03',
    title: 'Registra y entrega',
    description:
      'Guarda el pago, abre el historial y genera el comprobante en un paso.',
  },
] as const

const paymentSignals = [
  'Cuota fija de $30 MXN',
  'Historial por mes',
  'Comprobante PDF',
  'Funciona en móvil y escritorio',
] as const

const CITIZEN_SEARCH_PAGE_SIZE = 6

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

function getCitizenFullName(citizen: CitizenRecord) {
  return `${citizen.nombre} ${citizen.apellido}`.trim()
}

function createEmptyCitizenMetadata(): CitizenPageMetadata {
  return {
    total: 0,
    pagina: 1,
    limite: CITIZEN_SEARCH_PAGE_SIZE,
    totalPaginas: 1,
  }
}

function getPrintableReceiptName(payment: PaymentRecord | CitizenHistoryPaymentRecord) {
  return payment.folio ?? ('recibo' in payment ? payment.recibo ?? payment.id : payment.id)
}

function getLatestReceiptAttachment(payment: CitizenHistoryPaymentRecord) {
  return [...payment.comprobantes].sort(
    (left, right) => new Date(right.fecha).getTime() - new Date(left.fecha).getTime(),
  )[0] ?? null
}

export default function PaymentsPage() {
  const { theme } = useTheme()
  const isCompactLayout = useMediaQuery('(max-width: 639px)')
  const session = readAuthSession()
  const sessionToken = session?.token ?? null
  const citizenSearchInputId = useId()
  const autoSelectedCitizenRef = useRef(false)
  const [citizenSearchTerm, setCitizenSearchTerm] = useState('')
  const [submittedCitizenSearchTerm, setSubmittedCitizenSearchTerm] = useState('')
  const [citizenSearchPage, setCitizenSearchPage] = useState(1)
  const [citizenSearchState, setCitizenSearchState] = useState<CitizenSearchState>({
    kind: 'loading',
    records: [],
    metadata: createEmptyCitizenMetadata(),
  })
  const [selectedCitizen, setSelectedCitizen] = useState<CitizenRecord | null>(null)
  const [debtState, setDebtState] = useState<LoadState>({ kind: 'idle' })
  const [historyState, setHistoryState] = useState<HistoryState>({ kind: 'idle' })
  const [selectedDebtId, setSelectedDebtId] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('efectivo')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState<PaymentRecord | null>(null)
  const [receiptMessage, setReceiptMessage] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!sessionToken) {
      navigateTo('/login', true)
    }
  }, [sessionToken])

  const selectedDebt = useMemo(() => {
    if (debtState.kind !== 'ready') {
      return null
    }

    return debtState.debts.find((debt) => debt.id === selectedDebtId) ?? null
  }, [selectedDebtId, debtState])

  const selectedCitizenName = selectedCitizen ? getCitizenFullName(selectedCitizen) : ''
  const selectedCitizenLabel = selectedCitizenName || 'Busca un ciudadano para iniciar el cobro'
  const selectedCitizenKey = selectedCitizen?.claveCatastral ?? ''
  const selectedDebtAmount = selectedDebt?.monto ?? MONTHLY_WATER_FEE_MXN
  const totalWaterDebts =
    debtState.kind === 'ready' ? debtState.debts.length : 0
  const totalWaterPending =
    debtState.kind === 'ready' ? debtState.totalPending : 0

  const sortedPaymentHistory = useMemo(() => {
    if (historyState.kind !== 'ready') {
      return []
    }

    const waterPayments = historyState.history.pagos.filter((payment) =>
      isWaterServiceName(payment.adeudo.servicio.nombre),
    )

    const basePayments = waterPayments.length > 0 ? waterPayments : historyState.history.pagos

    return [...basePayments].sort(
      (left, right) => new Date(right.fecha).getTime() - new Date(left.fecha).getTime(),
    )
  }, [historyState])

  const monthlyPeriods = useMemo(() => buildMonthlyPeriods(2025, 1, new Date()), [])

  const monthlyRows = useMemo<MonthlyPaymentRow[]>(() => {
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

    return monthlyPeriods.map((period) => {
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
        label: period.fullLabel,
        expected,
        paid,
        pending,
        paymentCount,
        tone,
      }
    })
  }, [historyState, monthlyPeriods])

  const monthlyRowsByYear = useMemo(() => {
    return monthlyRows.reduce<Record<number, MonthlyPaymentRow[]>>((accumulator, row) => {
      accumulator[row.year] ??= []
      accumulator[row.year].push(row)
      return accumulator
    }, {})
  }, [monthlyRows])

  const monthlySummary = useMemo(() => {
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

  useEffect(() => {
    if (!sessionToken) {
      return
    }

    let cancelled = false
    setCitizenSearchState((current) => ({
      kind: 'loading',
      records: current.records,
      metadata: current.metadata,
    }))

    fetchCitizenPage(sessionToken, {
      pagina: citizenSearchPage,
      limite: CITIZEN_SEARCH_PAGE_SIZE,
      nombre: submittedCitizenSearchTerm.trim() || undefined,
      incluirInactivos: false,
    })
      .then((response) => {
        if (cancelled) {
          return
        }

        setCitizenSearchState({
          kind: 'ready',
          records: response.records,
          metadata: response.metadata,
        })

        if (
          !autoSelectedCitizenRef.current &&
          citizenSearchPage === 1 &&
          !submittedCitizenSearchTerm.trim() &&
          response.records[0]
        ) {
          autoSelectedCitizenRef.current = true
          setSelectedCitizen(response.records[0])
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setCitizenSearchState({
          kind: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'No fue posible buscar ciudadanos.',
          records: [],
          metadata: createEmptyCitizenMetadata(),
        })
      })

    return () => {
      cancelled = true
    }
  }, [citizenSearchPage, sessionToken, submittedCitizenSearchTerm])

  useEffect(() => {
    if (!sessionToken || !selectedCitizen) {
      setDebtState({ kind: 'idle' })
      return
    }

    let cancelled = false
    setDebtState({ kind: 'loading' })

    fetchPendingDebts(sessionToken, {
      ciudadanoId: selectedCitizen.id,
      limite: 100,
    })
      .then((response) => {
        if (cancelled) {
          return
        }

        const waterDebts = response.data.filter((debt) =>
          isWaterServiceName(debt.servicio.nombre),
        )
        const totalPending = waterDebts.reduce((sum, debt) => sum + debt.monto, 0)

        setDebtState({
          kind: 'ready',
          debts: waterDebts,
          totalPending,
        })

        const firstDebt = waterDebts[0]
        setSelectedDebtId(firstDebt?.id ?? '')
        setAmount(firstDebt ? String(firstDebt.monto) : '')
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setDebtState({
          kind: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'No fue posible cargar los adeudos del ciudadano.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [refreshKey, selectedCitizen, sessionToken])

  useEffect(() => {
    if (!sessionToken || !selectedCitizen) {
      setHistoryState({ kind: 'idle' })
      return
    }

    let cancelled = false
    setHistoryState({ kind: 'loading' })

    fetchCitizenHistory(sessionToken, selectedCitizen.id)
      .then((history) => {
        if (cancelled) {
          return
        }

        setHistoryState({
          kind: 'ready',
          citizenId: selectedCitizen.id,
          citizenName: getCitizenFullName(selectedCitizen),
          history: {
            adeudos: history.adeudos,
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
              : 'No fue posible cargar el historial de pagos.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [refreshKey, selectedCitizen, sessionToken])

  const receiptAttachments = useMemo<PaymentReceiptAttachment[]>(() => {
    if (historyState.kind !== 'ready') {
      return []
    }

    return sortedPaymentHistory
      .flatMap((payment) =>
        payment.comprobantes.map((comprobante) => ({
          id: comprobante.id,
          paymentId: payment.id,
          paymentLabel: getPrintableReceiptName(payment),
          period: payment.adeudo.periodo,
          amount: payment.monto,
          date: comprobante.fecha,
          fileName:
            comprobante.nombre_archivo?.trim() ||
            `comprobante-${getPrintableReceiptName(payment)}.pdf`,
          mimeType: comprobante.mime_type,
          url: comprobante.url,
        })),
      )
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
  }, [historyState, sortedPaymentHistory])

  const printablePayment = success ?? sortedPaymentHistory[0] ?? null

  const handleCitizenSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setSubmittedCitizenSearchTerm(citizenSearchTerm.trim())
    setCitizenSearchPage(1)
    setSelectedCitizen(null)
    setDebtState({ kind: 'idle' })
    setHistoryState({ kind: 'idle' })
    setSelectedDebtId('')
    setAmount('')
    setMessage(null)
    setReceiptMessage(null)
  }

  const handleClearCitizenSearch = () => {
    setCitizenSearchTerm('')
    setSubmittedCitizenSearchTerm('')
    setCitizenSearchPage(1)
  }

  const handleCitizenSelect = (citizen: CitizenRecord) => {
    setSelectedCitizen(citizen)
    setSelectedDebtId('')
    setMethod('efectivo')
    setAmount('')
    setReference('')
    setReceipt(null)
    setMessage(null)
    setReceiptMessage(null)
    setSuccess(null)
  }

  const handleLogout = async () => {
    const session = readAuthSession()

    try {
      if (session) {
        await logout(session.token)
      }
    } finally {
      clearAuthSession()
      navigateTo('/login', true)
    }
  }

  const handleReceiptChange = (event: ChangeEvent<HTMLInputElement>) => {
    setReceipt(event.target.files?.[0] ?? null)
    setMessage(null)
  }

  const handleOpenPaymentAttachment = async (sourceUrl: string, fileName: string) => {
    const session = readAuthSession()

    if (!session) {
      setReceiptMessage('Inicia sesión para abrir comprobantes.')
      return
    }

    setReceiptMessage(null)

    try {
      const response = await fetchGeneratedFile(sourceUrl, session.token)

      if (!response || !response.ok) {
        throw new Error('No fue posible abrir el comprobante adjunto.')
      }

      const blob = await response.blob()
      openBlobInNewTab(blob, fileName)
      setReceiptMessage('El comprobante adjunto se abrió en una nueva pestaña, listo para imprimir.')
    } catch (error) {
      setReceiptMessage(
        error instanceof Error
          ? error.message
          : 'No fue posible abrir el comprobante adjunto.',
      )
    }
  }

  const handleDebtChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const debtId = event.target.value
    setSelectedDebtId(debtId)

    if (debtState.kind === 'ready') {
      const debt = debtState.debts.find((item) => item.id === debtId)
      setAmount(debt ? String(debt.monto) : '')
    }
  }

  const handlePrintReceipt = async (paymentId: string) => {
    const session = readAuthSession()

    if (!session) {
      setReceiptMessage('Inicia sesión para imprimir comprobantes.')
      return
    }

    setReceiptMessage(null)

    try {
      const blob = await fetchPaymentReceiptBlob(session.token, paymentId)
      openBlobInNewTab(blob, `recibo-${paymentId}.pdf`)
      setReceiptMessage('El comprobante se abrió en una nueva pestaña, listo para imprimir.')
    } catch (error) {
      setReceiptMessage(
        error instanceof Error
          ? error.message
          : 'No fue posible abrir el comprobante de pago.',
      )
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const submitButton = event.currentTarget.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement | null
    if (submitButton) {
      if (
        submitButton.getAttribute('data-submitting') === 'true' ||
        submitButton.disabled
      ) {
        return
      }
      submitButton.setAttribute('data-submitting', 'true')
      submitButton.disabled = true
    }

    const session = readAuthSession()

    if (!session || !selectedDebt) {
      if (submitButton) {
        submitButton.removeAttribute('data-submitting')
        submitButton.disabled = false
      }
      setMessage('Selecciona un adeudo pendiente para continuar.')
      return
    }

    if (method === 'transferencia' && !receipt) {
      if (submitButton) {
        submitButton.removeAttribute('data-submitting')
        submitButton.disabled = false
      }
      setMessage('Adjunta un comprobante antes de confirmar la transferencia.')
      return
    }

    setIsSubmitting(true)
    setMessage(
      method === 'transferencia'
        ? 'Subiendo comprobante y registrando pago...'
        : 'Registrando pago...',
    )
    setSuccess(null)

    try {
      const payment = await registerPayment(session.token, {
        metodo: method,
        ciudadanoId: selectedDebt.ciudadanoId,
        adeudoId: selectedDebt.id,
        monto: Number(amount),
        referenciaBancaria: reference,
        comprobante: receipt ?? undefined,
      })

      setSuccess(payment)
      setMessage(`Pago confirmado con folio ${payment.folio ?? payment.id}.`)
      setRefreshKey((current) => current + 1)
      setDebtState((current) => {
        if (current.kind !== 'ready') {
          return current
        }

        const nextDebts = current.debts
          .map((debt) => {
            if (debt.id === selectedDebt.id) {
              const remaining = Math.max(0, debt.monto - Number(amount))
              return { ...debt, monto: remaining }
            }
            return debt
          })
          .filter((debt) => debt.monto > 0.001)

        const nextDebt =
          nextDebts.find((debt) => debt.id === selectedDebt.id) || nextDebts[0]
        setSelectedDebtId(nextDebt?.id ?? '')
        setAmount(nextDebt ? String(nextDebt.monto) : '')

        return {
          ...current,
          debts: nextDebts,
          totalPending: nextDebts.reduce((sum, debt) => sum + debt.monto, 0),
        }
      })
      setReceipt(null)
      setReference('')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No fue posible registrar el pago.',
      )
    } finally {
      setIsSubmitting(false)
      if (submitButton) {
        submitButton.removeAttribute('data-submitting')
        submitButton.disabled = false
      }
    }
  }

  const selectedDebtLabel =
    selectedDebt == null
      ? selectedCitizenLabel
      : selectedCitizenName

  return (
    <main
      className={cn(
        'min-h-screen animate-fade-in',
        theme === 'dark'
          ? 'bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-slate-100'
          : 'bg-[linear-gradient(180deg,#f8fafc_0%,#eef4f8_100%)] text-slate-900',
      )}
    >
      <header className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pt-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <AppLink
          href="/"
          className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-4 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <BrandMark />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#0f3042] dark:text-sky-300">
              SiCoSe
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Cobranza
            </p>
          </div>
        </AppLink>
        <div className="flex flex-wrap items-center gap-3">
          <RoutePills variant={theme === 'dark' ? 'light' : 'dark'} />
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#0f3042] dark:text-sky-300">
              Pagos
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Cobro de agua, historial y comprobantes
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              La pantalla unifica la búsqueda del ciudadano, el pago del mes de
              agua y el acceso directo al comprobante PDF.
            </p>
          </div>

          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <a
              href="#realizar-pago"
              className="inline-flex w-full min-h-11 items-center justify-center rounded-full border border-[#0f3042]/15 bg-[#0f3042]/5 px-4 py-2 text-sm font-semibold text-[#0f3042] transition-colors hover:bg-[#0f3042]/10 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200 sm:w-auto"
            >
              Realizar pago
            </a>
            <a
              href="#historial-pagos"
              className="inline-flex w-full min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:w-auto"
            >
              Historial de pagos
            </a>
            <a
              href="#comprobante-pago"
              className="inline-flex w-full min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:w-auto"
            >
              Imprimir comprobante
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <Card className="overflow-hidden border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
              <CardTitle>Flujo de cobro guiado</CardTitle>
              <CardDescription>
                La pantalla reúne búsqueda, cobro, historial y comprobantes en un
                mismo recorrido para que no se pierda el contexto del ciudadano.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 md:grid-cols-3">
              {paymentWorkflow.map((step) => (
                <article
                  key={step.step}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#0f3042] dark:text-sky-300">
                    {step.step}
                  </p>
                  <h3 className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {step.description}
                  </p>
                </article>
              ))}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
              <CardTitle>Resumen del cobro</CardTitle>
              <CardDescription>
                El servicio de agua mantiene una cuota fija de $30 MXN por mes y
                el historial queda separado por periodo.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {paymentSignals.map((signal) => (
                  <div
                    key={signal}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200"
                  >
                    {signal}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  Adeudos de agua
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  {debtState.kind === 'ready' ? totalWaterDebts : '—'}
                </p>
              </div>
              <span className="rounded-full border border-[#0f3042]/10 bg-[#0f3042]/5 px-3 py-1 text-xs font-semibold text-[#0f3042] dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300">
                Activos
              </span>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  Total por cobrar
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  {debtState.kind === 'ready' ? formatCurrency(totalWaterPending) : '—'}
                </p>
              </div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-200">
                Pendiente
              </span>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  Cuota base
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  {formatCurrency(MONTHLY_WATER_FEE_MXN)}
                </p>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-200">
                Agua
              </span>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  Ciudadano cargado
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  {selectedDebtLabel}
                </p>
                {selectedCitizenKey ? (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Clave {selectedCitizenKey}
                  </p>
                ) : null}
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                Agua
              </span>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 overflow-hidden border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
            <CardTitle>Buscar ciudadano para cobrar</CardTitle>
            <CardDescription>
              Encuentra por nombre, apellido o clave catastral y avanza por
              páginas hasta ubicar a la persona correcta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <form className="flex flex-col gap-3 lg:flex-row" onSubmit={handleCitizenSearchSubmit}>
              <div className="flex-1 space-y-2">
                <Label htmlFor={citizenSearchInputId}>Buscar ciudadano</Label>
                <Input
                  id={citizenSearchInputId}
                  type="search"
                  value={citizenSearchTerm}
                  onChange={(event) => setCitizenSearchTerm(event.target.value)}
                  placeholder="Nombre, apellido o clave catastral"
                />
              </div>
              <div className="grid gap-2 pt-0 sm:grid-cols-2 lg:flex lg:items-end">
                <Button type="submit" className="w-full">
                  Buscar
                </Button>
                <Button type="button" variant="outline" onClick={handleClearCitizenSearch} className="w-full">
                  Limpiar
                </Button>
              </div>
            </form>

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {citizenSearchState.kind === 'loading'
                    ? 'Buscando ciudadanos...'
                    : `${citizenSearchState.metadata.total} ciudadanos encontrados`}
                </p>
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {submittedCitizenSearchTerm
                    ? `Filtro actual: ${submittedCitizenSearchTerm}`
                    : 'Mostrando ciudadanos activos para el cobro de agua.'}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={citizenSearchPage <= 1 || citizenSearchState.kind === 'loading'}
                  className="w-full"
                  onClick={() => setCitizenSearchPage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </Button>
                <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  Página {citizenSearchState.metadata.pagina} de {citizenSearchState.metadata.totalPaginas}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={
                    citizenSearchPage >= citizenSearchState.metadata.totalPaginas ||
                    citizenSearchState.kind === 'loading'
                  }
                  onClick={() =>
                    setCitizenSearchPage((current) =>
                      Math.min(citizenSearchState.metadata.totalPaginas, current + 1),
                    )
                  }
                >
                  Siguiente
                </Button>
              </div>
            </div>

            {citizenSearchState.kind === 'error' ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-100">
                {citizenSearchState.message}
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              {citizenSearchState.records.length > 0 ? (
                citizenSearchState.records.map((citizen) => {
                  const isSelected = selectedCitizen?.id === citizen.id

                  return (
                    <article
                      key={citizen.id}
                      className={cn(
                        'rounded-2xl border p-4 shadow-sm transition-colors',
                        isSelected
                          ? 'border-[#0f3042] bg-[#0f3042]/5 dark:border-sky-400/40 dark:bg-sky-400/10'
                          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/60',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-slate-950 dark:text-white">
                            {getCitizenFullName(citizen)}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            Clave catastral: {citizen.claveCatastral}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {citizen.telefono || 'Sin telefono'} · {citizen.direccion || 'Sin direccion'}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleCitizenSelect(citizen)}
                        >
                          {isSelected ? 'Seleccionado' : 'Seleccionar'}
                        </Button>
                      </div>
                    </article>
                  )
                })
              ) : citizenSearchState.kind === 'loading' ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                  Cargando resultados...
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300 md:col-span-2">
                  No se encontraron ciudadanos con el criterio indicado.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {receiptMessage ? (
          <Card className="mt-5 border-sky-200 bg-sky-50 shadow-sm dark:border-sky-900/60 dark:bg-sky-950/50">
            <CardContent className="p-4 text-sm text-sky-900 dark:text-sky-100">
              {receiptMessage}
            </CardContent>
          </Card>
        ) : null}

        {debtState.kind === 'loading' ? (
          <Card className="mt-6 border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <CardContent className="p-6">
              Cargando adeudos de agua del ciudadano seleccionado...
            </CardContent>
          </Card>
        ) : null}

        {debtState.kind === 'error' ? (
          <Card className="mt-6 border-rose-200 bg-rose-50 shadow-sm">
            <CardContent className="p-6 text-rose-800">
              {debtState.message}
            </CardContent>
          </Card>
        ) : null}

        {debtState.kind === 'ready' ? (
          <>
            <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Card id="realizar-pago" className="overflow-hidden border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
                <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
                  <CardTitle>Realizar pago</CardTitle>
                  <CardDescription>
                    Selecciona el adeudo de agua, captura el monto y confirma el movimiento.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 p-5">
                  <Label htmlFor="debt">Adeudo</Label>
                  <select
                    id="debt"
                    value={selectedDebtId}
                    onChange={handleDebtChange}
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    {debtState.debts.map((debt) => (
                      <option key={debt.id} value={debt.id}>
                        {debt.periodo} - {debt.servicio.nombre} - {formatCurrency(debt.monto)}
                      </option>
                    ))}
                  </select>

                  {debtState.debts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                      Este ciudadano no tiene adeudos de agua pendientes.
                    </div>
                  ) : null}

                  {selectedDebt ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 dark:border-slate-800 dark:bg-slate-950/60">
                      <p className="font-semibold">
                        {selectedCitizenName}
                      </p>
                      <p>
                        {selectedDebt.servicio.nombre} - {selectedDebt.periodo}
                      </p>
                      <p className="font-semibold text-[#0f3042] dark:text-sky-300">
                        {formatCurrency(selectedDebt.monto)}
                      </p>
                    </div>
                  ) : null}

                  <form className="space-y-5 pt-2" onSubmit={handleSubmit}>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(['efectivo', 'transferencia'] as const).map((item) => (
                        <Button
                          key={item}
                          type="button"
                          variant={method === item ? 'default' : 'outline'}
                          onClick={() => setMethod(item)}
                          className="w-full"
                        >
                          {item === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                        </Button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="amount">Monto a registrar</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAmount(String(selectedDebtAmount))}
                          disabled={!selectedDebt}
                          className="h-8 px-3 text-xs"
                        >
                          Usar saldo exacto
                        </Button>
                      </div>
                      <Input
                        id="amount"
                        type="number"
                        min="1"
                        step="0.01"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                      />
                      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                        La cuota base del agua es de {formatCurrency(MONTHLY_WATER_FEE_MXN)}
                        por mes. El saldo actual del adeudo seleccionado es{' '}
                        {formatCurrency(selectedDebtAmount)}. Puedes registrar un
                        parcial si lo necesitas, siempre que no supere ese saldo.
                      </p>
                    </div>

                    {method === 'transferencia' ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="reference">Referencia bancaria</Label>
                          <Input
                            id="reference"
                            value={reference}
                            onChange={(event) => setReference(event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="receipt">Comprobante</Label>
                          <Input
                            id="receipt"
                            type="file"
                            accept="image/png,image/jpeg,application/pdf"
                            onChange={handleReceiptChange}
                          />
                          {receipt ? (
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/60">
                              <span>{receipt.name} listo para subir</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setReceipt(null)}
                              >
                                Eliminar
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {message ? (
                      <div
                        role={success ? 'status' : 'alert'}
                        className={cn(
                          'rounded-xl border p-4 text-sm',
                          success
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-amber-200 bg-amber-50 text-amber-800',
                        )}
                      >
                        {message}
                      </div>
                    ) : null}

                    {success ? (
                      <div className="rounded-xl border border-emerald-200 bg-white p-4 text-sm dark:bg-slate-950">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
                          Exito
                        </p>
                        <p className="mt-2 text-2xl font-semibold">
                          {success.folio ?? success.id}
                        </p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                          El recibo ya puede imprimirse desde la tarjeta de comprobante.
                        </p>
                      </div>
                    ) : null}

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={isSubmitting || !selectedDebt}
                    >
                      {isSubmitting ? 'Confirmando...' : 'Confirmar pago'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card id="historial-pagos" className="overflow-hidden border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
                <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
                  <CardTitle>Historial de pagos</CardTitle>
                  <CardDescription>
                    {historyState.kind === 'ready'
                      ? `${historyState.citizenName} · ${historyState.history.pagos.length} pagos registrados`
                      : 'El historial se carga para el ciudadano seleccionado.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  {historyState.kind === 'idle' ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                      Selecciona un ciudadano para ver el historial de pagos y comprobantes.
                    </div>
                  ) : null}

                  {historyState.kind === 'loading' ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                      Cargando historial del ciudadano seleccionado...
                    </div>
                  ) : null}

                  {historyState.kind === 'error' ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
                      {historyState.message}
                    </div>
                  ) : null}

                  {historyState.kind === 'ready' ? (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                            Ciudadano
                          </p>
                          <p className="mt-2 text-sm font-semibold">
                            {historyState.citizenName}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            ID {historyState.citizenId}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                            Cuota base
                          </p>
                          <p className="mt-2 text-sm font-semibold">
                            {formatCurrency(MONTHLY_WATER_FEE_MXN)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            El sistema trabaja con cobro mensual de agua.
                          </p>
                        </div>
                      </div>

                      {isCompactLayout && (<div className="space-y-3">
                        {sortedPaymentHistory.length > 0 ? (
                          sortedPaymentHistory.map((payment) => {
                            const latestAttachment = getLatestReceiptAttachment(payment)

                            return (
                              <article
                                key={payment.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
                              >
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <p className="text-sm font-semibold text-slate-950 dark:text-white">
                                        {payment.adeudo.periodo}
                                      </p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {formatDate(payment.fecha)}
                                      </p>
                                    </div>
                                    <p className="text-sm font-semibold text-[#0f3042] dark:text-sky-300">
                                      {formatCurrency(payment.monto)}
                                    </p>
                                  </div>

                                  <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                                    <p>
                                      <span className="font-semibold text-slate-900 dark:text-white">
                                        Método:
                                      </span>{' '}
                                      {payment.metodo}
                                    </p>
                                    <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                                      {getPrintableReceiptName(payment)}
                                    </p>
                                  </div>

                                  <div className="grid gap-2 sm:grid-cols-2">
                                    {latestAttachment ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => {
                                          void handleOpenPaymentAttachment(
                                            latestAttachment.url,
                                            latestAttachment.nombre_archivo?.trim() ||
                                              `comprobante-${getPrintableReceiptName(payment)}.pdf`,
                                          )
                                        }}
                                      >
                                        Abrir archivo
                                      </Button>
                                    ) : (
                                      <div className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                                        Sin adjunto
                                      </div>
                                    )}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="w-full"
                                      onClick={() => handlePrintReceipt(payment.id)}
                                    >
                                      Imprimir
                                    </Button>
                                  </div>
                                </div>
                              </article>
                            )
                          })
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                            Todavia no hay pagos registrados para este ciudadano.
                          </div>
                        )}
                      </div>)}

                      {!isCompactLayout && (<div className="max-h-[34rem] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                        <table className="min-w-full text-left text-sm">
                          <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-950/95 dark:text-slate-400">
                            <tr>
                              <th className="px-4 py-3 font-semibold">Fecha</th>
                              <th className="px-4 py-3 font-semibold">Periodo</th>
                              <th className="px-4 py-3 font-semibold">Monto</th>
                              <th className="px-4 py-3 font-semibold">Metodo</th>
                              <th className="px-4 py-3 font-semibold">Folio</th>
                              <th className="px-4 py-3 font-semibold">Comprobante</th>
                              <th className="px-4 py-3 font-semibold">Accion</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedPaymentHistory.length > 0 ? (
                              sortedPaymentHistory.map((payment) => (
                                <tr
                                  key={payment.id}
                                  className="border-t border-slate-100 dark:border-slate-800"
                                >
                                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                    {formatDate(payment.fecha)}
                                  </td>
                                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                    {payment.adeudo.periodo}
                                  </td>
                                  <td className="px-4 py-3 font-semibold text-[#0f3042] dark:text-sky-300">
                                    {formatCurrency(payment.monto)}
                                  </td>
                                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                    {payment.metodo}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                                    {getPrintableReceiptName(payment)}
                                  </td>
                                  <td className="px-4 py-3">
                                    {getLatestReceiptAttachment(payment) ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const latestAttachment = getLatestReceiptAttachment(payment)
                                          if (latestAttachment) {
                                            void handleOpenPaymentAttachment(
                                              latestAttachment.url,
                                              latestAttachment.nombre_archivo?.trim() ||
                                                `comprobante-${getPrintableReceiptName(payment)}.pdf`,
                                            )
                                          }
                                        }}
                                      >
                                        Abrir archivo
                                      </Button>
                                    ) : (
                                      <span className="text-xs text-slate-400 dark:text-slate-500">
                                        Sin adjunto
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handlePrintReceipt(payment.id)}
                                    >
                                      Imprimir
                                    </Button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                                >
                                  Todavia no hay pagos registrados para este ciudadano.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>)}
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <Card
              id="historial-mensual"
              className="mt-6 overflow-hidden border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"
            >
              <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>Historial mensual 2025-2026</CardTitle>
                    <CardDescription className="mt-1">
                      {historyState.kind === 'ready'
                        ? `${historyState.citizenName} · ${formatPeriodLabel(2025, 1)} hasta ${formatPeriodLabel(
                            new Date().getFullYear(),
                            new Date().getMonth() + 1,
                          )}`
                        : 'El calendario mensual se carga con los adeudos del ciudadano seleccionado.'}
                    </CardDescription>
                  </div>
                  <span className="rounded-full border border-[#0f3042]/10 bg-[#0f3042]/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#0f3042] dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300">
                    {formatCurrency(MONTHLY_WATER_FEE_MXN)} / mes
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-5">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/60">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-200">
                      Meses pagados
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-emerald-950 dark:text-white">
                      {monthlySummary.paid}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/60">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700 dark:text-amber-200">
                      Pagos parciales
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-amber-950 dark:text-white">
                      {monthlySummary.partial}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/60">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-700 dark:text-rose-200">
                      Meses pendientes
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-rose-950 dark:text-white">
                      {monthlySummary.pending}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                      Sin adeudo
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
                      {monthlySummary.missing}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                      Total estimado pagado
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                      {formatCurrency(monthlySummary.totalPaid)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                      Total estimado pendiente
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                      {formatCurrency(monthlySummary.totalPending)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                      Cuota fija
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                      {formatCurrency(MONTHLY_WATER_FEE_MXN)}
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  {Object.keys(monthlyRowsByYear)
                    .map(Number)
                    .sort((left, right) => left - right)
                    .map((year) => (
                      <section key={year} className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                            {year}
                          </h3>
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {monthlyRowsByYear[year].length} meses
                          </span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {monthlyRowsByYear[year].map((row) => (
                            <article
                              key={row.key}
                              className={cn(
                                'rounded-2xl border p-4 shadow-sm',
                                row.tone === 'paid'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-200'
                                  : row.tone === 'partial'
                                    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-200'
                                    : row.tone === 'pending'
                                      ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-200'
                                      : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-80">
                                    {row.label}
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

            <Card
              id="comprobantes-adjuntos"
              className="mt-6 overflow-hidden border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"
            >
              <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
                <CardTitle>Comprobantes adjuntos</CardTitle>
                <CardDescription>
                  Revisa y abre los archivos cargados en transferencias para conservar la trazabilidad del pago.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                {receiptAttachments.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {receiptAttachments.map((attachment) => (
                      <article
                        key={`${attachment.paymentId}:${attachment.id}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                          Comprobante
                        </p>
                        <p className="mt-2 text-base font-semibold text-slate-950 dark:text-white">
                          {attachment.fileName}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {attachment.paymentLabel} · {attachment.period} ·{' '}
                          {formatCurrency(attachment.amount)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(attachment.date)}
                          {attachment.mimeType ? ` · ${attachment.mimeType}` : ''}
                        </p>
                        <div className="mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              void handleOpenPaymentAttachment(attachment.url, attachment.fileName)
                            }}
                          >
                            Abrir comprobante
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                    Aún no hay comprobantes adjuntos para este ciudadano. Cuando se capture una transferencia, aquí aparecerá el archivo cargado.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card id="comprobante-pago" className="mt-6 overflow-hidden border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
              <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
                <CardTitle>Imprimir comprobante de pago</CardTitle>
                <CardDescription>
                  Usa el ultimo pago capturado o cualquier registro del historial para abrir el PDF.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                {printablePayment ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                      Comprobante listo
                    </p>
                    <p className="text-2xl font-semibold text-slate-950 dark:text-white">
                      {printablePayment.folio ?? printablePayment.id}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {formatCurrency(printablePayment.monto)} · {printablePayment.metodo} ·{' '}
                      {formatDate(printablePayment.fecha)}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                    Cuando registres un pago, aquí se mostrará el comprobante para imprimirlo.
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    size="lg"
                    disabled={!printablePayment}
                    onClick={() => printablePayment && handlePrintReceipt(printablePayment.id)}
                  >
                    Imprimir comprobante
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={!printablePayment}
                    onClick={() => printablePayment && handlePrintReceipt(printablePayment.id)}
                  >
                    Abrir PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </section>
    </main>
  )
}
