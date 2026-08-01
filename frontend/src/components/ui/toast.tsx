import type { PropsWithChildren } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { ToastContext, type ToastInput, type ToastTone } from './toast-context'

type Toast = {
  id: number
  tone: ToastTone
  title: string
  message?: string
}

const MAX_VISIBLE_TOASTS = 3
const TOAST_DURATION_MS = 4000

const toneClasses: Record<ToastTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  error: 'border-red-200 bg-red-50 text-red-950',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
}

const toneLabels: Record<ToastTone, string> = {
  success: 'Exito',
  error: 'Error',
  warning: 'Atencion',
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback((toast: ToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)

    setToasts((current) =>
      [{ id, ...toast }, ...current].slice(0, MAX_VISIBLE_TOASTS),
    )

    window.setTimeout(() => {
      dismissToast(id)
    }, TOAST_DURATION_MS)
  }, [dismissToast])

  const value = useMemo(() => ({ addToast }), [addToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: number) => void
}) {
  return (
    <div
      aria-live="polite"
      aria-relevant="additions removals"
      className="fixed bottom-4 right-4 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:bottom-6 sm:right-6"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'rounded-xl border p-4 shadow-xl shadow-slate-900/10',
            toneClasses[toast.tone],
          )}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em]">
                {toneLabels[toast.tone]}
              </p>
              <p className="mt-1 text-sm font-semibold leading-5">
                {toast.title}
              </p>
              {toast.message ? (
                <p className="mt-1 text-sm leading-5 opacity-80">
                  {toast.message}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg leading-none opacity-70 transition hover:bg-black/5 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]/40"
              onClick={() => onDismiss(toast.id)}
              aria-label="Cerrar notificacion"
            >
              x
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
