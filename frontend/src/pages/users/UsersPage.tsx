import { useEffect, useId, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import AppLink from '../../components/AppLink'
import RoutePills from '../../components/RoutePills'
import ThemeToggle from '../../components/ThemeToggle'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { logout } from '../../features/auth/auth.api'
import { clearAuthSession, readAuthSession } from '../../features/auth/auth.session'
import { useTheme } from '../../features/theme/theme-context'
import { navigateTo } from '../../lib/navigation'
import { cn } from '../../lib/utils'
import {
  createUser,
  deactivateUser,
  fetchUsers,
  updateUser,
} from '../../features/users/user.api'
import type { SystemUserRecord, SystemUserRole, UserFormValues } from '../../features/users/user.types'

type SubmissionState =
  | { kind: 'idle' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

type FieldName = 'email' | 'nombre' | 'rol' | 'password'
type FieldErrors = Partial<Record<FieldName, string>>
type RoleFilter = 'all' | SystemUserRole

const ROLE_LABELS: Record<SystemUserRole, string> = {
  admin: 'Administrador',
  tesorero: 'Tesorero',
  secretaria: 'Secretaria',
}

const FILTER_OPTIONS: Array<{ value: RoleFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'admin', label: 'Administradores' },
  { value: 'tesorero', label: 'Tesoreros' },
  { value: 'secretaria', label: 'Secretarias' },
]

const PAGE_SIZE = 8

const DEFAULT_FORM_VALUES: UserFormValues = {
  email: '',
  nombre: '',
  rol: 'secretaria',
  password: '',
  activo: true,
}

const currencylessDateFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
})

function formatDate(value: string) {
  return currencylessDateFormatter.format(new Date(value))
}

function createEmptyErrors(): FieldErrors {
  return {}
}

function roleToneClasses(role: SystemUserRole) {
  if (role === 'admin') {
    return 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/60 dark:text-sky-200'
  }

  if (role === 'tesorero') {
    return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-200'
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-200'
}

function statusToneClasses(active: boolean) {
  return active
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-200'
    : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
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

function UserRoleBadge({ role }: { role: SystemUserRole }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-3 py-1 text-xs font-semibold',
        roleToneClasses(role),
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  )
}

function UserStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-3 py-1 text-xs font-semibold',
        statusToneClasses(active),
      )}
    >
      {active ? 'Activo' : 'Inactivo'}
    </span>
  )
}

function validateForm(values: UserFormValues, isEditing: boolean) {
  const errors: FieldErrors = createEmptyErrors()
  const email = values.email.trim()
  const nombre = values.nombre.trim()
  const password = values.password.trim()

  if (!email) {
    errors.email = 'Ingresa un correo electrónico.'
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = 'El correo no tiene un formato válido.'
  }

  if (!nombre) {
    errors.nombre = 'Ingresa el nombre del usuario.'
  } else if (nombre.length < 2) {
    errors.nombre = 'El nombre debe tener al menos 2 caracteres.'
  }

  if (!values.rol) {
    errors.rol = 'Selecciona un rol.'
  }

  if (!isEditing && password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres.'
  }

  return errors
}

function createEmptyFormValues(): UserFormValues {
  return { ...DEFAULT_FORM_VALUES }
}

export default function UsersPage() {
  const session = readAuthSession()
  const sessionToken = session?.token ?? null
  const { theme } = useTheme()
  const searchId = useId()
  const emailId = useId()
  const nombreId = useId()
  const rolId = useId()
  const passwordId = useId()
  const activoId = useId()

  const [users, setUsers] = useState<SystemUserRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [values, setValues] = useState<UserFormValues>(createEmptyFormValues)
  const [submissionState, setSubmissionState] = useState<SubmissionState>({
    kind: 'idle',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [deactivatingUserId, setDeactivatingUserId] = useState<string | null>(
    null,
  )
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, roleFilter])

  useEffect(() => {
    if (!sessionToken) {
      setIsLoading(false)
      setLoadError('Inicia sesión para administrar usuarios.')
      return
    }

    let cancelled = false
    setIsLoading(true)
    setLoadError(null)

    fetchUsers(sessionToken)
      .then((records) => {
        if (cancelled) {
          return
        }

        setUsers(records)
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar los usuarios del sistema.',
        )
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey, sessionToken])

  const isEditing = selectedUserId !== null

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return users.filter((record) => {
      if (roleFilter !== 'all' && record.rol !== roleFilter) {
        return false
      }

      if (!query) {
        return true
      }

      return (
        record.nombre.toLowerCase().includes(query) ||
        record.email.toLowerCase().includes(query) ||
        record.rol.toLowerCase().includes(query)
      )
    })
  }, [roleFilter, searchTerm, users])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredUsers.slice(start, start + PAGE_SIZE)
  }, [currentPage, filteredUsers])

  const totals = useMemo(() => {
    const active = users.filter((record) => record.activo).length
    const inactive = users.length - active
    const admins = users.filter((record) => record.rol === 'admin').length
    const tesoreros = users.filter((record) => record.rol === 'tesorero').length
    const secretarias = users.filter((record) => record.rol === 'secretaria').length

    return {
      active,
      inactive,
      admins,
      tesoreros,
      secretarias,
    }
  }, [users])

  const currentUserEmail = session?.user.email ?? null

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

  const resetForm = (preserveMessage = false) => {
    setSelectedUserId(null)
    setValues(createEmptyFormValues())

    if (!preserveMessage) {
      setSubmissionState({ kind: 'idle' })
    }
  }

  const handleFieldChange =
    (field: 'email' | 'nombre' | 'password') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setValues((current) => ({ ...current, [field]: value }))
      setSubmissionState({ kind: 'idle' })
    }

  const handleRoleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setValues((current) => ({
      ...current,
      rol: event.target.value as SystemUserRole,
    }))
    setSubmissionState({ kind: 'idle' })
  }

  const handleActiveChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({
      ...current,
      activo: event.target.checked,
    }))
    setSubmissionState({ kind: 'idle' })
  }

  const handleEditUser = (record: SystemUserRecord) => {
    setSelectedUserId(record.id)
    setValues({
      email: record.email,
      nombre: record.nombre,
      rol: record.rol,
      password: '',
      activo: record.activo,
    })
    setSubmissionState({ kind: 'idle' })
  }

  const handleToggleActive = async (record: SystemUserRecord) => {
    if (!session) {
      setSubmissionState({
        kind: 'error',
        message: 'Inicia sesión para cambiar el estado de los usuarios.',
      })
      return
    }

    if (record.email === currentUserEmail && record.activo) {
      setSubmissionState({
        kind: 'error',
        message: 'No puedes desactivar tu propia cuenta desde esta pantalla.',
      })
      return
    }

    setDeactivatingUserId(record.id)
    setSubmissionState({ kind: 'idle' })

    try {
      if (record.activo) {
        await deactivateUser(session.token, record.id)
      } else {
        await updateUser(session.token, record.id, { activo: true })
      }

      setSubmissionState({
        kind: 'success',
        message: record.activo
          ? `Usuario ${record.nombre} desactivado.`
          : `Usuario ${record.nombre} reactivado.`,
      })
      setReloadKey((current) => current + 1)

      if (selectedUserId === record.id) {
        resetForm(true)
      }
    } catch (error) {
      setSubmissionState({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No fue posible actualizar el estado del usuario.',
      })
    } finally {
      setDeactivatingUserId(null)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!session) {
      setSubmissionState({
        kind: 'error',
        message: 'Inicia sesión para guardar usuarios.',
      })
      return
    }

    const nextErrors = validateForm(values, isEditing)

    if (Object.keys(nextErrors).length > 0) {
      setSubmissionState({
        kind: 'error',
        message: 'Revisa los campos marcados antes de guardar.',
      })
      return
    }

    setIsSaving(true)
    setSubmissionState({ kind: 'idle' })

    try {
      const payload = {
        email: values.email.trim(),
        nombre: values.nombre.trim(),
        rol: values.rol,
      }

      if (isEditing && selectedUserId) {
        await updateUser(session.token, selectedUserId, {
          ...payload,
          activo: values.activo,
        })
        setSubmissionState({
          kind: 'success',
          message: `Usuario ${values.nombre.trim()} actualizado correctamente.`,
        })
      } else {
        await createUser(session.token, {
          ...payload,
          password: values.password.trim(),
        })
        setSubmissionState({
          kind: 'success',
          message: `Usuario ${values.nombre.trim()} creado correctamente.`,
        })
      }

      setReloadKey((current) => current + 1)
      resetForm(true)
    } catch (error) {
      setSubmissionState({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No fue posible guardar el usuario.',
      })
    } finally {
      setIsSaving(false)
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
              Usuarios
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
                SiCoSe · Administración
              </p>
              <h1
                className={cn(
                  'text-4xl font-semibold tracking-tight sm:text-5xl',
                  theme === 'dark' ? 'text-white' : 'text-slate-950',
                )}
              >
                Gestión de usuarios con alta, edición y desactivación
              </h1>
              <p
                className={cn(
                  'text-base leading-7',
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-600',
                )}
              >
                Desde aquí se administran las cuentas del sistema con control de
                rol, estado y trazabilidad básica para el equipo operativo.
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
                Alcance
              </p>
              <ul
                className={cn(
                  'mt-4 space-y-3 text-sm leading-6',
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-600',
                )}
              >
                <li>- Altas con correo, nombre, rol y contraseña inicial</li>
                <li>- Edición de datos y estado activo / inactivo</li>
                <li>- Filtro rápido por nombre, correo o rol</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-up">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total" value={String(users.length)} detail="Usuarios" />
          <SummaryCard label="Activos" value={String(totals.active)} detail="Habilitados" />
          <SummaryCard label="Inactivos" value={String(totals.inactive)} detail="Baja lógica" />
          <SummaryCard
            label="Administradores"
            value={String(totals.admins)}
            detail="Rol sensible"
          />
        </div>

        {submissionState.kind !== 'idle' ? (
          <Card
            className={cn(
              'mt-6 shadow-sm',
              submissionState.kind === 'success'
                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/50'
                : 'border-rose-200 bg-rose-50',
            )}
          >
            <CardContent
              role={submissionState.kind === 'error' ? 'alert' : 'status'}
              aria-live="polite"
              className={cn(
                'p-4 text-sm',
                submissionState.kind === 'success'
                  ? 'text-emerald-900 dark:text-emerald-100'
                  : 'text-rose-800 dark:text-rose-100',
              )}
            >
              {submissionState.message}
            </CardContent>
          </Card>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="overflow-hidden border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Padron de usuarios</CardTitle>
                  <CardDescription>
                    Busca por nombre o correo y administra el acceso del equipo.
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" onClick={() => resetForm()}>
                  Nuevo usuario
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor={searchId}>Buscar</Label>
                  <Input
                    id={searchId}
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar por nombre, correo o rol"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${searchId}-rol`}>Rol</Label>
                  <select
                    id={`${searchId}-rol`}
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                    className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    {FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                  Cargando usuarios del sistema...
                </div>
              ) : null}

              {!isLoading && loadError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
                  <p role="alert">{loadError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setReloadKey((current) => current + 1)}
                  >
                    Reintentar
                  </Button>
                </div>
              ) : null}

              {!isLoading && !loadError ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="max-h-[34rem] overflow-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-950/95 dark:text-slate-400">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Usuario</th>
                          <th className="px-4 py-3 font-semibold">Rol</th>
                          <th className="px-4 py-3 font-semibold">Estado</th>
                          <th className="px-4 py-3 font-semibold">Fechas</th>
                          <th className="px-4 py-3 font-semibold">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedUsers.length > 0 ? (
                          paginatedUsers.map((record) => {
                            const isSelected = selectedUserId === record.id
                            const isCurrentUser = record.email === currentUserEmail

                            return (
                              <tr
                                key={record.id}
                                className={cn(
                                  'border-t border-slate-100 dark:border-slate-800',
                                  isSelected && 'bg-[#0f3042]/5 dark:bg-[#0f3042]/15',
                                )}
                              >
                                <td className="px-4 py-3 align-top">
                                  <p className="font-semibold text-slate-950 dark:text-white">
                                    {record.nombre}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {record.email}
                                  </p>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <UserRoleBadge role={record.rol} />
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <UserStatusBadge active={record.activo} />
                                  {isCurrentUser ? (
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                      Sesión actual
                                    </p>
                                  ) : null}
                                </td>
                                <td className="px-4 py-3 align-top text-slate-600 dark:text-slate-300">
                                  <p>Alta: {formatDate(record.createdAt)}</p>
                                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Actualizado: {formatDate(record.updatedAt)}
                                  </p>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditUser(record)}
                                    >
                                      Editar
                                    </Button>
                                    <Button
                                      type="button"
                                      variant={record.activo ? 'destructive' : 'secondary'}
                                      size="sm"
                                      disabled={
                                        deactivatingUserId === record.id ||
                                        (record.activo && isCurrentUser)
                                      }
                                      onClick={() => handleToggleActive(record)}
                                    >
                                      {deactivatingUserId === record.id
                                        ? 'Actualizando...'
                                        : record.activo
                                          ? 'Desactivar'
                                          : 'Reactivar'}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                            >
                              No se encontraron usuarios con los filtros actuales.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {filteredUsers.length === 0
                  ? 'Sin resultados para mostrar'
                  : `Mostrando ${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(
                      currentPage * PAGE_SIZE,
                      filteredUsers.length,
                    )} de ${filteredUsers.length}`}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                >
                  Siguiente
                </Button>
              </div>
            </CardFooter>
          </Card>

          <Card className="overflow-hidden border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <form onSubmit={handleSubmit} noValidate className="flex h-full flex-col">
              <CardHeader className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>
                      {isEditing ? 'Editar usuario' : 'Nuevo usuario'}
                    </CardTitle>
                    <CardDescription className="mt-1 max-w-md">
                      {isEditing
                        ? 'Ajusta los datos del usuario seleccionado y guarda los cambios.'
                        : 'Crea una cuenta nueva con rol y contraseña inicial.'}
                    </CardDescription>
                  </div>
                  <span className="rounded-full border border-[#0f3042]/10 bg-[#0f3042]/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#0f3042] dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300">
                    {selectedUserId ?? 'Alta nueva'}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                  La contraseña solo se solicita al dar de alta una cuenta nueva.
                  Los usuarios editados conservan su acceso actual.
                </div>

                <div className="space-y-2">
                  <Label htmlFor={nombreId}>Nombre *</Label>
                  <Input
                    id={nombreId}
                    value={values.nombre}
                    onChange={handleFieldChange('nombre')}
                    placeholder="Cristian Pérez"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={emailId}>Correo *</Label>
                  <Input
                    id={emailId}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={values.email}
                    onChange={handleFieldChange('email')}
                    placeholder="cristian@sicose.mx"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={rolId}>Rol *</Label>
                  <select
                    id={rolId}
                    value={values.rol}
                    onChange={handleRoleChange}
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {!isEditing ? (
                  <div className="space-y-2">
                    <Label htmlFor={passwordId}>Contraseña inicial *</Label>
                    <Input
                      id={passwordId}
                      type="password"
                      autoComplete="new-password"
                      value={values.password}
                      onChange={handleFieldChange('password')}
                      placeholder="Mínimo 8 caracteres"
                    />
                  </div>
                ) : null}

                {isEditing ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                    <input
                      id={activoId}
                      type="checkbox"
                      checked={values.activo}
                      onChange={handleActiveChange}
                      className="h-4 w-4 rounded border-slate-300 text-[#0f3042] focus:ring-[#f97316]/20"
                    />
                    <Label htmlFor={activoId} className="cursor-pointer">
                      Usuario activo
                    </Label>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                    El usuario se crea activo por defecto.
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/60">
                <Button type="submit" size="lg" className="w-full" disabled={isSaving}>
                  {isSaving
                    ? 'Guardando...'
                    : isEditing
                      ? 'Guardar cambios'
                      : 'Crear usuario'}
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
      </section>
    </main>
  )
}
