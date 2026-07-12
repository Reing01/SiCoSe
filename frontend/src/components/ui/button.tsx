import type { ButtonHTMLAttributes, ForwardedRef } from 'react'
import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

type ButtonVariant =
  | 'default'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'destructive'

type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

const variantClasses: Record<ButtonVariant, string> = {
  default:
    'bg-[#0f3042] text-white shadow-lg shadow-[#0f3042]/15 hover:bg-[#143a50]',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
  ghost: 'hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white',
  outline: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-11 px-4 py-2',
  sm: 'h-11 rounded-md px-3',
  lg: 'h-12 rounded-xl px-6 text-base',
  icon: 'h-11 w-11',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

function ButtonComponent(
  {
    className,
    variant = 'default',
    size = 'default',
    type = 'button',
    ...props
  }: ButtonProps,
  ref: ForwardedRef<HTMLButtonElement>,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(ButtonComponent)
Button.displayName = 'Button'
