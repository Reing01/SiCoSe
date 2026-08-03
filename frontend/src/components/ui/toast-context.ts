import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'warning'

export type ToastInput = {
  tone: ToastTone
  title: string
  message?: string
}

export type ToastContextValue = {
  addToast: (toast: ToastInput) => void
}

export const ToastContext = createContext<ToastContextValue>({
  addToast: () => undefined,
})

export function useToast() {
  return useContext(ToastContext)
}
