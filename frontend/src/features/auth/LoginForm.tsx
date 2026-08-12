import type { ChangeEvent, FormEvent } from 'react'
import { useId, useMemo, useState } from 'react'
import BrandMark from '../../components/BrandMark'
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
import { LOGIN_COPY, getPublicLoginErrorMessage } from './auth.copy'
import type { LoginRequest } from './auth.types'
import { navigateTo } from '../../lib/navigation'
import { cn } from '../../lib/utils'
import { type LoginFieldName, validateLoginForm } from './login-form.validation'

type SubmissionState =
  | { kind: 'idle' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

export type LoginSubmissionResult = {
  message?: string
  redirectTo?: string
}

const DEFAULT_VALUES: LoginRequest = {
  email: '',
  password: '',
}

const DEFAULT_TOUCHED: Record<LoginFieldName, boolean> = {
  email: false,
  password: false,
}

const loginTags = [
  'Móvil y escritorio',
  'Modo claro/oscuro',
  'Comprobante PDF',
] as const

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
  const { addToast } = useToast()

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
        message: LOGIN_COPY.invalidFields,
      })
      addToast({
        tone: 'warning',
        title: LOGIN_COPY.incompleteTitle,
        message: LOGIN_COPY.invalidFieldsToast,
      })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await Promise.resolve(onSubmit?.(normalizedValues))

      setValues(normalizedValues)
      const successMessage =
        typeof result === 'object' &&
        result !== null &&
        typeof result.message === 'string' &&
        result.message.trim().length > 0
          ? result.message
          : LOGIN_COPY.success

      setSubmissionState({
        kind: 'success',
        message: successMessage,
      })
      addToast({
        tone: 'success',
        title: LOGIN_COPY.successTitle,
        message: successMessage,
      })

      if (result && typeof result === 'object' && 'redirectTo' in result) {
        const redirectTo = result.redirectTo

        if (typeof redirectTo === 'string' && redirectTo.trim()) {
          navigateTo(redirectTo, true)
        }
      }
    } catch {
      const errorMessage = getPublicLoginErrorMessage()

      setSubmissionState({
        kind: 'error',
        message: errorMessage,
      })
      addToast({
        tone: 'error',
        title: LOGIN_COPY.accessErrorTitle,
        message: errorMessage,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const statusTone =
    submissionState.kind === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : submissionState.kind === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-900'
        : 'border-sky-200 bg-sky-50 text-sky-900'

  return (
    <form onSubmit={handleSubmit} noValidate className={cn('w-full', className)}>
      <Card className="overflow-hidden border-white/10 bg-white/95 shadow-2xl shadow-black/20 dark:border-slate-800 dark:bg-slate-950/85">
        <CardHeader className="border-b border-slate-100 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-start gap-3">
            <BrandMark size="lg" />
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#f97316]">
                Acceso privado
              </p>
              <CardTitle className="text-2xl">Inicia sesión</CardTitle>
              <CardDescription className="max-w-md">
                Accede con tu correo institucional y la contraseña asignada
                para revisar los módulos protegidos del sistema.
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {loginTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-6">
          {submissionState.kind !== 'idle' ? (
            <div
              id={statusId}
              role={submissionState.kind === 'error' ? 'alert' : 'status'}
              aria-live="polite"
              className={cn(
                'rounded-2xl border px-4 py-3 text-sm leading-6',
                statusTone,
                submissionState.kind === 'success' &&
                  'dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-100',
                submissionState.kind === 'error' &&
                  'dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-100',
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
              placeholder="admin@sicose.test"
              value={values.email}
              onChange={handleFieldChange('email')}
              onBlur={handleFieldBlur('email')}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? `${emailId}-error` : emailHintId}
            />
            <p
              id={emailHintId}
              className="text-xs leading-5 text-slate-500 dark:text-slate-400"
            >
              Usa una cuenta autorizada para continuar.
            </p>
            {emailError ? (
              <p
                id={`${emailId}-error`}
                className="text-sm text-rose-600 dark:text-rose-300"
              >
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
                className="absolute right-1 top-1/2 h-11 -translate-y-1/2 rounded-lg px-3 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </Button>
            </div>
            <p
              id={passwordHintId}
              className="text-xs leading-5 text-slate-500 dark:text-slate-400"
            >
              Usa tu contraseña asignada.
            </p>
            {passwordError ? (
              <p
                id={`${passwordId}-error`}
                className="text-sm text-rose-600 dark:text-rose-300"
              >
                {passwordError}
              </p>
            ) : null}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-stretch gap-4 border-t border-slate-100 bg-slate-50/90 px-6 py-5 dark:border-slate-800 dark:bg-slate-950/60">
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? LOGIN_COPY.submitting : 'Ingresar al panel'}
          </Button>

          <div className="flex flex-col gap-3 text-xs text-slate-500 dark:text-slate-400">
            <p>
              Sesión protegida para operación interna. Si necesitas ayuda, usa
              el enlace de soporte.
            </p>

            <a
              href="#soporte"
              className="font-medium text-[#0f3042] transition-colors hover:text-[#f97316] dark:text-sky-300 dark:hover:text-orange-300"
            >
              Contactar soporte
            </a>
          </div>
        </CardFooter>
      </Card>
    </form>
  )
}
