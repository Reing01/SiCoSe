import { cn } from '../lib/utils'

type BrandMarkProps = {
  className?: string
  imageClassName?: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES: Record<NonNullable<BrandMarkProps['size']>, string> = {
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
}

export default function BrandMark({
  className,
  imageClassName,
  size = 'md',
}: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5 shadow-lg',
        SIZE_CLASSES[size],
        className,
      )}
    >
      <img
        src="/brand-mark.png"
        alt=""
        className={cn('h-full w-full object-cover', imageClassName)}
      />
    </span>
  )
}
