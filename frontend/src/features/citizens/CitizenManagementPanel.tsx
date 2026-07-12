import type { ChangeEvent, FormEvent } from 'react'
import { useId, useState } from 'react'
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
import { useToast } from '../../components/ui/toast'
import { cn } from '../../lib/utils'
import { citizenSeed } from './citizen.seed'
import type {
  CitizenFieldErrors,
  CitizenFieldName,
  CitizenFilter,
  CitizenFormValues,
  CitizenRecord,
} from './citizen.types'

type SubmissionState =
  | { kind: 'idle' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

type StatusTone = 'success' | 'warning'

type SummaryCardProps = {
  label: string
  value: string
  detail: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+]?[\d\s()-]{7,}$/
const CATASTRAL_PATTERN = /^[A-Z0-9-]{6,}$/

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

function createEmptyFormValues(): CitizenFormValues {
  return { ...DEFAULT_FORM_VALUES }
}

export function normalizeCitizenForm(
  values: CitizenFormValues,
): CitizenFormValues {
  return {
    nombre: values.nombre.trim(),
    apellido: values.apellido.trim(),
    email: values.email.trim().toLowerCase(),
    telefono: values.telefono.trim(),
    direccion: values.direccion.trim(),
    claveCatastral: values.claveCatastral.trim().toUpperCase(),
  }
}

export function validateCitizenForm(
  values: CitizenFormValues,
): CitizenFieldErrors {
  const normalized = normalizeCitizenForm(values)
  const errors: CitizenFieldErrors = {}

  if (normalized.nombre.length < 2) {
    errors.nombre = 'Ingresa un nombre valido.'
  }

  if (normalized.apellido.length < 2) {
    errors.apellido = 'Ingresa un apellido valido.'
  }

  if (!normalized.email) {
    errors.email = 'Ingresa un correo electronico.'
  } else if (!EMAIL_PATTERN.test(normalized.email)) {
    errors.email = 'Ingresa un correo valido.'
  }

  if (normalized.telefono && !PHONE_PATTERN.test(normalized.telefono)) {
    errors.telefono = 'Ingresa un telefono valido o deja el campo vacio.'
  }

  if (normalized.direccion && normalized.direccion.length < 6) {
    errors.direccion = 'La direccion debe tener al menos 6 caracteres.'
  }

  if (!normalized.claveCatastral) {
    errors.claveCatastral = 'Ingresa la clave catastral.'
  } else if (!CATASTRAL_PATTERN.test(normalized.claveCatastral)) {
    errors.claveCatastral =
      'Usa al menos 6 caracteres con letras, numeros o guiones.'
  }

  return errors
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

function buildNextCitizenId(records: CitizenRecord[]) {
  const highestNumber = records.reduce((max, record) => {
    const match = record.id.match(/(\d+)$/)

    if (!match) {
      return max
    }

    const parsedNumber = Number.parseInt(match[1], 10)
    return Number.isNaN(parsedNumber) ? max : Math.max(max, parsedNumber)
  }, 0)

  return `CIT-${String(highestNumber + 1).padStart(3, '0')}`
}

function matchesSearch(record: CitizenRecord, searchTerm: string) {
  if (!searchTerm) {
    return true
  }

  const searchableValues = [
    record.id,
    record.nombre,
    record.apellido,
    record.email,
    record.telefono,
    record.direccion,
    record.claveCatastral,
  ]

  return searchableValues.some((value) =>
    value.toLowerCase().includes(searchTerm),
  )
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

export default function CitizenManagementPanel() {
  const searchId = useId()
  const nombreId = useId()
  const apellidoId = useId()
  const emailId = useId()
  const telefonoId = useId()
  const direccionId = useId()
  const claveCatastralId = useId()
  const statusId = useId()
  const { addToast } = useToast()

  const [citizens, setCitizens] = useState<CitizenRecord[]>(() =>
    citizenSeed.map((record) => ({ ...record })),
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<CitizenFilter>('all')
  const [selectedCitizenId, setSelectedCitizenId] = useState<string | null>(
    null,
  )
  const [values, setValues] = useState<CitizenFormValues>(
    createEmptyFormValues,
  )
  const [touched, setTouched] = useState<Record<CitizenFieldName, boolean>>(
    DEFAULT_TOUCHED,
  )
  const [submissionState, setSubmissionState] = useState<SubmissionState>({
    kind: 'idle',
  })

  const selectedCitizen =
    selectedCitizenId == null
      ? null
      : citizens.find((record) => record.id === selectedCitizenId) ?? null

  const fieldErrors = validateCitizenForm(values)
  const visibleCitizens = citizens.filter((record) => {
    const status = isCitizenComplete(record)
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'complete' && status) ||
      (activeFilter === 'attention' && !status)

    return matchesFilter && matchesSearch(record, searchTerm.trim().toLowerCase())
  })

  const completeCitizens = citizens.filter(isCitizenComplete)
  const attentionCitizens = citizens.length - completeCitizens.length
  const citizensWithPhone = citizens.filter(
    (record) => record.telefono.trim().length > 0,
  ).length

  const hasVisibleErrors = Boolean(
    (touched.nombre && fieldErrors.nombre) ||
      (touched.apellido && fieldErrors.apellido) ||
      (touched.email && fieldErrors.email) ||
      (touched.telefono && fieldErrors.telefono) ||
      (touched.direccion && fieldErrors.direccion) ||
      (touched.claveCatastral && fieldErrors.claveCatastral),
  )

  const handleFieldChange =
    (field: CitizenFieldName) =>
    (event: ChangeEvent<HTMLInputElement>) => {
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

  const handleDeleteCitizen = (id: string) => {
    setCitizens((current) => current.filter((record) => record.id !== id))

    const message = 'Ciudadano eliminado correctamente.'

    if (selectedCitizenId === id) {
      resetForm(message)
    } else {
      setSubmissionState({
        kind: 'success',
        message,
      })
    }

    addToast({
      tone: 'success',
      title: 'Ciudadano eliminado',
      message,
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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

    const existingCitizen =
      selectedCitizenId == null
        ? null
        : citizens.find((record) => record.id === selectedCitizenId) ?? null
    const isEditing = existingCitizen !== null
    const now = new Date().toISOString()
    const nextCitizen: CitizenRecord =
      isEditing && existingCitizen
        ? {
            ...existingCitizen,
            ...normalizedValues,
            updatedAt: now,
          }
        : {
            id: buildNextCitizenId(citizens),
            ...normalizedValues,
            createdAt: now,
            updatedAt: now,
          }

    setCitizens((current) =>
      isEditing
        ? current.map((record) =>
            record.id === nextCitizen.id ? nextCitizen : record,
          )
        : [...current, nextCitizen],
    )
    setSelectedCitizenId(nextCitizen.id)
    setValues(recordToFormValues(nextCitizen))
    setTouched(DEFAULT_TOUCHED)
    const successMessage = isEditing
      ? 'Ciudadano actualizado correctamente.'
      : 'Ciudadano creado correctamente.'

    setSubmissionState({
      kind: 'success',
      message: successMessage,
    })
    addToast({
      tone: 'success',
      title: isEditing ? 'Ciudadano actualizado' : 'Ciudadano creado',
      message: successMessage,
    })
  }

  const statusToneClasses: Record<StatusTone, string> = {
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-200',
    warning:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-200',
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total ciudadanos"
          value={String(citizens.length)}
          detail="Listado local"
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
          label="Con telefono"
          value={String(citizensWithPhone)}
          detail="Contacto directo"
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
            Mostrando {visibleCitizens.length} de {citizens.length} registros
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 sm:inline-flex" />

        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-slate-900/90">
          <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
            <CardTitle>Padron de ciudadanos</CardTitle>
            <CardDescription>
              Selecciona un registro para editarlo o elimina un ciudadano cuando
              ya no forme parte del padron.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
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
                  {visibleCitizens.map((record) => {
                    const status = getCitizenStatus(record)
                    const isSelected = selectedCitizenId === record.id

                    return (
                      <tr
                        key={record.id}
                        className={cn(
                          'border-b border-slate-100 last:border-b-0 dark:border-slate-800',
                          isSelected && 'bg-[#f97316]/5 dark:bg-[#f97316]/10',
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
                            className="mt-2 text-xs font-semibold text-[#0f3042] transition-colors hover:text-[#f97316] dark:text-sky-300 dark:hover:text-orange-300"
                            onClick={() => handleSelectCitizen(record)}
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
                            <span className="text-slate-400 dark:text-slate-500">Sin direccion</span>
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
                              onClick={() => handleSelectCitizen(record)}
                              aria-label={`Editar ${record.nombre} ${record.apellido}`}
                            >
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteCitizen(record.id)}
                              aria-label={`Eliminar ${record.nombre} ${record.apellido}`}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                  {visibleCitizens.length === 0 ? (
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
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-slate-900/90">
          <form onSubmit={handleSubmit} noValidate className="flex h-full flex-col">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>
                    {selectedCitizen ? 'Editar ciudadano' : 'Nuevo ciudadano'}
                  </CardTitle>
                  <CardDescription className="mt-1 max-w-md">
                    {selectedCitizen
                      ? 'Ajusta la informacion del registro seleccionado y guarda los cambios.'
                      : 'Llena el formulario para registrar un nuevo ciudadano en el padron.'}
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
                dejar vacios, pero conviene completarlos para tener un padron
                mas util.
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
                    <p id={`${nombreId}-error`} className="text-sm text-rose-600 dark:text-rose-300">
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
                    aria-invalid={
                      Boolean(touched.apellido && fieldErrors.apellido)
                    }
                    aria-describedby={
                      touched.apellido && fieldErrors.apellido
                        ? `${apellidoId}-error`
                        : undefined
                    }
                  />
                  {touched.apellido && fieldErrors.apellido ? (
                    <p id={`${apellidoId}-error`} className="text-sm text-rose-600 dark:text-rose-300">
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
                    <p id={`${emailId}-error`} className="text-sm text-rose-600 dark:text-rose-300">
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
                    aria-invalid={Boolean(touched.telefono && fieldErrors.telefono)}
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
                    aria-invalid={
                      Boolean(
                        touched.claveCatastral && fieldErrors.claveCatastral,
                      )
                    }
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
                    aria-invalid={
                      Boolean(touched.direccion && fieldErrors.direccion)
                    }
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
                  La validacion corre en el navegador para evitar guardar datos
                  incompletos y mantener el padron limpio antes de conectarlo al
                  backend.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
              <Button type="submit" size="lg" className="w-full">
                {selectedCitizen ? 'Guardar cambios' : 'Crear ciudadano'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={resetForm}
              >
                Limpiar formulario
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </section>
  )
}
