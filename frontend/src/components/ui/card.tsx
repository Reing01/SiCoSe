import type { HTMLAttributes, PropsWithChildren } from 'react'
import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

type DivProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>
type HeadingProps = PropsWithChildren<HTMLAttributes<HTMLHeadingElement>>
type ParagraphProps = PropsWithChildren<HTMLAttributes<HTMLParagraphElement>>

export const Card = forwardRef<HTMLDivElement, DivProps>(function Card(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-3xl border border-slate-200 bg-white text-slate-950 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)]',
        className,
      )}
      {...props}
    />
  )
})
Card.displayName = 'Card'

export const CardHeader = forwardRef<HTMLDivElement, DivProps>(function CardHeader(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn('flex flex-col gap-2 px-6 pt-6 sm:px-8 sm:pt-8', className)}
      {...props}
    />
  )
})
CardHeader.displayName = 'CardHeader'

export const CardContent = forwardRef<HTMLDivElement, DivProps>(
  function CardContent({ className, ...props }, ref) {
    return (
      <div ref={ref} className={cn('px-6 py-6 sm:px-8', className)} {...props} />
    )
  },
)
CardContent.displayName = 'CardContent'

export const CardFooter = forwardRef<HTMLDivElement, DivProps>(function CardFooter(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn('px-6 pb-6 sm:px-8 sm:pb-8', className)}
      {...props}
    />
  )
})
CardFooter.displayName = 'CardFooter'

export const CardTitle = forwardRef<HTMLHeadingElement, HeadingProps>(
  function CardTitle({ className, ...props }, ref) {
    return (
      <h3
        ref={ref}
        className={cn(
          'text-2xl font-semibold leading-none tracking-tight text-slate-900',
          className,
        )}
        {...props}
      />
    )
  },
)
CardTitle.displayName = 'CardTitle'

export const CardDescription = forwardRef<HTMLParagraphElement, ParagraphProps>(
  function CardDescription({ className, ...props }, ref) {
    return (
      <p
        ref={ref}
        className={cn('text-sm leading-6 text-slate-600', className)}
        {...props}
      />
    )
  },
)
CardDescription.displayName = 'CardDescription'

