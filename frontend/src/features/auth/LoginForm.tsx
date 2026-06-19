import type { ChangeEvent, FormEvent } from 'react'
import { useId, useMemo, useState } from 'react'
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
import { cn } from '../../lib/utils'
import type { LoginRequest } from './auth.types'

type LoginFieldName = keyof LoginRequest

type LoginFieldErrors = Partial<Record<LoginFieldName, string>>

type SubmissionState =
  | { kind: 'idle' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

export type LoginSubmissionResult = {
  message?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN_LENGTH = 8

const DEFAULT_VALUES: LoginRequest = {
  email: '',
  password: '',
}

const DEFAULT_TOUCHED: Record<LoginFieldName, boolean> = {
  email: false,
  password: false,
}

export function validateLoginForm(values: LoginRequest): LoginFieldErrors {
  const errors: LoginFieldErrors = {}
  const email = values.email.trim()
  const password = values.password.trim()

  if (!email) {
    errors.email = 'Ingresa tu correo institucional.'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Ingresa un correo valido.'
  }

  if (!password) {
    errors.password = 'Ingresa tu contraseña.'
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`
  }

  return errors
}

export interface LoginFormProps {
  className?: string
  initialValues?: Partial<LoginRequest>
  onSubmit?: (
    credentials: LoginRequest,
  ) => LoginSubmissionResult | Promise<LoginSubmissionResult> | void
}

export default function LoginForm({
  className,
  initialValues,
  onSubmit,
}: LoginFormProps) {
  const emailId = useId()
  const passwordId = useId()
  const emailHintId = `${emailId}-hint`
  const passwordHintId = `${passwordId}-hint`
  const statusId = useId()

  const [values, setValues] = useState<LoginRequest>({
    email: initialValues?.email ?? DEFAULT_VALUES.email,
    password: initialValues?.password ?? DEFAULT_VALUES.password,
  })
  const [touched, setTouched] = useState<Record<LoginFieldName, boolean>>(
    DEFAULT_TOUCHED,
  )
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionState, setSubmissionState] = useState<SubmissionState>({
    kind: 'idle',
  })

  const fieldErrors = useMemo(() => validateLoginForm(values), [values])
  const emailError = touched.email ? fieldErrors.email : undefined
  const passwordError = touched.password ? fieldErrors.password : undefined

  const handleFieldChange =
    (field: LoginFieldName) =>
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

  const handleFieldBlur = (field: LoginFieldName) => () => {
    setTouched((current) => ({
      ...current,
      [field]: true,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextTouched: Record<LoginFieldName, boolean> = {
      email: true,
      password: true,
    }

    setTouched(nextTouched)

    const normalizedValues: LoginRequest = {
      email: values.email.trim().toLowerCase(),
      password: values.password,
    }

    const nextErrors = validateLoginForm(normalizedValues)

    if (Object.keys(nextErrors).length > 0) {
      setSubmissionState({
        kind: 'error',
        message: 'Corrige los campos marcados para continuar.',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await Promise.resolve(onSubmit?.(normalizedValues))

      setValues(normalizedValues)
      setSubmissionState({
        kind: 'success',
        message:
          typeof result === 'object' &&
          result !== null &&
          typeof result.message === 'string' &&
          result.message.trim().length > 0
            ? result.message
            : 'Sesion iniciada correctamente. El backend respondio con exito.',
      })
    } catch (error) {
      setSubmissionState({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo procesar el acceso. Intenta de nuevo.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasVisibleErrors = Boolean(emailError || passwordError)
  const statusTone =
    submissionState.kind === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : submissionState.kind === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-900'
        : 'border-sky-200 bg-sky-50 text-sky-900'

  return (
    <form onSubmit={handleSubmit} noValidate className={cn('w-full', className)}>
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0f3042] text-base font-bold text-white shadow-lg shadow-[#0f3042]/25">
              SC
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#f97316]">
                SiCoSe
              </p>
              <CardTitle>Inicia sesi&oacute;n</CardTitle>
            </div>
          </div>
          <CardDescription className="max-w-md">
            Accede con tu correo institucional y la contraseña asignada para
            revisar los módulos protegidos del sistema.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {submissionState.kind !== 'idle' ? (
            <div
              id={statusId}
              role={submissionState.kind === 'error' ? 'alert' : 'status'}
              aria-live="polite"
              className={cn(
                'rounded-2xl border px-4 py-3 text-sm leading-6',
                statusTone,
              )}
            >
              {submissionState.message}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor={emailId}>Correo institucional</Label>
            <Input
              id={emailId}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              placeholder="nombre@junta.gob.mx"
              value={values.email}
              onChange={handleFieldChange('email')}
              onBlur={handleFieldBlur('email')}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? `${emailId}-error` : emailHintId}
            />
            <p id={emailHintId} className="text-xs leading-5 text-slate-500">
              Usa la cuenta registrada en el seed o en tu entorno de producción.
            </p>
            {emailError ? (
              <p id={`${emailId}-error`} className="text-sm text-rose-600">
                {emailError}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor={passwordId}>Contraseña</Label>
            <div className="relative">
              <Input
                id={passwordId}
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Tu contraseña segura"
                value={values.password}
                onChange={handleFieldChange('password')}
                onBlur={handleFieldBlur('password')}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={
                  passwordError ? `${passwordId}-error` : passwordHintId
                }
                className="pr-20"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 h-9 -translate-y-1/2 rounded-lg px-3 text-slate-500 hover:text-slate-900"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </Button>
            </div>
            <p id={passwordHintId} className="text-xs leading-5 text-slate-500">
              Mínimo {PASSWORD_MIN_LENGTH} caracteres.
            </p>
            {passwordError ? (
              <p id={`${passwordId}-error`} className="text-sm text-rose-600">
                {passwordError}
              </p>
            ) : null}
          </div>

          <div
            className={cn(
              'rounded-2xl border px-4 py-4',
              hasVisibleErrors
                ? 'border-amber-200 bg-amber-50'
                : 'border-slate-200 bg-slate-50',
            )}
          >
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-slate-900">
                Validación lista para backend
              </p>
              <p className="text-sm leading-6 text-slate-600">
                El formulario valida la información en el navegador y envía la
                solicitud real al endpoint de autenticación cuando las
                credenciales son correctas.
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-stretch gap-4 border-t border-slate-100 bg-slate-50/80">
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Validando...' : 'Ingresar al panel'}
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>Issue #007 · UI de login</span>
            <a
              href="#soporte"
              className="font-medium text-[#0f3042] transition-colors hover:text-[#f97316]"
            >
              Contactar soporte
            </a>
          </div>
        </CardFooter>
      </Card>
    </form>
  )
}

